import { useState, useCallback } from 'react';
import { message } from 'antd';
import httpService from '@common/request';
import { BookDetailResponse, ApiResponse, Chapter } from '../types';
import { API_ENDPOINTS } from '../constants';

export interface UseBookDetailReturn {
  bookDetail: BookDetailResponse | null;
  chapters: Chapter[];
  loading: boolean;
  getBookDetail: (bookUrl: string) => Promise<void>;
  clearDetail: () => void;
}

export const useBookDetail = (): UseBookDetailReturn => {
  const [bookDetail, setBookDetail] = useState<BookDetailResponse | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRequestedUrl, setLastRequestedUrl] = useState<string>('');

  const getBookDetail = useCallback(async (bookUrl: string) => {
    if (!bookUrl) {
      message.warning('书籍链接不能为空');
      return;
    }

    // 防止重复请求同一本书
    if (bookUrl === lastRequestedUrl && loading) {
      return;
    }

    // 如果已经加载了相同的书籍详情，直接返回
    if (bookDetail && bookDetail.sourceUrl === bookUrl && bookUrl === lastRequestedUrl) {
      return;
    }

    setLastRequestedUrl(bookUrl);
    setLoading(true);
    try {
      const response = await httpService.post(
        API_ENDPOINTS.DETAIL,
        { novelUrl: bookUrl }
      );

      if (response.code === 200) {
        setBookDetail(response.data);
        
        // 转换章节数据格式
        const chapterList: Chapter[] = response.data.chapters.map((chapter: any, index: number) => ({
          id: chapter.sourceId,
          bookId: bookUrl, // 使用URL作为bookId
          title: chapter.title,
          index: chapter.chapterNumber || index + 1,
          wordCount: 0, // 初始为0，获取内容时更新
          isDownloaded: false,
          readProgress: 0,
          sourceUrl: chapter.sourceUrl, // 保存章节的完整URL
        }));
        
        setChapters(chapterList);
      } else {
        message.error(response.msg || '获取书籍详情失败');
        setBookDetail(null);
        setChapters([]);
      }
    } catch (error) {
      console.error('获取书籍详情失败:', error);
      message.error('获取书籍详情失败，请稍后重试');
      setBookDetail(null);
      setChapters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearDetail = useCallback(() => {
    setBookDetail(null);
    setChapters([]);
    setLastRequestedUrl('');
  }, []);

  return {
    bookDetail,
    chapters,
    loading,
    getBookDetail,
    clearDetail,
  };
};
