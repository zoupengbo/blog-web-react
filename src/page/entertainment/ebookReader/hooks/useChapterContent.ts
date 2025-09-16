import { useState, useCallback } from 'react';
import { message } from 'antd';
import httpService from '@common/request';
import { ChapterDetailResponse, ApiResponse, Chapter } from '../types';
import { API_ENDPOINTS } from '../constants';

export interface UseChapterContentReturn {
  currentChapter: Chapter | null;
  loading: boolean;
  getChapterContent: (chapterUrl: string, chapterInfo: Partial<Chapter>) => Promise<void>;
  clearContent: () => void;
}

export const useChapterContent = (): UseChapterContentReturn => {
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRequestedUrl, setLastRequestedUrl] = useState<string>('');

  const getChapterContent = useCallback(async (chapterUrl: string, chapterInfo: Partial<Chapter>) => {
    if (!chapterUrl) {
      message.warning('章节链接不能为空');
      return;
    }

    // 防止重复请求同一个章节
    if (chapterUrl === lastRequestedUrl && loading) {
      return;
    }

    // 如果已经加载了相同的章节内容，直接返回
    if (currentChapter && currentChapter.id === chapterInfo.id && chapterUrl === lastRequestedUrl) {
      return;
    }

    setLastRequestedUrl(chapterUrl);
    setLoading(true);
    try {
      const response = await httpService.post(
        API_ENDPOINTS.CHAPTER,
        { chapterUrl: chapterUrl }
      );

      if (response.code === 200) {
        // 清理HTML标签，提取纯文本内容
        const cleanContent = response.data.content
          .replace(/<[^>]*>/g, '') // 移除HTML标签
          .replace(/&nbsp;/g, ' ') // 替换&nbsp;
          .replace(/&lt;/g, '<')   // 替换HTML实体
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .trim();

        const chapterData: Chapter = {
          id: response.data.sourceId,
          bookId: chapterInfo.bookId || '',
          title: response.data.title,
          index: chapterInfo.index || 1,
          content: cleanContent,
          wordCount: response.data.wordCount || cleanContent.length,
          isDownloaded: true,
          readProgress: 0,
          lastReadTime: new Date().toISOString(),
        };

        setCurrentChapter(chapterData);
      } else {
        message.error(response.msg || '获取章节内容失败');
        setCurrentChapter(null);
      }
    } catch (error) {
      console.error('获取章节内容失败:', error);
      message.error('获取章节内容失败，请稍后重试');
      setCurrentChapter(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearContent = useCallback(() => {
    setCurrentChapter(null);
    setLastRequestedUrl('');
  }, []);

  return {
    currentChapter,
    loading,
    getChapterContent,
    clearContent,
  };
};
