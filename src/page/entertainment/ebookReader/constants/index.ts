// 阅读器默认设置
export const DEFAULT_READER_SETTINGS = {
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
  lineHeight: 1.6,
  backgroundColor: '#ffffff',
  textColor: '#333333',
  theme: 'light' as const,
  pageMode: 'scroll' as const,
  autoTurnPage: false,
  turnPageSpeed: 3,
  brightness: 100,
};

// 主题配置
export const THEMES = {
  light: {
    backgroundColor: '#ffffff',
    textColor: '#333333',
    name: '日间模式',
  },
  dark: {
    backgroundColor: '#1f1f1f',
    textColor: '#e0e0e0',
    name: '夜间模式',
  },
  sepia: {
    backgroundColor: '#f7f3e9',
    textColor: '#5c4b37',
    name: '护眼模式',
  },
};

// 字体选项
export const FONT_FAMILIES = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Microsoft YaHei", sans-serif', label: '微软雅黑' },
  { value: '"SimSun", serif', label: '宋体' },
  { value: '"KaiTi", serif', label: '楷体' },
  { value: '"FangSong", serif', label: '仿宋' },
];

// 本地存储键名
export const STORAGE_KEYS = {
  BOOKSHELF: 'ebook_bookshelf',
  READING_PROGRESS: 'ebook_reading_progress',
  READER_SETTINGS: 'ebook_reader_settings',
  SEARCH_HISTORY: 'ebook_search_history',
  BOOKMARKS: 'ebook_bookmarks',
};

// API端点
export const API_ENDPOINTS = {
  SEARCH: '/novel/search',
  DETAIL: '/novel/detail',
  CHAPTER: '/novel/chapter',
};

// 分页配置
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  SEARCH_PAGE_SIZE: 50,
};
