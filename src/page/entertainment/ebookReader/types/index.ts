// 书籍相关类型
export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl?: string;
  category: string;
  status: 'ongoing' | 'completed';
  totalChapters: number;
  lastUpdateTime: string;
  sourceUrl: string;
  tags: string[];
  rating?: number;
  addedTime: string;
}

// 章节相关类型
export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  index: number;
  content?: string;
  wordCount: number;
  isDownloaded: boolean;
  lastReadTime?: string;
  sourceUrl?: string; // 章节的完整URL
}


// 阅读设置类型
export interface ReaderSettings {
  fontSize: number; // 12-24
  fontFamily: string;
  lineHeight: number; // 1.2-2.0
  backgroundColor: string;
  textColor: string;
  theme: 'light' | 'dark' | 'sepia';
  pageMode: 'scroll' | 'page';
  autoTurnPage: boolean;
  turnPageSpeed: number; // 秒
  brightness: number; // 0-100
}

// 搜索结果类型
export interface SearchResult {
  title: string;
  author: string;
  description: string;
  coverImage: string;
  url: string;
  sourceId: string;
  latestChapter: string;
  size: string;
  updateTime: string;
  status: string;
  source: string;
}

// API响应类型
export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
  count?: number;
}

// 章节详情API响应
export interface ChapterDetailResponse {
  title: string;
  content: string;
  wordCount: number;
  sourceId: string;
  prevChapter?: string;
  nextChapter?: string;
}

// 书籍详情API响应
export interface BookDetailResponse {
  title: string;
  author: string;
  description: string;
  coverImage: string;
  status: string;
  totalChapters: number;
  latestChapter: string;
  updateTime: string;
  sourceUrl: string;
  chapters: {
    title: string;
    chapterNumber: number;
    sourceUrl: string;
    sourceId: string;
  }[];
}

// 视图类型
export type ViewType = 'search' | 'shelf' | 'detail' | 'reader';

// 排序类型
export type SortType = 'addTime' | 'lastRead' | 'title' | 'author';
