import { useState, useCallback, useEffect } from 'react';
import { ReadingProgress } from '../types';
import { StorageUtil } from '../utils/storage';

export interface UseReadingProgressReturn {
  progress: ReadingProgress | null;
  updateProgress: (progress: Partial<ReadingProgress>) => void;
  resetProgress: (bookId: string) => void;
  getAllProgress: () => Record<string, ReadingProgress>;
}

export const useReadingProgress = (bookId?: string): UseReadingProgressReturn => {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);

  // 初始化进度数据
  useEffect(() => {
    if (bookId) {
      const savedProgress = StorageUtil.getReadingProgress(bookId);
      setProgress(savedProgress);
    }
  }, [bookId]);

  // 更新阅读进度
  const updateProgress = useCallback((newProgress: Partial<ReadingProgress>) => {
    if (!bookId) return;

    const currentProgress = StorageUtil.getReadingProgress(bookId);
    const updatedProgress: ReadingProgress = {
      bookId,
      currentChapterId: '',
      currentChapterProgress: 0,
      totalProgress: 0,
      readingTime: 0,
      lastReadTime: new Date().toISOString(),
      ...currentProgress,
      ...newProgress,
    };

    StorageUtil.saveReadingProgress(updatedProgress);
    setProgress(updatedProgress);
  }, [bookId]);

  // 重置阅读进度
  const resetProgress = useCallback((targetBookId: string) => {
    // 这里需要实现删除特定书籍的进度记录
    // 由于当前StorageUtil没有删除单个进度的方法，我们可以扩展它
    const allProgress = getAllProgress();
    delete allProgress[targetBookId];
    
    try {
      localStorage.setItem('ebook_reading_progress', JSON.stringify(allProgress));
      if (targetBookId === bookId) {
        setProgress(null);
      }
    } catch (error) {
      console.error('重置阅读进度失败:', error);
    }
  }, [bookId]);

  // 获取所有阅读进度
  const getAllProgress = useCallback((): Record<string, ReadingProgress> => {
    try {
      const data = localStorage.getItem('ebook_reading_progress');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('获取所有阅读进度失败:', error);
      return {};
    }
  }, []);

  return {
    progress,
    updateProgress,
    resetProgress,
    getAllProgress,
  };
};
