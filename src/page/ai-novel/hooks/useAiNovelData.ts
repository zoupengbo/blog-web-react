import { useState } from 'react';
import { message, Modal } from 'antd';
import httpService from '../../../common/request';
import { Novel, NovelOutline, Idea } from '../types';

export const useAiNovelData = (
  EMPTY_OUTLINE: NovelOutline,
  setIntervention: (val: string) => void,
  setFanqieBookId: (val: string) => void,
  setFanqieBookName: (val: string) => void,
  setActiveChapterNum: (num: number) => void,
  setChapterContent: (text: string) => void,
  setView: (v: 'list' | 'idea' | 'outline' | 'editor') => void
) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [novels, setNovels] = useState<Novel[]>([]);
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [selectedOutline, setSelectedOutline] = useState<NovelOutline>(EMPTY_OUTLINE);
  const [draftOutline, setDraftOutline] = useState<NovelOutline | null>(null);
  const [chosenIdea, setChosenIdea] = useState<Idea | null>(null);

  const extractChapterContent = (value: any): string => {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object') return '';
    if (typeof value.content === 'string') return value.content;
    if (typeof value.data?.content === 'string') return value.data.content;
    return '';
  };

  const fetchNovels = async () => {
    setLoading(true);
    try {
      const res: any = await httpService.get(`/ai-novel/list?_t=${Date.now()}`);
      if (res.code === 200) {
        const rawData = res.data;
        const list = Array.isArray(rawData) ? rawData : (rawData?.data || []);
        setNovels(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadChapterContent = async (novelId: number, chNum: number) => {
    setChapterContent('');
    try {
      const resContent: any = await httpService.get(`/ai-novel/chapter-content?novelId=${novelId}&chapterNumber=${chNum}&_t=${Date.now()}`);
      if (resContent.code === 200 && resContent.data) {
        const text = extractChapterContent(resContent.data);
        setChapterContent(text);
        if (text && text.trim()) {
          setSelectedOutline((prev: any) => {
            if (!prev || !prev.chaptersOutline) return prev;
            return {
              ...prev,
              chaptersOutline: prev.chaptersOutline.map((c: any) =>
                parseInt(c.chapterNumber, 10) === parseInt(chNum as any, 10)
                  ? { ...c, status: 'completed', wordCount: text.length }
                  : c
              )
            };
          });
        }
      } else {
        setChapterContent('');
      }
    } catch (e) {
      setChapterContent('');
    }
  };

  const loadNovelToEditor = async (novelId: number, targetChapterNum?: number) => {
    setLoading(true);
    try {
      const res: any = await httpService.get(`/ai-novel/detail/${novelId}?_t=${Date.now()}`);
      if (res.code === 200 && res.data && res.data.novel) {
        setSelectedNovel(res.data.novel);
        setSelectedOutline(res.data.outline || EMPTY_OUTLINE);
        localStorage.setItem('last_selected_novel_id', String(novelId));

        const chOutline = res.data.outline?.chaptersOutline || [];
        const firstPending = chOutline.find((c: any) => c.status === 'pending');
        const activeNum = targetChapterNum || (firstPending ? firstPending.chapterNumber : 1);

        setActiveChapterNum(activeNum);
        localStorage.setItem('last_active_chapter_num', String(activeNum));

        const activeChapter = chOutline.find((c: any) => c.chapterNumber === activeNum);
        setIntervention(activeChapter?.interventionPrompt || '');

        await loadChapterContent(novelId, activeNum);

        const savedBookId = localStorage.getItem(`fanqie_book_id_${novelId}`) || '';
        const savedBookName = localStorage.getItem(`fanqie_book_name_${novelId}`) || '';
        setFanqieBookId(savedBookId);
        setFanqieBookName(savedBookName || res.data.novel.title);

        setView('editor');
      } else {
        localStorage.removeItem('last_selected_novel_id');
        localStorage.removeItem('last_active_chapter_num');
        setSelectedNovel(null);
        setSelectedOutline(EMPTY_OUTLINE);
        setView('list');
        message.error('该小说不存在或已被删除，已为您返回创作列表');
      }
    } catch (e: any) {
      localStorage.removeItem('last_selected_novel_id');
      localStorage.removeItem('last_active_chapter_num');
      setSelectedNovel(null);
      setSelectedOutline(EMPTY_OUTLINE);
      setView('list');
      message.error('获取小说详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNovel = (id: number, title: string) => {
    Modal.confirm({
      title: '您确定要销毁这本小说吗？',
      content: `这将会永久清除《${title}》的全部世界观大纲设定和全部已创作的正文，此操作无法撤销！`,
      okText: '确认销毁',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res: any = await httpService.delete(`/ai-novel/${id}`);
          if (res.code === 200) {
            message.success('小说已成功从工坊中清理。');
            fetchNovels();
          }
        } catch (e) {
          message.error('清理失败');
        }
      }
    });
  };

  const handleExportTxt = () => {
    if (!selectedNovel || !selectedOutline) return;
    Modal.confirm({
      title: '导出作品',
      content: '确定要将当前小说已完成的章节打包导出为 TXT 文件吗？',
      onOk: async () => {
        try {
          const activeChaps = selectedOutline.chaptersOutline.filter(c => c.status === 'completed');
          let finalTxt = `《${selectedNovel.title}》\n作者：${selectedNovel.author}\n\n【世界观设定】\n${selectedOutline.worldSetting}\n\n【核心人物】\n${selectedOutline.characterSetting}\n\n`;

          setLoading(true);
          for (const chap of activeChaps) {
            const resContent: any = await httpService.get(`/ai-novel/chapter-content?novelId=${selectedNovel.id}&chapterNumber=${chap.chapterNumber}`);
            if (resContent.code === 200 && resContent.data) {
              finalTxt += `\n\n${chap.title}\n\n${extractChapterContent(resContent.data)}\n\n--------------------\n`;
            }
          }

          const blob = new Blob([finalTxt], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${selectedNovel.title}_AI全集.txt`;
          link.click();
          URL.revokeObjectURL(url);
          message.success('作品打包导出成功！');
        } catch (e) {
          message.error('导出失败');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return {
    loading,
    setLoading,
    novels,
    setNovels,
    selectedNovel,
    setSelectedNovel,
    selectedOutline,
    setSelectedOutline,
    draftOutline,
    setDraftOutline,
    chosenIdea,
    setChosenIdea,
    fetchNovels,
    loadChapterContent,
    loadNovelToEditor,
    handleDeleteNovel,
    handleExportTxt,
  };
};
