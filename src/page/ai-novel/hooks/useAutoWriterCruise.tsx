import React, { useState, useRef, useEffect } from 'react';
import { message, notification, Modal } from 'antd';
import httpService from '../../../common/request';
import { Novel, NovelOutline, ChapterOutline, PromptLogItem, StoryArc, CriticReport, AgentNodeState } from '../types';

export interface CruiseStartParams {
  startChapterNum: number;
  targetCount: number;
  wordCountLimit: number;
  useMultiAgent?: boolean;
  authorGuidance?: string;
  isRewriteMode?: boolean;
  lockOutline?: boolean;
}

export interface CruiseMultiAgentStateHandlers {
  setAgentNodes?: React.Dispatch<React.SetStateAction<Record<string, AgentNodeState>>>;
  setAgentThoughts?: React.Dispatch<React.SetStateAction<Array<{ agent: string; thought: string; timestamp?: string }>>>;
  setCurrentArc?: React.Dispatch<React.SetStateAction<StoryArc | null>>;
  setCriticReport?: React.Dispatch<React.SetStateAction<CriticReport | null>>;
}

export const useAutoWriterCruise = (
  selectedNovel: Novel | null,
  selectedOutline: NovelOutline,
  setSelectedOutline: React.Dispatch<React.SetStateAction<NovelOutline>>,
  setSelectedNovel: React.Dispatch<React.SetStateAction<Novel | null>>,
  activeChapterNum: number,
  setActiveChapterNum: (num: number) => void,
  loadChapterContent: (novelId: number, chNum: number) => Promise<void>,
  setChapterContent: React.Dispatch<React.SetStateAction<string>>,
  wordCountLimit: number,
  setWordCountLimit: (val: number) => void,
  setPromptLogs?: React.Dispatch<React.SetStateAction<PromptLogItem[]>>,
  multiAgentState?: CruiseMultiAgentStateHandlers
) => {
  const [isCruising, setIsCruising] = useState<boolean>(false);
  const [cruiseModalOpen, setCruiseModalOpen] = useState<boolean>(false);
  const [cruiseTargetCount, setCruiseTargetCount] = useState<number>(3);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [currentCruisingChapter, setCurrentCruisingChapter] = useState<number>(activeChapterNum || 1);
  const [cruiseStatusText, setCruiseStatusText] = useState<string>('');
  const [writingSpeed, setWritingSpeed] = useState<number>(0);
  const [useMultiAgent, setUseMultiAgent] = useState<boolean>(true);
  const [lastInterruptedSession, setLastInterruptedSession] = useState<{
    chapterNum: number;
    remainingCount: number;
    limit: number;
    useMultiAgent: boolean;
    reason: string;
  } | null>(null);

  const isStoppingRef = useRef<boolean>(false);
  const activeReaderRef = useRef<ReadableStreamDefaultReader | null>(null);
  const latestOutlineRef = useRef<NovelOutline>(selectedOutline);

  // 实时追踪当前编辑区查看的章节，杜绝闭包失效导致的跨章串流污染
  const activeChapterNumRef = useRef<number>(activeChapterNum);
  useEffect(() => {
    activeChapterNumRef.current = activeChapterNum;
  }, [activeChapterNum]);

  // 巡航章节实时文本缓冲池（按章节号隔离存储），确保后台流式生成不丢失，且切回生成章时平滑恢复实况
  const cruisingBuffersRef = useRef<Record<number, string>>({});
  const authorGuidanceRef = useRef<string>('');

  useEffect(() => {
    latestOutlineRef.current = selectedOutline;
  }, [selectedOutline]);

  const openCruiseModal = () => {
    if (isCruising) {
      message.info('全自动连写巡航正在运行中');
      return;
    }
    setCruiseModalOpen(true);
  };

  const closeCruiseModal = () => {
    if (!isCruising) {
      setCruiseModalOpen(false);
    }
  };

  // 毫秒级急停
  const emergencyStop = () => {
    isStoppingRef.current = true;
    if (activeReaderRef.current) {
      try {
        activeReaderRef.current.cancel();
      } catch (e) {
        console.warn('Reader cancel failed:', e);
      }
      activeReaderRef.current = null;
    }
    setIsCruising(false);
    setCruiseStatusText('🛑 连写巡航已紧急停止');
    message.warning({
      content: '🛑 紧急停止已生效，全自动连写巡航已安全中止！',
      key: 'cruise_status',
      duration: 4
    });
  };

  const executeSingleChapter = async (
    chNum: number,
    limit: number,
    isCurrentChRewrite: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    if (!selectedNovel) return { success: false, error: '小说不存在' };

    const preChList = (latestOutlineRef.current?.chaptersOutline || []) as ChapterOutline[];
    const preChItem = findOutlineByNumber(preChList, chNum);
    const wasAlreadyCompleted = Boolean(
      isCurrentChRewrite || (preChItem && (preChItem.status === 'completed' || (preChItem.wordCount && preChItem.wordCount > 0)))
    );

    cruisingBuffersRef.current[chNum] = '';
    // 跨章隔离守卫：仅当用户前台当前正在查看该巡航章节时，才清空编辑区
    if (activeChapterNumRef.current === chNum) {
      setChapterContent('');
    }
    setWritingSpeed(0);
    const startTime = Date.now();
    let tokenCount = 0;
    let isCompleted = false;

    // 初始化 5 大 Agent 状态，实时反馈给协同控制台
    if (multiAgentState?.setCriticReport) {
      multiAgentState.setCriticReport(null);
    }
    if (multiAgentState?.setAgentNodes) {
      multiAgentState.setAgentNodes({
        arc_architect: { agent: 'arc_architect', agentName: '总策划', status: 'running', description: `正在定位与规划第 ${chNum} 章所属大事件剧情弧光...` },
        episode_director: { agent: 'episode_director', agentName: '弧光分镜', status: 'idle', description: '待命' },
        prose_writer: { agent: 'prose_writer', agentName: '动词写手', status: 'idle', description: '待命' },
        critic_auditor: { agent: 'critic_auditor', agentName: '对抗责编', status: 'idle', description: '待命' },
        lorekeeper: { agent: 'lorekeeper', agentName: '档案官', status: 'idle', description: '待命' }
      });
    }
    if (multiAgentState?.setAgentThoughts) {
      multiAgentState.setAgentThoughts([
        { agent: 'system', thought: `🚀 正在调起第 ${chNum} 章多 Agent 协同流水线${wasAlreadyCompleted ? '（重写保护·大纲锁定）' : ''}，总策划 Agent 正在分析剧情弧光...`, timestamp: new Date().toLocaleTimeString() }
      ]);
    }

    // 🌟 巡航生成该章节时，先清空前端该章节的历史 Prompt 轨迹
    if (setPromptLogs && chNum) {
      setPromptLogs(prev => (prev || []).filter(item => Number(item.chapterNumber) !== Number(chNum)));
    }

    try {
      const response = await fetch('/api/ai-novel/generate-chapter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') || ''
        },
        body: JSON.stringify({
          novelId: selectedNovel.id,
          chapterNumber: chNum,
          wordCountLimit: limit,
          enableAuditor: true,
          isAutoCruise: true,
          isRewriteMode: wasAlreadyCompleted,
          lockOutline: true, // 全自动巡航严格锁定既有细纲为只读，绝不篡改大纲
          useMultiAgent: useMultiAgent,
          userIntervention: authorGuidanceRef.current || undefined
        })
      });

      if (!response.ok) {
        let errMsg = `第 ${chNum} 章启动生成失败 (HTTP ${response.status})`;
        try {
          const errJson = await response.json();
          errMsg = errJson.msg || errJson.error || errMsg;
        } catch (e) {}
        return { success: false, error: errMsg };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        return { success: false, error: '未获取到响应数据流' };
      }
      activeReaderRef.current = reader;

      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = '';
      let streamFailed = false;
      let failureReason = '';

      const processLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) {
          currentEvent = '';
          return;
        }

        // 收到 SSE 10秒保活心跳（如 : keepalive），静默放行
        if (trimmed.startsWith(':')) {
          return;
        }

        if (trimmed === 'data: [DONE]') {
          isCompleted = true;
          return;
        }

        if (trimmed.startsWith('event: ')) {
          currentEvent = trimmed.substring(7).trim();
          return;
        }

        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.substring(6));

            if (currentEvent === 'veto_blocked' || currentEvent === 'error' || data.error || (data.blocked && data.vetoReason)) {
              streamFailed = true;
              failureReason = data.vetoReason || data.error || data.message || '正文生成或审核未通过';
              setCruiseStatusText(`❌ 第 ${chNum} 章: ${failureReason}`);
              return;
            }

            // 🤖 多 Agent 协同事件实时分发
            if (currentEvent === 'agent_node' && data.agent && multiAgentState?.setAgentNodes) {
              multiAgentState.setAgentNodes(prev => ({
                ...prev,
                [data.agent]: {
                  agent: data.agent,
                  agentName: data.agentName || data.agent,
                  status: data.status,
                  description: data.description,
                  iteration: data.iteration
                }
              }));
              return;
            }

            if (currentEvent === 'agent_thought' && data.thought && multiAgentState?.setAgentThoughts) {
              multiAgentState.setAgentThoughts(prev => [
                ...prev,
                { agent: data.agent, thought: data.thought, timestamp: new Date().toLocaleTimeString() }
              ]);
              return;
            }

            if (currentEvent === 'arc_info' && data.currentArc && multiAgentState?.setCurrentArc) {
              multiAgentState.setCurrentArc(data.currentArc);
              return;
            }

            if (currentEvent === 'critic_report' && multiAgentState?.setCriticReport) {
              multiAgentState.setCriticReport(data);
              return;
            }

            if (currentEvent === 'complete') {
              isCompleted = true;
              if (data.finalContent) {
                cruisingBuffersRef.current[chNum] = data.finalContent;
                // 跨章隔离守卫：仅当用户前台当前正在查看该巡航章节时，才将完成内容赋给编辑区
                if (activeChapterNumRef.current === chNum) {
                  setChapterContent(data.finalContent);
                }
              }
              if (data.criticReport && multiAgentState?.setCriticReport) {
                multiAgentState.setCriticReport(data.criticReport);
              }
              if (data.arcInfo && multiAgentState?.setCurrentArc) {
                multiAgentState.setCurrentArc(data.arcInfo);
              }
              setCruiseStatusText(`🎉 第 ${chNum} 章撰写与审核已通过，正安全同步数据库...`);
              return;
            }

            if (data.statusType === 'prompt_log' && data.promptLog && setPromptLogs) {
              setPromptLogs(prev => {
                const exists = prev.some(item => item.id === data.promptLog.id);
                if (exists) return prev;
                return [data.promptLog, ...prev];
              });
              return;
            }

            if ((currentEvent === 'chunk' || (!currentEvent && data.text)) && (data.text || data.content)) {
              const textChunk = data.text || data.content;
              cruisingBuffersRef.current[chNum] = (cruisingBuffersRef.current[chNum] || '') + textChunk;
              // 跨章隔离守卫：仅当用户前台当前正在查看该巡航章节时，才向编辑区追加流式文字块！
              // 若用户正在查阅其他章节（如第 1 章），绝对不将巡航 chunk 注入编辑区！
              if (activeChapterNumRef.current === chNum) {
                setChapterContent(prev => prev + textChunk);
              }
              tokenCount += textChunk.length;
              const duration = (Date.now() - startTime) / 1000;
              if (duration > 0.5) {
                setWritingSpeed(Math.round(tokenCount / duration));
              }
            }

            if (data.message || data.statusMsg) {
              const sMsg = data.message || data.statusMsg;
              setCruiseStatusText(`[第 ${chNum} 章] ${sMsg}`);
            }
          } catch (e) {
            console.error('Error parsing SSE event in cruise hook:', e);
          }
        }
      };

      while (true) {
        if (isStoppingRef.current) {
          try {
            await reader.cancel();
          } catch (e) {}
          return { success: false, error: '用户手动急停' };
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          processLine(line);
          if (streamFailed) {
            return { success: false, error: failureReason };
          }
        }
      }

      // 处理末尾残留数据
      if (buffer.trim()) {
        processLine(buffer);
      }

      if (streamFailed) {
        return { success: false, error: failureReason };
      }

      // 无论流是否异常关闭，若已收到完成事件，直接判定成功
      if (isCompleted) {
        return { success: true };
      }

      // 终极兜底核验：仅对“全新开荒章节”做网络假掉线兜底；
      // 对于重写章节（wasAlreadyCompleted === true），历史旧稿字数不能算成功，坚决避免假完成跳章！
      if (!wasAlreadyCompleted) {
        try {
          const resDetail: any = await httpService.get(`/ai-novel/detail/${selectedNovel.id}?_t=${Date.now()}`);
          if (resDetail.code === 200 && resDetail.data) {
            const chList = resDetail.data.outline?.chaptersOutline || [];
            const ch = chList.find((c: any) => Number(c.chapterNumber) === Number(chNum));
            if (ch && (ch.status === 'completed' || (ch.wordCount && ch.wordCount > 100))) {
              return { success: true };
            }
          }
        } catch (e) {}
      }

      // 如果未收到完成事件且非全新开荒有效落盘，返回失败并附带具体错误，杜绝回退到假成功
      return { success: false, error: failureReason || '章节未通过质量门禁或流式异常中断' };
    } catch (err: any) {
      if (isStoppingRef.current) {
        return { success: false, error: '用户手动急停' };
      }

      // 若已完成，忽略后置网络断开异常
      if (isCompleted) {
        return { success: true };
      }

      // 异常时直查数据库：仅对全新开荒章节做轮询兜底，重写章节严禁凭借历史旧稿字数冒充成功
      if (selectedNovel && !wasAlreadyCompleted) {
        for (let i = 0; i < 50; i++) {
          await new Promise(r => setTimeout(r, 2000));
          if (isStoppingRef.current) return { success: false, error: '用户手动急停' };
          try {
            const resDetail: any = await httpService.get(`/ai-novel/detail/${selectedNovel.id}?_t=${Date.now()}`);
            if (resDetail.code === 200 && resDetail.data) {
              const chList = resDetail.data.outline?.chaptersOutline || [];
              const ch = chList.find((c: any) => Number(c.chapterNumber) === Number(chNum));
              if (ch && (ch.status === 'completed' || (ch.wordCount && ch.wordCount > 100))) {
                return { success: true };
              }
            }
          } catch (e) {}
        }
      }
      return { success: false, error: err.message || '网络或服务异常' };
    } finally {
      activeReaderRef.current = null;
    }
  };

  const findOutlineByNumber = (list: ChapterOutline[], targetNum: number): ChapterOutline | undefined => {
    for (let j = 0; j < list.length; j++) {
      if (parseInt(list[j].chapterNumber as any, 10) === targetNum) {
        return list[j];
      }
    }
    return undefined;
  };

  // 启动全自动巡航
  const startCruise = async (params: CruiseStartParams) => {
    if (!selectedNovel) {
      message.error('请先选择小说');
      return;
    }

    const { startChapterNum, targetCount, wordCountLimit: limit, useMultiAgent: multiAgentParam, authorGuidance } = params;
    authorGuidanceRef.current = (authorGuidance || '').trim();
    if (multiAgentParam !== undefined) {
      setUseMultiAgent(multiAgentParam);
    }
    if (targetCount <= 0) {
      message.warning('连写章数必须大于 0');
      return;
    }

    setCruiseModalOpen(false);
    setIsCruising(true);
    isStoppingRef.current = false;
    setCruiseTargetCount(targetCount);
    setCompletedCount(0);
    setWordCountLimit(limit);

    // 🚀 巡航启动瞬间立即初始化 Agent 状态与实况终端，杜绝空白待命
    if (multiAgentState?.setCriticReport) {
      multiAgentState.setCriticReport(null);
    }
    if (multiAgentState?.setAgentNodes) {
      multiAgentState.setAgentNodes({
        arc_architect: { agent: 'arc_architect', agentName: '总策划', status: 'running', description: `正在锁定第 ${startChapterNum} 章所属大事件与剧情弧光...` },
        episode_director: { agent: 'episode_director', agentName: '弧光分镜', status: 'idle', description: '待命' },
        prose_writer: { agent: 'prose_writer', agentName: '动词写手', status: 'idle', description: '待命' },
        critic_auditor: { agent: 'critic_auditor', agentName: '对抗责编', status: 'idle', description: '待命' },
        lorekeeper: { agent: 'lorekeeper', agentName: '档案官', status: 'idle', description: '待命' }
      });
    }
    if (multiAgentState?.setAgentThoughts) {
      multiAgentState.setAgentThoughts([
        { agent: 'system', thought: `🚀 全自动巡航流水线启动！连写目标: ${targetCount} 章，正在唤醒总策划 Agent...`, timestamp: new Date().toLocaleTimeString() }
      ]);
    }

    let currentCh = startChapterNum;

    try {
      for (let step = 0; step < targetCount; step++) {
        if (isStoppingRef.current) {
          break;
        }

        setCurrentCruisingChapter(currentCh);
        // 跨章隔离守卫：仅当用户前台依然处于跟随巡航状态（初始第0步，或者当前正停留在刚写完的上一章/本章）时，
        // 才自动推进前台 activeChapterNum 到新章节；若用户正在主动查阅其他章节（如第 1 章），则绝不强行跳转打断用户阅读！
        if (step === 0 || activeChapterNumRef.current === currentCh - 1 || activeChapterNumRef.current === currentCh) {
          setActiveChapterNum(currentCh);
        }

        // 1. 检查大纲列表中是否存在本章细纲
        let currentOutline = latestOutlineRef.current;
        let chList: ChapterOutline[] = (currentOutline?.chaptersOutline || []) as ChapterOutline[];
        let existingOutline = findOutlineByNumber(chList, currentCh);

        if (!existingOutline || !existingOutline.outline || existingOutline.outline === '暂无大纲') {
          // 细纲不足，首先尝试从后端拉取最新大纲详情（防止前端引用未同步）
          let refreshed = false;
          try {
            const detailRes: any = await httpService.get(`/ai-novel/detail/${selectedNovel.id}?_t=${Date.now()}`);
            if (detailRes.code === 200 && detailRes.data?.outline) {
              setSelectedOutline(detailRes.data.outline);
              latestOutlineRef.current = detailRes.data.outline;
              chList = detailRes.data.outline.chaptersOutline || [];
              existingOutline = findOutlineByNumber(chList, currentCh);
              if (existingOutline && existingOutline.outline && existingOutline.outline !== '暂无大纲') {
                refreshed = true;
              }
            }
          } catch (e) {}

          // 如果后端依然未规划该章细纲，自动触发批量细纲生成（带重试机制）
          if (!refreshed) {
            setCruiseStatusText(`第 ${currentCh} 章大纲未规划，正在全自动顺延生成后续章节细纲...`);
            const needCount = Math.max(3, targetCount - step);

            let success = false;
            let lastErrMsg = '';
            for (let retry = 0; retry < 2; retry++) {
              if (isStoppingRef.current) break;
              try {
                if (retry > 0) {
                  setCruiseStatusText(`生成大纲遇到网络波动，正在进行第 ${retry + 1}/2 次自动重试...`);
                  await new Promise(r => setTimeout(r, 2500));
                }
                const batchRes: any = await httpService.post('/ai-novel/batch-generate-chapters', {
                  novelId: selectedNovel.id,
                  chapterCount: needCount,
                  guidance: authorGuidanceRef.current || undefined,
                  userIntervention: authorGuidanceRef.current || undefined,
                  mode: 'append'
                });

                if (batchRes && batchRes.code === 200) {
                  const detailRes: any = await httpService.get(`/ai-novel/detail/${selectedNovel.id}?_t=${Date.now()}`);
                  if (detailRes.code === 200 && detailRes.data?.outline) {
                    setSelectedOutline(detailRes.data.outline);
                    latestOutlineRef.current = detailRes.data.outline;
                    chList = detailRes.data.outline.chaptersOutline || [];
                    existingOutline = findOutlineByNumber(chList, currentCh);
                    success = true;
                    break;
                  }
                } else {
                  lastErrMsg = batchRes?.msg || batchRes?.error || '自动补全章节细纲失败';
                }
              } catch (batchErr: any) {
                lastErrMsg = batchErr.message || '自动补全章节细纲失败';
              }
            }

            if (!success && !isStoppingRef.current) {
              const remaining = targetCount - step;
              setLastInterruptedSession({
                chapterNum: currentCh,
                remainingCount: remaining,
                limit,
                useMultiAgent: multiAgentParam !== undefined ? multiAgentParam : useMultiAgent,
                reason: lastErrMsg || '自动补全章节细纲失败'
              });

              // 严格质检断流，提供重试选项
              Modal.confirm({
                title: '🚨 全自动巡航细纲规划中断',
                width: 520,
                icon: null,
                okText: `🔄 重试生成细纲并继续巡航 (剩余 ${remaining} 章)`,
                cancelText: '暂缓停机',
                content: `在为第 ${currentCh} 章自动顺延补全细纲时失败: ${lastErrMsg}。已安全停机避免剧情脱轨。`,
                onOk: () => {
                  setTimeout(() => {
                    startCruise({
                      startChapterNum: currentCh,
                      targetCount: remaining,
                      wordCountLimit: limit,
                      useMultiAgent: multiAgentParam !== undefined ? multiAgentParam : useMultiAgent,
                      authorGuidance: authorGuidanceRef.current || undefined
                    });
                  }, 300);
                }
              });
              break;
            }
          }
        }

        if (isStoppingRef.current) break;

        const chItem = findOutlineByNumber(chList, currentCh);
        const isCurrentChRewrite = Boolean(
          params.isRewriteMode || (chItem && (chItem.status === 'completed' || (chItem.wordCount && chItem.wordCount > 0)))
        );

        // 2. 执行单章正文流式生成与审核
        setCruiseStatusText(`🚀 正在全自动${isCurrentChRewrite ? '重写' : '撰写'}第 ${currentCh} 章正文 [${step + 1}/${targetCount}]...`);
        const result = await executeSingleChapter(currentCh, limit, isCurrentChRewrite);

        if (!result.success) {
          if (isStoppingRef.current) {
            break;
          }

          // 终极复核：检查数据库中本章是否实际已经写入落盘，坚决杜绝“生成成功却显示失败”
          // 但若为历史重写章节，必须依赖本次生成的真实结果，严禁凭借历史旧稿字数做假完成跳章！
          let actuallyCompleted = false;
          if (!isCurrentChRewrite) {
            try {
              const checkRes: any = await httpService.get(`/ai-novel/detail/${selectedNovel.id}?_t=${Date.now()}`);
              if (checkRes.code === 200 && checkRes.data) {
                const updatedChList = checkRes.data.outline?.chaptersOutline || [];
                const ch = updatedChList.find((c: any) => Number(c.chapterNumber) === Number(currentCh));
                if (ch && (ch.status === 'completed' || (ch.wordCount && ch.wordCount > 100))) {
                  actuallyCompleted = true;
                  setSelectedOutline(checkRes.data.outline);
                  latestOutlineRef.current = checkRes.data.outline;
                }
              }
            } catch (e) {}
          }

          if (!actuallyCompleted) {
            const remaining = targetCount - step;
            setLastInterruptedSession({
              chapterNum: currentCh,
              remainingCount: remaining,
              limit,
              useMultiAgent: multiAgentParam !== undefined ? multiAgentParam : useMultiAgent,
              reason: result.error || '正文生成或审核未通过'
            });

            // 严格质检断流停机，并提供一键重试/继续后续巡航
            Modal.confirm({
              title: '🚨 全自动巡航遇阻 · 章节未通过',
              width: 520,
              icon: null,
              okText: `🔄 从第 ${currentCh} 章重试并继续巡航 (剩余 ${remaining} 章)`,
              cancelText: '暂缓并保留现场',
              okButtonProps: {
                style: {
                  background: 'linear-gradient(135deg, #1890ff, #722ed1)',
                  borderColor: '#722ed1',
                  fontWeight: 600
                }
              },
              content: React.createElement(
                'div',
                null,
                React.createElement('p', null, React.createElement('b', null, '中断位置：'), `第 ${currentCh} 章`),
                React.createElement(
                  'p',
                  null,
                  React.createElement('b', null, '失败原因：'),
                  React.createElement('span', { style: { color: '#ff4d4f' } }, result.error || '正文生成或审核未通过')
                ),
                React.createElement(
                  'p',
                  { style: { marginTop: 8, color: '#8c8c8c' } },
                  `已写好的草稿正文已安全保留在编辑区。点击下方按钮即可直接以第 ${currentCh} 章为起点继续执行剩余 ${remaining} 章全自动连写！`
                )
              ),
              onOk: () => {
                setTimeout(() => {
                  startCruise({
                    startChapterNum: currentCh,
                    targetCount: remaining,
                    wordCountLimit: limit,
                    useMultiAgent: multiAgentParam !== undefined ? multiAgentParam : useMultiAgent,
                    authorGuidance: authorGuidanceRef.current || undefined
                  });
                }, 300);
              }
            });
            break;
          }
        }

        // 3. 本章写入成功，刷新数据与界面
        setCompletedCount(prev => prev + 1);
        // 跨章隔离守卫：仅当用户前台当前正在查看该完成章节时，才从数据库重载回填编辑区；
        // 若用户正在查阅其他章节（如第 1 章），绝对不要强行覆盖破坏用户当前的查阅内容！
        if (activeChapterNumRef.current === currentCh) {
          await loadChapterContent(selectedNovel.id, currentCh);
        }

        const updatedDetail: any = await httpService.get(`/ai-novel/detail/${selectedNovel.id}?_t=${Date.now()}`);
        if (updatedDetail.code === 200 && updatedDetail.data?.outline) {
          setSelectedOutline(updatedDetail.data.outline);
          latestOutlineRef.current = updatedDetail.data.outline;
        }

        // 4. 判断是否还有后续章节需要连写
        if (step < targetCount - 1 && !isStoppingRef.current) {
          setCruiseStatusText(`✅ 第 ${currentCh} 章已安全入库！1.5 秒后自动推入第 ${currentCh + 1} 章...`);
          await new Promise(resolve => setTimeout(resolve, 1500));
          currentCh += 1;
        }
      }

      if (!isStoppingRef.current) {
        notification.success({
          message: '🎉 全自动连写巡航顺利完成！',
          description: `已成功无人值守连写并过审入库，当前章节已定位至最新完成章节。`,
          duration: 5
        });
      }
    } catch (globalErr: any) {
      console.error('Cruise loop error:', globalErr);
      message.error('全自动连写巡航发生异常: ' + (globalErr.message || globalErr));
    } finally {
      setIsCruising(false);
      isStoppingRef.current = false;
    }
  };

  return {
    isCruising,
    cruiseModalOpen,
    openCruiseModal,
    closeCruiseModal,
    cruiseTargetCount,
    completedCount,
    currentCruisingChapter,
    cruiseStatusText,
    writingSpeed,
    startCruise,
    emergencyStop,
    useMultiAgent,
    setUseMultiAgent,
    lastInterruptedSession,
    clearInterruptedSession: () => setLastInterruptedSession(null),
    getCruisingChapterBuffer: (chNum: number) => cruisingBuffersRef.current[chNum]
  };
};
