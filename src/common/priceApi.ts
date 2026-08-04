import request from './request';

export interface PriceCompareItem {
  title: string;
  price: string;
  priceVal: number;
  platform: string;
  shop: string;
  image: string;
  link: string;
  itemType?: 'main' | 'accessory' | 'secondhand' | 'service' | 'deposit';
  storeType?: 'official' | 'thirdparty';
  isSynthetic?: boolean; // true if this is a generated platform link, not scraped data
}

export interface PriceAnalysis {
  lowestPrice: string;
  lowestItem: PriceCompareItem | null;
  highestPrice: string;
  medianPrice: string;
  priceRange: string;
  recommendation: string;
  totalFound: number;
  platformCount?: number;
  platformsCovered?: string[];
}

export interface CompareResponse {
  items: PriceCompareItem[];
  platformLinks?: PriceCompareItem[]; // Direct search links for platforms not covered
  analysis: PriceAnalysis;
}

export interface AiAnalysisResponse {
  analysisText: string;
}

/**
 * 搜索全网商品比价列表
 * @param keyword 商品关键词
 */
export const searchPrices = (keyword: string) => {
  return request.get<{ code: number, data: CompareResponse }>('/price-compare/search', {
    params: { keyword }
  });
};

/**
 * 获取 AI 消费分析报告
 * @param keyword 商品关键词
 * @param items 比价商品列表
 */
export const aiAnalyzePrices = (keyword: string, items: PriceCompareItem[]) => {
  return request.post<{ code: number, data: AiAnalysisResponse }>('/price-compare/ai-analyze', {
    keyword,
    items
  });
};
