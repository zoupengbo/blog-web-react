import { useState, useCallback } from 'react';
import { message } from 'antd';
import httpService from '@common/request';
import { SearchResult, ApiResponse } from '../types';
import { API_ENDPOINTS } from '../constants';
import { StorageUtil } from '../utils/storage';

export interface UseBookSearchReturn {
  searchResults: SearchResult[];
  loading: boolean;
  searchBook: (keyword: string) => Promise<void>;
  clearResults: () => void;
}

export const useBookSearch = (): UseBookSearchReturn => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastSearchKeyword, setLastSearchKeyword] = useState<string>('');

  const searchBook = useCallback(async (keyword: string) => {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
      message.warning('请输入搜索关键词');
      return;
    }

    // 防止重复搜索相同关键词
    if (trimmedKeyword === lastSearchKeyword && loading) {
      return;
    }

    setLastSearchKeyword(trimmedKeyword);
    setLoading(true);
    try {
      const response = await httpService.post(
        API_ENDPOINTS.SEARCH,
        { keyword: trimmedKeyword }
      );

      if (response.code === 200) {
        const searchResults = response.data?.searchResults || [];
        setSearchResults(searchResults);
        // 添加到搜索历史
        StorageUtil.addSearchHistory(trimmedKeyword);
        
        if (searchResults.length === 0) {
          message.info('未找到相关书籍');
        }
      } else {
        message.error(response.msg || '搜索失败');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('搜索书籍失败:', error);
      message.error('搜索失败，请稍后重试');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setSearchResults([]);
    setLastSearchKeyword('');
  }, []);

  return {
    searchResults,
    loading,
    searchBook,
    clearResults,
  };
};
