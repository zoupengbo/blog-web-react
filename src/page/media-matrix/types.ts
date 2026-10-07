export interface HotNewsItem {
  id: number;
  source: 'weibo' | 'baidu' | 'zhihu' | 'toutiao' | string;
  title: string;
  hotIndex: string;
  url: string;
  digest: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftArticleItem {
  id: number;
  hotNewsId?: number;
  title: string;
  candidateTitles: string[];
  digest: string;
  content: string;
  markdownContent?: string;
  quotes: string[];
  imagePrompts: string[];
  coverImage?: string;
  stylePreset: 'viral' | 'depth' | 'tech' | 'casual' | string;
  status: 'draft' | 'published' | 'failed' | string;
  author: string;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelConfigItem {
  id: number;
  channel: 'wechat' | 'toutiao' | string;
  name: string;
  appId: string;
  appSecretMasked: string;
  hasSecret: boolean;
  isMockMode: boolean;
  extraConfig?: {
    thumbMediaId?: string;
    defaultAuthor?: string;
    needOpenComment?: number;
    clientKey?: string;
    accessToken?: string;
    [key: string]: any;
  };
  updatedAt: string;
}

export interface PushRecordItem {
  id: number;
  draftArticleId: number;
  articleTitle: string;
  channel: 'wechat' | 'toutiao' | string;
  mediaId: string;
  status: 'success' | 'failed' | 'mock_success' | 'pending' | string;
  errorCode: string;
  errorMessage: string;
  suggestion: string;
  payloadSummary?: string;
  createdAt: string;
}
