import { useState, useRef } from 'react';
import { message } from 'antd';
import httpService from '../../../common/request';
import { Novel, NovelOutline } from '../types';

export const useFanqiePublisher = (
  selectedNovel: Novel | null,
  selectedOutline: NovelOutline | null,
  activeChapterNum: number,
  loadNovelToEditor: (novelId: number, targetChapterNum?: number) => Promise<void>
) => {
  const [fanqieModalOpen, setFanqieModalOpen] = useState<boolean>(false);
  const [fanqieBookId, setFanqieBookId] = useState<string>('');
  const [fanqieBookName, setFanqieBookName] = useState<string>('');
  const [isPublishingToFanqie, setIsPublishingToFanqie] = useState<boolean>(false);
  const [selectedPublishChapters, setSelectedPublishChapters] = useState<number[]>([]);
  const [syncSelectMode, setSyncSelectMode] = useState<'manual' | 'range'>('manual');
  const [syncRangeStart, setSyncRangeStart] = useState<number | null>(null);
  const [syncRangeEnd, setSyncRangeEnd] = useState<number | null>(null);
  const publishPollRef = useRef<any>(null);

  const handleOpenFanqieModal = () => {
    if (!selectedOutline) return;
    const completedChapters = selectedOutline.chaptersOutline.filter(c => c.status === 'completed');
    const currentChapter = selectedOutline.chaptersOutline.find(c => c.chapterNumber === activeChapterNum);

    const firstCompleted = completedChapters[0];
    const lastCompleted = completedChapters[completedChapters.length - 1];

    if (currentChapter && currentChapter.status === 'completed') {
      setSelectedPublishChapters([activeChapterNum]);
      setSyncRangeStart(activeChapterNum);
      setSyncRangeEnd(activeChapterNum);
    } else {
      if (firstCompleted) {
        setSelectedPublishChapters([firstCompleted.chapterNumber]);
        setSyncRangeStart(firstCompleted.chapterNumber);
        setSyncRangeEnd(lastCompleted ? lastCompleted.chapterNumber : firstCompleted.chapterNumber);
      } else {
        setSelectedPublishChapters([]);
        setSyncRangeStart(null);
        setSyncRangeEnd(null);
      }
    }
    setSyncSelectMode('manual');
    setFanqieModalOpen(true);
  };

  const handleSelectAllUnsynced = () => {
    if (!selectedOutline) return;
    const unsyncedChapters = selectedOutline.chaptersOutline
      .filter(c => c.status === 'completed' && c.crawlStatus !== 'published');

    if (unsyncedChapters.length === 0) {
      message.info('当前所有已完成的章节均已同步番茄！');
      return;
    }

    if (syncSelectMode === 'manual') {
      setSelectedPublishChapters(unsyncedChapters.map(c => c.chapterNumber));
    } else {
      const minNum = Math.min(...unsyncedChapters.map(c => c.chapterNumber));
      const maxNum = Math.max(...unsyncedChapters.map(c => c.chapterNumber));
      setSyncRangeStart(minNum);
      setSyncRangeEnd(maxNum);
    }
    message.success(`已自动选择 ${unsyncedChapters.length} 个未同步章节！`);
  };

  const getSyncSummary = () => {
    if (!selectedOutline) return null;
    const completed = selectedOutline.chaptersOutline.filter(c => c.status === 'completed');
    if (syncSelectMode === 'manual') {
      const totalSelected = selectedPublishChapters.length;
      const unsyncedSelected = selectedOutline.chaptersOutline.filter(
        c => selectedPublishChapters.includes(c.chapterNumber) && c.crawlStatus !== 'published'
      ).length;
      return `已手动选择 ${totalSelected} 个章节，其中 ${unsyncedSelected} 个未同步。`;
    } else {
      if (syncRangeStart === null || syncRangeEnd === null) return '请输入同步章节范围。';
      const start = Math.min(syncRangeStart, syncRangeEnd);
      const end = Math.max(syncRangeStart, syncRangeEnd);
      const inRange = completed.filter(c => c.chapterNumber >= start && c.chapterNumber <= end);
      const unsyncedInRange = inRange.filter(c => c.crawlStatus !== 'published');
      return `指定范围第 ${start} - ${end} 章内共有 ${inRange.length} 个已完成章节，其中 ${unsyncedInRange.length} 个未同步。`;
    }
  };

  const handlePublishToFanqie = async () => {
    if (!selectedNovel || !selectedOutline) return;
    if (!fanqieBookName.trim()) {
      message.warning('请输入番茄作品名称！');
      return;
    }

    let chapterNumbersToSync: number[] = [];
    if (syncSelectMode === 'manual') {
      chapterNumbersToSync = selectedPublishChapters;
    } else {
      if (syncRangeStart === null || syncRangeEnd === null) {
        message.warning('请选择有效的范围！');
        return;
      }
      const start = Math.min(syncRangeStart, syncRangeEnd);
      const end = Math.max(syncRangeStart, syncRangeEnd);
      chapterNumbersToSync = selectedOutline.chaptersOutline
        .filter(c => c.chapterNumber >= start && c.chapterNumber <= end && c.status === 'completed')
        .map(c => c.chapterNumber);
    }

    if (!chapterNumbersToSync || chapterNumbersToSync.length === 0) {
      message.warning(syncSelectMode === 'manual' ? '请选择至少一个要同步的章节！' : '该范围内没有已完成创作的章节可供同步！');
      return;
    }

    setIsPublishingToFanqie(true);
    localStorage.setItem(`fanqie_book_id_${selectedNovel.id}`, fanqieBookId);
    localStorage.setItem(`fanqie_book_name_${selectedNovel.id}`, fanqieBookName);

    if (publishPollRef.current) {
      clearInterval(publishPollRef.current);
    }

    try {
      message.loading({ content: '正在启动番茄同步草稿箱程序，请注意查看弹出的浏览器窗口...', key: 'fanqie_pub', duration: 0 });
      const startRes: any = await httpService.post('/ai-novel/publish-to-fanqie', {
        novelId: selectedNovel.id,
        chapterNumbers: chapterNumbersToSync,
        fanqieBookId,
        fanqieBookName
      });

      if (startRes.code !== 200) {
        message.error({ content: startRes.msg || '启动同步草稿箱程序失败！', key: 'fanqie_pub', duration: 4 });
        setIsPublishingToFanqie(false);
        return;
      }

      const taskId = startRes.data?.taskId || `${selectedNovel.id}_${chapterNumbersToSync.join('_')}`;
      let pollCount = 0;

      publishPollRef.current = setInterval(async () => {
        pollCount++;
        // 超时保护（最大 60 次，约 90 秒）
        if (pollCount > 60) {
          if (publishPollRef.current) {
            clearInterval(publishPollRef.current);
            publishPollRef.current = null;
          }
          message.warning({ content: '同步任务执行时间较长，已自动为您刷新小说章节状态！', key: 'fanqie_pub', duration: 4 });
          setFanqieModalOpen(false);
          setIsPublishingToFanqie(false);
          loadNovelToEditor(selectedNovel.id);
          return;
        }

        try {
          const statusRes: any = await httpService.get(`/ai-novel/publish-status?taskId=${taskId}`);
          if (statusRes.code === 200 && statusRes.data) {
            const task = statusRes.data;
            if (task.status === 'success' || task.status === 'completed') {
              if (publishPollRef.current) {
                clearInterval(publishPollRef.current);
                publishPollRef.current = null;
              }
              message.success({ content: task.msg || '章节同步至番茄草稿箱成功！', key: 'fanqie_pub', duration: 5 });
              setFanqieModalOpen(false);
              setIsPublishingToFanqie(false);
              loadNovelToEditor(selectedNovel.id);
            } else if (task.status === 'failed') {
              if (publishPollRef.current) {
                clearInterval(publishPollRef.current);
                publishPollRef.current = null;
              }
              message.error({ content: task.msg || '同步至草稿箱失败！', key: 'fanqie_pub', duration: 5 });
              setIsPublishingToFanqie(false);
            } else {
              message.loading({ content: task.msg || `番茄草稿同步中 (${task.progress || 10}%)...`, key: 'fanqie_pub', duration: 0 });
            }
          }
        } catch (pollErr: any) {
          console.error('Polling status error:', pollErr);
        }
      }, 1500);

    } catch (e: any) {
      message.error({ content: e.message || '网络或接口异常，同步草稿箱失败', key: 'fanqie_pub', duration: 4 });
      setIsPublishingToFanqie(false);
    }
  };

  const handleToggleSyncStatus = async (chapterNumber: number, currentIsSynced: boolean, setLoading: (l: boolean) => void) => {
    if (!selectedNovel) return;
    const targetStatus = currentIsSynced ? 'completed' : 'published';
    setLoading(true);
    try {
      const res: any = await httpService.post('/ai-novel/update-chapter-status', {
        novelId: selectedNovel.id,
        chapterNumber,
        crawlStatus: targetStatus
      });
      if (res.code === 200) {
        message.success(res.msg || '修改同步状态成功！');
        loadNovelToEditor(selectedNovel.id);
      } else {
        message.error(res.msg || '修改状态失败');
      }
    } catch (e: any) {
      message.error(e.message || '修改状态接口异常');
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveSelectedChapterNumbers = (): number[] => {
    if (!selectedOutline) return [];
    if (syncSelectMode === 'manual') {
      return selectedPublishChapters;
    } else {
      if (syncRangeStart === null || syncRangeEnd === null) return [];
      const start = Math.min(syncRangeStart, syncRangeEnd);
      const end = Math.max(syncRangeStart, syncRangeEnd);
      return selectedOutline.chaptersOutline
        .filter(c => c.chapterNumber >= start && c.chapterNumber <= end && c.status === 'completed')
        .map(c => c.chapterNumber);
    }
  };

  const handleBatchMarkSynced = async (targetStatus: 'published' | 'completed') => {
    if (!selectedNovel) return;
    const nums = getEffectiveSelectedChapterNumbers();
    if (nums.length === 0) {
      message.warning('请先选择要操作的章节！');
      return;
    }

    try {
      message.loading({ content: `正在批量更新 ${nums.length} 个章节状态...`, key: 'batch_status', duration: 0 });
      for (const num of nums) {
        await httpService.post('/ai-novel/update-chapter-status', {
          novelId: selectedNovel.id,
          chapterNumber: num,
          crawlStatus: targetStatus
        });
      }
      message.success({ content: `已成功将 ${nums.length} 个章节标记为【${targetStatus === 'published' ? '已同步' : '未同步'}】！`, key: 'batch_status', duration: 3 });
      loadNovelToEditor(selectedNovel.id);
    } catch (e: any) {
      message.error({ content: e.message || '批量更新状态失败', key: 'batch_status', duration: 3 });
    }
  };

  const handleExportChaptersTxt = async () => {
    if (!selectedNovel || !selectedOutline) return;
    const nums = getEffectiveSelectedChapterNumbers();
    if (nums.length === 0) {
      message.warning('请先选择要导出的章节！');
      return;
    }

    try {
      message.loading({ content: `正在读取并整理 ${nums.length} 个章节正文...`, key: 'export_txt', duration: 0 });
      let combinedContent = `《${selectedNovel.title}》\n作者：${selectedNovel.author || 'AI 创作者'}\n导出章节：共 ${nums.length} 章\n导出时间：${new Date().toLocaleString()}\n\n====================================\n\n`;

      for (const num of nums) {
        const res: any = await httpService.get(`/ai-novel/chapter-detail?novelId=${selectedNovel.id}&chapterNumber=${num}`);
        if (res.code === 200 && res.data) {
          const ch = res.data;
          const cleanTitle = (ch.title || `第${num}章`).replace(/^第\s*\d+\s*章\s*/, '').trim();
          combinedContent += `第${num}章 ${cleanTitle}\n\n${(ch.content || '').trim()}\n\n\n------------------------------------\n\n`;
        }
      }

      const blob = new Blob([combinedContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedNovel.title}_第${Math.min(...nums)}-${Math.max(...nums)}章_番茄草稿.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success({ content: `🎉 已成功导出 ${nums.length} 个章节的番茄标准草稿 TXT 文件！`, key: 'export_txt', duration: 4 });
    } catch (e: any) {
      message.error({ content: e.message || '导出章节失败', key: 'export_txt', duration: 3 });
    }
  };

  return {
    fanqieModalOpen,
    setFanqieModalOpen,
    fanqieBookId,
    setFanqieBookId,
    fanqieBookName,
    setFanqieBookName,
    isPublishingToFanqie,
    selectedPublishChapters,
    setSelectedPublishChapters,
    syncSelectMode,
    setSyncSelectMode,
    syncRangeStart,
    setSyncRangeStart,
    syncRangeEnd,
    setSyncRangeEnd,
    publishPollRef,
    handleOpenFanqieModal,
    handleSelectAllUnsynced,
    getSyncSummary,
    handlePublishToFanqie,
    handleToggleSyncStatus,
    handleBatchMarkSynced,
    handleExportChaptersTxt
  };
};
