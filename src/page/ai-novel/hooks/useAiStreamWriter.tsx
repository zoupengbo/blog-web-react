import React, { useState, useRef } from 'react';
import { message, Modal, notification } from 'antd';
import httpService from '../../../common/request';
import { Novel, NovelOutline } from '../types';

export const useAiStreamWriter = (
  selectedNovel: Novel | null,
  selectedOutline: NovelOutline,
  setSelectedOutline: React.Dispatch<React.SetStateAction<NovelOutline>>,
  setSelectedNovel: React.Dispatch<React.SetStateAction<Novel | null>>,
  loadChapterContent: (novelId: number, chNum: number) => Promise<void>,
  loadNovelToEditor: (novelId: number, targetChapterNum?: number) => Promise<void>
) => {
  const [activeChapterNum, setActiveChapterNum] = useState<number>(1);
  const [chapterContent, setChapterContent] = useState<string>('');
  const [intervention, setIntervention] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [writingSpeed, setWritingSpeed] = useState<number>(0);
  const [wordCountLimit, setWordCountLimit] = useState<number>(2500);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [renamingChapter, setRenamingChapter] = useState<boolean>(false);

  const streamReaderRef = useRef<ReadableStreamDefaultReader | null>(null);

  const handleWriteChapterStream = async (isResume = false) => {
    if (!selectedNovel || isGenerating) return;
    const shouldResume = isResume === true;

    setIsGenerating(true);
    setIsPaused(false);
    if (!shouldResume) {
      setChapterContent('');
    }
    setWritingSpeed(0);
    const startTime = Date.now();
    let tokenCount = 0;
    let hasStreamError = false;

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
          existingContent: shouldResume ? chapterContent : ''
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

              if ((currentEvent === 'chunk' || (!currentEvent && data.text)) && (data.text || data.content)) {
                const textChunk = data.text || data.content;
                setChapterContent(prev => prev + textChunk);
                tokenCount += textChunk.length;
                const duration = (Date.now() - startTime) / 1000;
                if (duration > 0.5) {
                  setWritingSpeed(Math.round(tokenCount / duration));
                }
              } else if (!currentEvent && data.content) {
                setChapterContent(prev => prev + data.content);
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
    } catch (err: any) {
      message.error({
        content: err.message || '正文生成中断',
        key: 'auditor_status',
        duration: 4
      });
    } finally {
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
    if (streamReaderRef.current) {
      await streamReaderRef.current.cancel();
      setIsGenerating(false);
      setIsPaused(false);
      message.warning({
        content: '大模型书写已由作者手动中断。',
        key: 'auditor_status',
        duration: 4
      });
      if (selectedNovel) {
        loadNovelToEditor(selectedNovel.id);
      }
    }
  };

  const handleContinueWriting = async (setLoading: (l: boolean) => void) => {
    if (!selectedNovel || isGenerating) return;
    setLoading(true);
    try {
      const res: any = await httpService.post('/ai-novel/continue-writing', {
        novelId: selectedNovel.id,
        currentText: chapterContent
      });
      if (res.code === 200 && res.data) {
        setChapterContent(prev => prev + '\n' + res.data);
        message.success('AI 灵感续写拼接成功！');
      } else {
        message.error('AI 续写失败');
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
    writingSpeed,
    wordCountLimit,
    setWordCountLimit,
    isPaused,
    setIsPaused,
    renamingChapter,
    streamReaderRef,
    handleWriteChapterStream,
    handleAiRenameChapter,
    handlePauseGeneration,
    handleStopGeneration,
    handleContinueWriting,
  };
};
