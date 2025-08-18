import httpService from './request';

// 小说数据接口
export interface NovelData {
  id?: React.Key;
  title: string;
  author: string;
  description: string;
  category: string;
  coverImage: string;
  status: string;
  latestChapter: string;
  latestUpdateTime: string;
  totalChapters: number;
  crawledChapters: number;
  crawlStatus: string;
  sourceUrl: string;
  sourceId: string;
  tags: string[];
  viewCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
}

// 章节数据接口
export interface ChapterData {
  id: number;
  novelId: number;
  title: string;
  chapterNumber: number;
  content: string;
  wordCount: number;
  sourceUrl: string;
  sourceId: string;
  crawlStatus: string;
  crawlError: string;
  publishTime: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

// 搜索结果接口
export interface SearchResultData {
  title: string;
  url: string;
  sourceId: string;
}

// 搜索小说
export const searchNovel = async (keyword: string) => {
  return await httpService.post("/novel/search", {
    keyword: keyword.trim()
  });
};

// 爬取小说
export const crawlNovel = async (params: {
  keyword?: string;
  novelUrl?: string;
  maxChapters?: number;
}) => {
  return await httpService.post("/novel/crawl", params);
};

// 获取小说列表
export const getNovelList = async (
  page: number = 0, 
  pageSize: number = 10, 
  filters?: {
    category?: string;
    status?: string;
    crawlStatus?: string;
  }
) => {
  const params: any = {
    offset: page,
    limit: pageSize,
  };
  
  if (filters?.category) params.category = filters.category;
  if (filters?.status) params.status = filters.status;
  if (filters?.crawlStatus) params.crawlStatus = filters.crawlStatus;

  return await httpService("/novel/list", { params });
};

// 获取小说详情
export const getNovelDetail = async (id: React.Key) => {
  return await httpService(`/novel/${id}`);
};

// 删除小说
export const deleteNovel = async (id: React.Key) => {
  return await httpService.post("/novel/delete", { id });
};

// 获取章节列表
export const getChapterList = async (
  novelId: number,
  page: number = 0,
  pageSize: number = 50,
  crawlStatus?: string
) => {
  const params: any = {
    offset: page,
    limit: pageSize,
  };
  
  if (crawlStatus) params.crawlStatus = crawlStatus;

  return await httpService(`/novel/${novelId}/chapters`, { params });
};

// 获取章节内容
export const getChapterContent = async (novelId: number, chapterId: number) => {
  return await httpService(`/novel/${novelId}/chapter/${chapterId}`);
};

// 批量爬取章节
export const batchCrawlChapters = async (novelId: number, chapterIds: number[]) => {
  return await httpService.post(`/novel/${novelId}/batch-crawl`, {
    chapterIds
  });
};

// 重新爬取失败的章节
export const retryCrawlChapter = async (novelId: number, chapterId: number) => {
  return await httpService.post(`/novel/${novelId}/chapter/${chapterId}/retry`);
};

// 更新小说信息
export const updateNovel = async (id: React.Key, data: Partial<NovelData>) => {
  return await httpService.post(`/novel/${id}/update`, data);
};

// 获取爬取进度
export const getCrawlProgress = async (novelId: number) => {
  return await httpService(`/novel/${novelId}/progress`);
};

// 暂停/恢复爬取
export const toggleCrawl = async (novelId: number, action: 'pause' | 'resume') => {
  return await httpService.post(`/novel/${novelId}/crawl/${action}`);
};

// 获取热门小说
export const getPopularNovels = async (limit: number = 10) => {
  return await httpService("/novel/popular", {
    params: { limit }
  });
};

// 获取最近更新的小说
export const getRecentNovels = async (limit: number = 10) => {
  return await httpService("/novel/recent", {
    params: { limit }
  });
};

// 搜索章节
export const searchChapters = async (novelId: number, keyword: string) => {
  return await httpService(`/novel/${novelId}/chapters/search`, {
    params: { keyword }
  });
};

// 导出小说
export const exportNovel = async (novelId: number, format: 'txt' | 'epub' | 'pdf') => {
  return await httpService(`/novel/${novelId}/export`, {
    params: { format },
    responseType: 'blob'
  });
};

// 获取小说统计信息
export const getNovelStats = async () => {
  return await httpService("/novel/stats");
};

// 清理失败的爬取任务
export const cleanFailedTasks = async () => {
  return await httpService.post("/novel/clean-failed");
};

// 获取爬取日志
export const getCrawlLogs = async (novelId: number, page: number = 0, pageSize: number = 20) => {
  return await httpService(`/novel/${novelId}/logs`, {
    params: {
      offset: page,
      limit: pageSize
    }
  });
};
