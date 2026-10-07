import httpService from '../../../common/request';
import { HotNewsItem, DraftArticleItem, ChannelConfigItem, PushRecordItem } from '../types';

export const MediaMatrixApi = {
  // 获取热点列表
  getHotNewsList: (params: { source?: string; search?: string; limit?: number; offset?: number }) => {
    return httpService.get<{ total: number; items: HotNewsItem[] }>('/hot-news/list', { params });
  },

  // 手动刷新热榜
  refreshHotNews: (source?: string) => {
    return httpService.post<{ count: number; totalFetched: number; source: string }>('/hot-news/refresh', { source });
  },

  // AI 文章生成
  generateArticle: (data: {
    hotNewsId?: number;
    topic: string;
    digest?: string;
    stylePreset?: string;
    customPrompt?: string;
    author?: string;
    targetLength?: string;
  }) => {
    return httpService.post<DraftArticleItem>('/hot-news/generate', data);
  },

  // 获取最近编辑的一篇草稿文章（刷新后自动恢复现场）
  getLatestDraft: () => {
    return httpService.get<DraftArticleItem>('/hot-news/article-latest');
  },

  // 获取文章详情
  getArticleDetail: (id: number) => {
    return httpService.get<DraftArticleItem>(`/hot-news/article/${id}`);
  },

  // 更新文章内容
  updateArticle: (id: number, data: Partial<DraftArticleItem>) => {
    return httpService.put<DraftArticleItem>(`/hot-news/article/${id}`, data);
  },

  // 为文章调用 Gemini 生成配图/封面
  generateArticleImage: (id: number, data?: { prompt?: string; insertToContent?: boolean }) => {
    return httpService.post<{ success: boolean; coverImage: string; isFallback: boolean; article: DraftArticleItem }>(`/hot-news/article/${id}/generate-image`, data || {});
  },

  // 获取渠道配置
  getChannels: () => {
    return httpService.get<ChannelConfigItem[]>('/hot-news/channels');
  },

  // 保存渠道配置
  saveChannel: (data: {
    channel: string;
    appId: string;
    appSecret?: string;
    isMockMode: boolean;
    extraConfig?: any;
  }) => {
    return httpService.post('/hot-news/channels/save', data);
  },

  // 推送到草稿箱
  pushDraft: (data: { draftArticleId: number; channels: string[]; autoGenerateImage?: boolean }) => {
    return httpService.post<{ results: any[] }>('/hot-news/push', data);
  },

  // 获取推送历史
  getPushHistory: (params: { draftArticleId?: number; channel?: string; limit?: number; offset?: number }) => {
    return httpService.get<{ total: number; items: PushRecordItem[] }>('/hot-news/push-history', { params });
  },

  // 重试推送
  retryPush: (pushRecordId: number) => {
    return httpService.post('/hot-news/push/retry', { pushRecordId });
  },

  // 测试渠道连接凭证
  testChannel: (data: { channel: string; appId?: string; appSecret?: string; authMode?: string; cookie?: string; accessToken?: string }) => {
    return httpService.post<{ success: boolean; message: string; suggestion?: string }>('/hot-news/channels/test', data);
  },

  // 快速切换沙盒模拟模式并重试推送
  mockAndRetry: (data: { channel?: string; pushRecordId?: number }) => {
    return httpService.post<{ code: number; msg: string; data?: any }>('/hot-news/channels/mock-retry', data);
  },

  // 获取 AI 大模型配置
  getAiConfig: () => {
    return httpService.get<{
      id: number;
      name: string;
      baseUrl: string;
      modelName: string;
      apiKeyMasked: string;
      hasKey: boolean;
      temperature: number;
      maxTokens: number;
    }>('/hot-news/ai-config');
  },

  // 保存 AI 大模型配置
  saveAiConfig: (data: {
    id?: number;
    name?: string;
    baseUrl: string;
    modelName: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
  }) => {
    return httpService.post('/hot-news/ai-config', data);
  },

  // 测试 AI 连通性
  testAiConfig: (data: { baseUrl: string; modelName: string; apiKey?: string }) => {
    return httpService.post('/hot-news/ai-config/test', data);
  },

  // 获取热搜定时调度状态
  getSchedulerStatus: () => {
    return httpService.get<{ enabled: boolean; isRunning: boolean; intervalMinutes: number; lastSyncTime: string | null }>('/hot-news/scheduler/status');
  },

  // 切换热搜定时调度开关
  toggleScheduler: (data: { enabled: boolean; intervalMinutes?: number }) => {
    return httpService.post<{ code: number; msg: string; data: { enabled: boolean; isRunning: boolean; intervalMinutes: number; lastSyncTime: string | null } }>('/hot-news/scheduler/toggle', data);
  }
};
