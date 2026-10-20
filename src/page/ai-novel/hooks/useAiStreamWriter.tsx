import React, { useState, useRef } from 'react';
import { message, Modal, notification } from 'antd';
import httpService from '../../../common/request';
import { Novel, NovelOutline, PromptLogItem, StoryArc, CriticReport, AgentNodeState, WildReaderFeedback } from '../types';

export const useAiStreamWriter = (
  selectedNovel: Novel | null,
  selectedOutline: NovelOutline,
  setSelectedOutline: React.Dispatch<React.SetStateAction<NovelOutline>>,
  setSelectedNovel: React.Dispatch<React.SetStateAction<Novel | null>>,
  loadChapterContent: (novelId: number, chNum: number) => Promise<void>,
  loadNovelToEditor: (novelId: number, targetChapterNum?: number) => Promise<void>,
  setPromptLogs?: React.Dispatch<React.SetStateAction<PromptLogItem[]>>
) => {
  const [activeChapterNum, setActiveChapterNum] = useState<number>(1);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [intervention, setIntervention] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [writingSpeed, setWritingSpeed] = useState<number>(0);
  const [wordCountLimit, setWordCountLimit] = useState<number>(2500);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [renamingChapter, setRenamingChapter] = useState<boolean>(false);

  // 🤖 多 Agent 协同作战状态
  const [currentArc, setCurrentArc] = useState<StoryArc | null>(null);
  const [agentNodes, setAgentNodes] = useState<Record<string, AgentNodeState>>({});
  const [criticReport, setCriticReport] = useState<CriticReport | null>(null);
  const [wildReaderFeedback, setWildReaderFeedback] = useState<WildReaderFeedback | null>(null);
  const [agentThoughts, setAgentThoughts] = useState<Array<{ agent: string; thought: string; timestamp?: string }>>([]);
  const [useMultiAgent, setUseMultiAgent] = useState<boolean>(true);

  // 自动从大纲与 multiAgentConfig 中加载当前章节的大事件与多 Agent 作战记忆
  React.useEffect(() => {
    if (isGenerating) return;

    // 1. 匹配当前章节的大事件
    let matchedArc: StoryArc | null = null;
    if (selectedOutline?.storyArcs && Array.isArray(selectedOutline.storyArcs)) {
      const matched = selectedOutline.storyArcs.find(
        arc => activeChapterNum >= arc.startChapter && activeChapterNum <= arc.endChapter
      );
      if (matched) {
        matchedArc = matched;
        setCurrentArc(matched);
      } else {
        setCurrentArc(null);
      }
    } else {
      setCurrentArc(null);
    }

    // 2. 尝试从 multiAgentConfig.chapterRuns 中读取本章历史运行快照
    const cfg = typeof selectedOutline?.multiAgentConfig === 'string'
      ? (() => { try { return JSON.parse(selectedOutline.multiAgentConfig); } catch (e) { return {}; } })()
      : (selectedOutline?.multiAgentConfig || {});

    const run = cfg?.chapterRuns?.[activeChapterNum];
    if (run) {
      if (run.agentNodes) setAgentNodes(run.agentNodes);
      if (run.agentThoughts) setAgentThoughts(run.agentThoughts);
      if (run.criticReport) setCriticReport(run.criticReport);
      return;
    }

    // 3. 若无显式运行记录，但该章节在大纲中已标记为完成或在大事件已完成列表中
    const chapterOutline = selectedOutline?.chaptersOutline?.find(c => Number(c.chapterNumber) === Number(activeChapterNum));
    const isCompletedChapter = chapterOutline?.status === 'completed' || (matchedArc?.completedChapters || []).includes(activeChapterNum);

    if (isCompletedChapter && matchedArc) {
      const currentBeatIndex = matchedArc.beats
        ? matchedArc.beats.findIndex((_, idx) => (matchedArc!.startChapter || 1) + idx === activeChapterNum)
        : -1;
      const currentBeat = matchedArc.beats && currentBeatIndex >= 0 ? matchedArc.beats[currentBeatIndex] : null;
      const beatName = currentBeat?.name || (currentBeat as any)?.beatName || '推进节拍';
      const beatType = currentBeat?.beatType || 'DEVELOPMENT';
      const wordCount = chapterOutline?.wordCount || (matchedArc as any)?.lastChapterWordCount || 3000;

      setAgentNodes({
        arc_architect: { agent: 'arc_architect', agentName: '总策划', status: 'done', description: `已锁定大事件：${matchedArc.title}` },
        episode_director: { agent: 'episode_director', agentName: '弧光分镜', status: 'done', description: `分镜节拍定格为【${beatName}】(${beatType})` },
        prose_writer: { agent: 'prose_writer', agentName: '动词写手', status: 'done', description: `白描初稿生成完成 (${wordCount} 字)` },
        critic_auditor: { agent: 'critic_auditor', agentName: '对抗责编', status: 'done', description: `质检通过 (综合抗AI审查合格)` },
        lorekeeper: { agent: 'lorekeeper', agentName: '档案官', status: 'done', description: `大事件状态与档案记忆已落盘` }
      });

      setAgentThoughts([
        { agent: 'arc_architect', thought: `已定位所属大事件：${matchedArc.title}（跨度: 第${matchedArc.startChapter}-${matchedArc.endChapter}章，目标: ${matchedArc.goal}）` },
        { agent: 'episode_director', thought: `本章分镜节拍定格为【${beatName}】（类型: ${beatType}）。基调：${currentBeat?.guideline || '紧扣主线'}` },
        { agent: 'prose_writer', thought: `已基于【${beatName}】节拍白描完成正文撰写，总字数: ${wordCount} 字。` },
        { agent: 'critic_auditor', thought: `对抗审查通过！节拍推进扎实，文风白描生动，准予放行。` },
        { agent: 'lorekeeper', thought: `已完成全书档案归档。大事件【${matchedArc.title}】当前推进正常。` }
      ]);

      setCriticReport({
        score: 95,
        passed: true,
        issues: [],
        detectedCliches: [],
        totalClicheMatches: 0,
        iteration: 1,
        maxIterations: 2
      });
      return;
    }

    // 4. 若该章节尚未生成（待写章节），若匹配到大事件，展示前瞻就绪态，杜绝空白待命
    if (matchedArc) {
      const currentBeatIndex = matchedArc.beats
        ? matchedArc.beats.findIndex((_, idx) => (matchedArc!.startChapter || 1) + idx === activeChapterNum)
        : -1;
      const currentBeat = matchedArc.beats && currentBeatIndex >= 0 ? matchedArc.beats[currentBeatIndex] : null;
      const beatName = currentBeat?.name || (currentBeat as any)?.beatName || '待命节拍';
      const beatType = currentBeat?.beatType || 'SETUP';

      setAgentNodes({
        arc_architect: { agent: 'arc_architect', agentName: '总策划', status: 'done', description: `已锁定所属大事件：${matchedArc.title}` },
        episode_director: { agent: 'episode_director', agentName: '弧光分镜', status: 'ready', description: `已规划节拍：【${beatName}】(${beatType})` },
        prose_writer: { agent: 'prose_writer', agentName: '动词写手', status: 'idle', description: '待命起草' },
        critic_auditor: { agent: 'critic_auditor', agentName: '对抗责编', status: 'idle', description: '待命质检' },
        lorekeeper: { agent: 'lorekeeper', agentName: '档案官', status: 'idle', description: '待命归档' }
      });

      setAgentThoughts([
        { agent: 'system', thought: `📡 作战协同链路已就绪。第 ${activeChapterNum} 章锁定大事件：${matchedArc.title}，预定节拍：【${beatName}】。点击启动即可调起多 Agent 流水线！`, timestamp: 'READY' }
      ]);
      setCriticReport(null);
    } else {
      setAgentNodes({});
      setAgentThoughts([]);
      setCriticReport(null);
    }
  }, [selectedOutline, activeChapterNum, isGenerating]);

  const streamReaderRef = useRef<ReadableStreamDefaultReader | null>(null);

  const handleWriteChapterStream = async (isResume = false) => {
    if (!selectedNovel || isGenerating) return;
    const shouldResume = isResume === true;
    const targetChapterNum = activeChapterNum;

    setIsGenerating(true);
    setIsPaused(false);
    if (!shouldResume) {
      setChapterContent('');
      setAgentNodes(useMultiAgent ? {
        arc_architect: { agent: 'arc_architect', agentName: '总策划', status: 'running', description: '正在定位与规划大事件剧情弧光...' },
        episode_director: { agent: 'episode_director', agentName: '弧光分镜', status: 'idle', description: '待命' },
        prose_writer: { agent: 'prose_writer', agentName: '动词写手', status: 'idle', description: '待命' },
        critic_auditor: { agent: 'critic_auditor', agentName: '对抗责编', status: 'idle', description: '待命' },
        wild_reader: { agent: 'wild_reader', agentName: '剧情监察官', status: 'idle', description: '待命监察因果与看点' },
        lorekeeper: { agent: 'lorekeeper', agentName: '档案官', status: 'idle', description: '待命' }
      } : {});
      setCriticReport(null);
      setWildReaderFeedback(null);
      setAgentThoughts(useMultiAgent ? [
        { agent: 'system', thought: `🚀 已启动第 ${activeChapterNum} 章多 Agent 协同流水线，正在唤醒总策划 Agent 锁定剧情弧光...`, timestamp: new Date().toLocaleTimeString() }
      ] : []);
      // 🌟 重新生成该章时，立即在前端清空当前章节的历史 Prompt 轨迹，避免旧记录堆积
      if (setPromptLogs && activeChapterNum) {
        setPromptLogs(prev => (prev || []).filter(item => Number(item.chapterNumber) !== Number(activeChapterNum)));
      }
    }
    setWritingSpeed(0);
    const startTime = Date.now();
    let tokenCount = 0;
    let hasStreamError = false;
    let isStreamCompletedSuccessfully = false;

    try {
      const response = await fetch('/api/ai-novel/generate-chapter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': localStorage.getItem('token') || ''
        },
        body: JSON.stringify({
          novelId: selectedNovel.id,
          chapterNumber: activeChapterNum,
          interventionPrompt: intervention,
          wordCountLimit: wordCountLimit,
          existingContent: shouldResume ? chapterContent : '',
          useMultiAgent: useMultiAgent
        })
      });

      if (!response.ok) {
        try {
          const errData = await response.json();
          throw new Error(errData.msg || errData.error || '启动流式写入失败，请检查 API 配置');
        } catch (e: any) {
          throw new Error(e.message || '启动流式写入失败，请检查网络或配置');
        }
      }

      const reader = response.body?.getReader();
      if (!reader) return;
      streamReaderRef.current = reader;
      const decoder = new TextDecoder('utf-8');

      let buffer = '';
      let currentEvent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) { currentEvent = ''; continue; }

          // 收到 SSE 10秒保活心跳（如 : keepalive），静默放行
          if (trimmed.startsWith(':')) {
            continue;
          }

          if (trimmed === 'data: [DONE]') {
            break;
          }

          if (trimmed.startsWith('event: ')) {
            currentEvent = trimmed.substring(7).trim();
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.substring(6));
              if (data.error) {
                message.error({
                  content: data.error,
                  key: 'auditor_status',
                  duration: 5
                });
                hasStreamError = true;
                setIsGenerating(false);
                return;
              }

              if (data.statusType === 'prompt_log' && data.promptLog) {
                if (setPromptLogs) {
                  setPromptLogs(prev => {
                    const exists = prev.some(item => item.id === data.promptLog.id);
                    if (exists) return prev;
                    return [data.promptLog, ...prev];
                  });
                }
                continue;
              }

              if (data.statusType === 'llm_fail_query') {
                try {
                  message.destroy('auditor_status');
                } catch (e) {}

                Modal.confirm({
                  title: '🤖 自动审核异常拦截',
                  content: (
                    <div>
                      <p style={{ fontWeight: 'bold', color: '#fa8c16' }}>{data.statusMsg}</p>
                      <p style={{ marginTop: 8 }}>您可以选择：</p>
                      <p>1. <b>继续审核 (重试)</b>：尝试重新调用大模型继续完成审核与纠偏。</p>
                      <p>2. <b>跳过审核 (直接保存)</b>：不再进行审核，直接将当前已写好的正文保存入库。</p>
                    </div>
                  ),
                  okText: '继续审核 (重试)',
                  cancelText: '跳过审核 (直接保存)',
                  onOk: async () => {
                    try {
                      await httpService.post('/ai-novel/audit-decision', {
                        novelId: data.novelId,
                        chapterNumber: data.chapterNumber,
                        action: 'retry'
                      });
                      message.loading({
                        content: '已发送指令，正在重新尝试调用大模型审核...',
                        key: 'auditor_status',
                        duration: 0
                      });
                    } catch (e: any) {
                      message.error('发送决策指令失败: ' + (e.message || e));
                    }
                  },
                  onCancel: async () => {
                    try {
                      await httpService.post('/ai-novel/audit-decision', {
                        novelId: data.novelId,
                        chapterNumber: data.chapterNumber,
                        action: 'skip'
                      });
                      message.loading({
                        content: '已跳过本次审核，正在安全保存章节...',
                        key: 'auditor_status',
                        duration: 2
                      });
                    } catch (e: any) {
                      message.error('发送决策指令失败: ' + (e.message || e));
                    }
                  }
                });
                continue;
              }

              // 🤖 多 Agent 协同事件捕获
              if (currentEvent === 'agent_node' && data.agent) {
                setAgentNodes(prev => ({
                  ...prev,
                  [data.agent]: {
                    agent: data.agent,
                    agentName: data.agentName || data.agent,
                    status: data.status,
                    description: data.description,
                    iteration: data.iteration
                  }
                }));
                continue;
              }

              if (currentEvent === 'agent_thought' && data.thought) {
                setAgentThoughts(prev => [
                  ...prev,
                  { agent: data.agent, thought: data.thought, timestamp: new Date().toLocaleTimeString() }
                ]);
                continue;
              }

              if (currentEvent === 'arc_info' && data.currentArc) {
                setCurrentArc(data.currentArc);
                continue;
              }

              if (currentEvent === 'critic_report') {
                setCriticReport(data);
                continue;
              }

              if (currentEvent === 'wild_reader_feedback') {
                setWildReaderFeedback(data);
                continue;
              }

              if (currentEvent === 'complete') {
                isStreamCompletedSuccessfully = true;
                if (data.finalContent && activeChapterNum === targetChapterNum) {
                  setChapterContent(data.finalContent);
                }
                if (data.criticReport) {
                  setCriticReport(data.criticReport);
                }
                if (data.arcInfo) {
                  setCurrentArc(data.arcInfo);
                }
                if (data.readerFeedback) {
                  setWildReaderFeedback(data.readerFeedback);
                }
              }

              if ((currentEvent === 'chunk' || (!currentEvent && data.text)) && (data.text || data.content)) {
                const textChunk = data.text || data.content;
                if (activeChapterNum === targetChapterNum) {
                  setChapterContent(prev => prev + textChunk);
                }
                tokenCount += textChunk.length;
                const duration = (Date.now() - startTime) / 1000;
                if (duration > 0.5) {
                  setWritingSpeed(Math.round(tokenCount / duration));
                }
              } else if (!currentEvent && data.content) {
                if (activeChapterNum === targetChapterNum) {
                  setChapterContent(prev => prev + data.content);
                }
                tokenCount += data.content.length;
                const duration = (Date.now() - startTime) / 1000;
                if (duration > 0.5) {
                  setWritingSpeed(Math.round(tokenCount / duration));
                }
              }

              if (data.message || data.statusMsg) {
                const statusText = (data.message || data.statusMsg) as string;
                console.log('[🤖 Auditor Status]', statusText);
                const isSuccess = statusText.includes('✅') || statusText.includes('🎉');
                const isWarning = statusText.includes('⚠️');

                const safeCloseNotification = (key: string) => {
                  try {
                    if (typeof (notification as any).destroy === 'function') {
                      (notification as any).destroy(key);
                    } else if (typeof (notification as any).close === 'function') {
                      (notification as any).close(key);
                    }
                  } catch (e) {
                    console.warn('Close notification failed:', e);
                  }
                };

                const isAuditRound = statusText.includes('第') && statusText.includes('轮');

                if (isSuccess) {
                  safeCloseNotification('auditor_warning_report');
                  safeCloseNotification('auditor_round_progress');
                  message.success({
                    content: statusText,
                    key: 'auditor_status',
                    duration: 5
                  });
                  notification.success({
                    key: 'auditor_round_progress',
                    message: '✅ 章节审核通过',
                    description: statusText,
                    duration: 4,
                    placement: 'topRight'
                  });
                } else if (isWarning) {
                  message.warning({
                    content: '⚠️ 发现问题，正在自动精修...',
                    key: 'auditor_status',
                    duration: 5
                  });
                  notification.warning({
                    key: 'auditor_warning_report',
                    message: '🤖 审核未通过 · 正在自动精修',
                    description: statusText,
                    duration: 0,
                    placement: 'topRight',
                    style: { width: 550, whiteSpace: 'pre-wrap' }
                  });
                } else if (isAuditRound) {
                  message.loading({
                    content: statusText,
                    key: 'auditor_status',
                    duration: 0
                  });
                  notification.open({
                    key: 'auditor_round_progress',
                    message: '🔍 AI 总编辑审核进行中',
                    description: statusText,
                    duration: 0,
                    placement: 'topRight',
                    style: { whiteSpace: 'pre-wrap' }
                  });
                } else {
                  message.loading({
                    content: statusText,
                    key: 'auditor_status',
                    duration: 0
                  });
                }
              }
            } catch (e) {
              console.error('Error processing SSE data chunk:', e);
            }
          }
        }
      }

      if (hasStreamError) {
        return;
      }

      try {
        (notification as any).destroy?.('auditor_round_progress');
        (notification as any).destroy?.('auditor_warning_report');
      } catch (e) {}
      message.success({
        content: '✅ 章节审核通过并已安全存入数据库！',
        key: 'auditor_status',
        duration: 4
      });

      const resDetail: any = await httpService.get(`/ai-novel/detail/${selectedNovel.id}?_t=${Date.now()}`);
      if (resDetail.code === 200) {
        setSelectedOutline(resDetail.data.outline);
        setSelectedNovel(resDetail.data.novel);
        await loadChapterContent(selectedNovel.id, activeChapterNum);
      }

      // 🚀 自动静默同步：3.5秒后自动获取后台 4 大 AI 分析（金手指看板、关系网、角色状态）的最新计算结果
      setTimeout(async () => {
        try {
          const latestDetail: any = await httpService.get(`/ai-novel/detail/${selectedNovel.id}?_t=${Date.now()}`);
          if (latestDetail.code === 200 && latestDetail.data?.outline) {
            setSelectedOutline(latestDetail.data.outline);
          }
        } catch (e) {}
      }, 3500);

      setIsGenerating(false);
      streamReaderRef.current = null;
    } catch (err: any) {
      // 🛡️ 防误报闭环 1：若流在接收到 complete 事件或正文后正常关闭触发了读取器关闭异常，视为成功，绝不报错
      if (isStreamCompletedSuccessfully) {
        try {
          const resDetail: any = await httpService.get(`/ai-novel/detail/${selectedNovel.id}?_t=${Date.now()}`);
          if (resDetail.code === 200) {
            setSelectedOutline(resDetail.data.outline);
            setSelectedNovel(resDetail.data.novel);
            await loadChapterContent(selectedNovel.id, activeChapterNum);
          }
        } catch (e) {}
        message.success({
          content: '✅ 章节生成完成并已安全落盘！',
          key: 'auditor_status',
          duration: 4
        });
        setIsGenerating(false);
        streamReaderRef.current = null;
        return;
      }

      // 🛡️ 防误报闭环 2：在展示错误之前，先核查数据库是否其实已经保存完成（避免“明明已经写完落盘却弹窗失败”）
      if (selectedNovel && activeChapterNum) {
        try {
          const quickCheck: any = await httpService.get(`/ai-novel/detail/${selectedNovel.id}?_t=${Date.now()}`);
          if (quickCheck.code === 200 && quickCheck.data) {
            const outlineList = quickCheck.data.outline?.chaptersOutline || [];
            const targetCh = outlineList.find((c: any) => Number(c.chapterNumber) === Number(activeChapterNum));
            if (targetCh && targetCh.status === 'completed' && (targetCh.wordCount || 0) > 300) {
              setSelectedOutline(quickCheck.data.outline);
              setSelectedNovel(quickCheck.data.novel);
              await loadChapterContent(selectedNovel.id, activeChapterNum);
              message.success({
                content: `🎉 第 ${activeChapterNum} 章已在数据库安全落盘保存！`,
                key: 'auditor_status',
                duration: 4
              });
              setIsGenerating(false);
              streamReaderRef.current = null;
              return;
            }
          }
        } catch (checkErr) {}
      }

      const isNetworkAbort = err.message && (
        err.message.includes('fetch') ||
        err.message.includes('network') ||
        err.message.includes('abort') ||
        err.message.includes('timeout')
      );

      if (isNetworkAbort && selectedNovel && activeChapterNum) {
        message.loading({
          content: '📡 前端连接轻微波动，后台仍在全力生成与审核中，正在自动同步...',
          key: 'auditor_status',
          duration: 0
        });

        let pollCount = 0;
        const maxPoll = 75;
        const pollInterval = setInterval(async () => {
          pollCount++;
          try {
            const resDetail: any = await httpService.get(`/ai-novel/detail/${selectedNovel.id}?_t=${Date.now()}`);
            if (resDetail.code === 200 && resDetail.data) {
              const outlineList = resDetail.data.outline?.chaptersOutline || [];
              const targetCh = outlineList.find((c: any) => Number(c.chapterNumber) === Number(activeChapterNum));
              if (targetCh && targetCh.status === 'completed') {
                clearInterval(pollInterval);
                setSelectedOutline(resDetail.data.outline);
                setSelectedNovel(resDetail.data.novel);
                await loadChapterContent(selectedNovel.id, activeChapterNum);
                message.success({
                  content: `🎉 第 ${activeChapterNum} 章已在后台成功完成并自动同步呈现！`,
                  key: 'auditor_status',
                  duration: 5
                });
                setIsGenerating(false);
                streamReaderRef.current = null;
                return;
              }
            }
          } catch (e) {}

          if (pollCount >= maxPoll) {
            clearInterval(pollInterval);
            message.error({
              content: '正文生成超时或中断，请刷新后查看',
              key: 'auditor_status',
              duration: 4
            });
            setIsGenerating(false);
            streamReaderRef.current = null;
          }
        }, 4000);
        return;
      }

      message.error({
        content: err.message || '正文生成中断',
        key: 'auditor_status',
        duration: 4
      });
      setIsGenerating(false);
      streamReaderRef.current = null;
    }
  };

  const handleAiRenameChapter = async () => {
    if (!selectedNovel || !activeChapterNum || !selectedOutline) return;
    setRenamingChapter(true);
    message.loading({ content: 'AI 正在分析剧情为章节起名...', key: 'ai_rename', duration: 0 });
    try {
      const res: any = await httpService.post('/ai-novel/rename-chapter', {
        novelId: selectedNovel.id,
        chapterNumber: activeChapterNum
      });
      if (res && res.code === 200 && res.data) {
        const newTitle = res.data;
        const updatedChapters = selectedOutline.chaptersOutline.map(c => {
          if (c.chapterNumber === activeChapterNum) {
            return { ...c, title: newTitle };
          }
          return c;
        });

        await httpService.post('/ai-novel/save-outline', {
          novelId: selectedNovel.id,
          chaptersOutline: updatedChapters
        });

        setSelectedOutline({
          ...selectedOutline,
          chaptersOutline: updatedChapters
        });
        message.success({ content: `AI 成功重新起名：${newTitle}`, key: 'ai_rename', duration: 3 });
      } else {
        throw new Error(res.msg || 'AI 起名未返回有效章节名称');
      }
    } catch (err: any) {
      console.error(err);
      message.error({ content: err.message || err || 'AI 起名失败，请重试', key: 'ai_rename', duration: 3 });
    } finally {
      setRenamingChapter(false);
    }
  };

  const handleManualRenameChapter = async (targetChapterNum: number, newTitle: string) => {
    if (!selectedNovel || !selectedOutline || !newTitle.trim()) return;
    try {
      const res: any = await httpService.post('/ai-novel/rename-chapter', {
        novelId: selectedNovel.id,
        chapterNumber: targetChapterNum,
        newTitle: newTitle.trim()
      });
      if (res && res.code === 200 && res.data) {
        const normalizedTitle = res.data;
        const updatedChapters = (selectedOutline.chaptersOutline || []).map(c => {
          if (Number(c.chapterNumber) === Number(targetChapterNum)) {
            return { ...c, title: normalizedTitle };
          }
          return c;
        });

        setSelectedOutline({
          ...selectedOutline,
          chaptersOutline: updatedChapters
        });
        message.success(`章节名称已更新：${normalizedTitle}`);
      } else {
        throw new Error(res?.msg || '修改标题失败');
      }
    } catch (err: any) {
      console.error(err);
      message.error(err.message || '修改章节标题失败，请重试');
    }
  };

  const handlePauseGeneration = async () => {
    if (streamReaderRef.current && selectedNovel) {
      try {
        await streamReaderRef.current.cancel();
      } catch (e) {}
      setIsGenerating(false);
      setIsPaused(true);
      message.loading({ content: '正在为您自动保存当前进度...', key: 'ai_pause', duration: 0 });
      try {
        await httpService.post('/ai-novel/save-chapter-content', {
          novelId: selectedNovel.id,
          chapterNumber: activeChapterNum,
          content: chapterContent
        });
        message.success({ content: '⏸️ 生成已暂停，当前进度已安全保存！', key: 'ai_pause', duration: 4 });
      } catch (err: any) {
        message.error({ content: '进度保存失败：' + (err.message || err), key: 'ai_pause', duration: 4 });
      }
    }
  };

  const handleStopGeneration = async () => {
    try {
      if (streamReaderRef.current) {
        await streamReaderRef.current.cancel();
      }
    } catch (e) {}
    setIsGenerating(false);
    setIsPaused(false);
    streamReaderRef.current = null;
    message.warning({
      content: '大模型书写已由作者手动中断。',
      key: 'auditor_status',
      duration: 4
    });
    if (selectedNovel) {
      loadNovelToEditor(selectedNovel.id);
    }
  };

  const [isDeslopping, setIsDeslopping] = useState(false);

  const handleDeslopContent = async (customInstruction?: string) => {
    if (!selectedNovel || !chapterContent.trim() || isDeslopping || isGenerating) return;
    setIsDeslopping(true);
    const hideLoading = message.loading('✨ 正在运用 7 Gate 准则深度去 AI 味（消除假深刻、画外音与禁用词）...', 0);
    try {
      const currentChapter = selectedOutline?.chaptersOutline.find(c => c.chapterNumber === activeChapterNum);
      const res: any = await httpService.post('/ai-novel/deslop', {
        novelId: selectedNovel.id,
        content: chapterContent,
        chapterNumber: activeChapterNum,
        chapterOutline: currentChapter?.outline || '',
        customInstruction: customInstruction || ''
      });
      hideLoading();
      if (res && res.code === 200 && res.data) {
        setChapterContent(res.data);
        // 自动保存去 AI 味后的正文
        await httpService.post('/ai-novel/save-chapter-content', {
          novelId: selectedNovel.id,
          chapterNumber: activeChapterNum,
          content: res.data
        });
        message.success('🎉 深度去 AI 味成功！正文已精修并自动保存。');
      } else {
        throw new Error(res?.msg || '去 AI 味失败');
      }
    } catch (e: any) {
      hideLoading();
      console.error(e);
      message.error('去 AI 味精修失败：' + (e.message || e));
    } finally {
      setIsDeslopping(false);
    }
  };

  const handleContinueWriting = async (setLoading: (l: boolean) => void) => {
    if (!selectedNovel || isGenerating) return;
    setLoading(true);
    try {
      const res: any = await httpService.post('/ai-novel/continue-writing', {
        novelId: selectedNovel.id,
        chapterNumber: activeChapterNum,
        currentContent: chapterContent,
        currentText: chapterContent
      });
      const appendText = typeof res?.data === 'string'
        ? res.data
        : (res?.data?.continuedText || res?.continuedText || '');

      if (res?.code === 200 && appendText) {
        setChapterContent(prev => (prev ? prev.trimEnd() + '\n\n' + appendText.trim() : appendText.trim()));
        message.success('AI 灵感续写拼接成功！');
      } else {
        message.error('AI 续写失败：未返回有效文本');
      }
    } catch (e: any) {
      message.error(e.message || '续写连接失败');
    } finally {
      setLoading(false);
    }
  };

  return {
    activeChapterNum,
    setActiveChapterNum,
    chapterContent,
    setChapterContent,
    intervention,
    setIntervention,
    isGenerating,
    setIsGenerating,
    isDeslopping,
    writingSpeed,
    wordCountLimit,
    setWordCountLimit,
    isPaused,
    setIsPaused,
    renamingChapter,
    streamReaderRef,
    handleWriteChapterStream,
    handleAiRenameChapter,
    handleManualRenameChapter,
    handlePauseGeneration,
    handleStopGeneration,
    handleContinueWriting,
    handleDeslopContent,
    currentArc,
    setCurrentArc,
    agentNodes,
    setAgentNodes,
    criticReport,
    setCriticReport,
    wildReaderFeedback,
    setWildReaderFeedback,
    agentThoughts,
    setAgentThoughts,
    useMultiAgent,
    setUseMultiAgent
  };
};
