import request from '../request';

export type StrategyMode = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';

export interface StrategyOption {
  key: StrategyMode;
  name: string;
  label: string;
  badge: string;
  icon: string;
  desc: string;
  target: string;
  riskConstraint: string;
  color: string;
}

export const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    key: 'CONSERVATIVE',
    name: '稳健红利雷达 🛡️',
    label: '稳健红利',
    badge: '低波防御',
    icon: 'ShieldOutlined',
    desc: '专注低估值、破净修复、高股息央国企与公用事业，追求极低回撤与稳定复利',
    target: '高股息 + 低Beta + 低波动 (HV20 ≤ 45%, β ≤ 1.20, MDD20 ≤ 15%)',
    riskConstraint: '弱势周期100%防守底仓，严格过滤高波高估值题材，安全边际优先',
    color: '#52c41a'
  },
  {
    key: 'BALANCED',
    name: '平衡成长雷达 ⚖️',
    label: '平衡成长',
    badge: '攻守兼备',
    icon: 'SlidersOutlined',
    desc: '精选业绩高增、PEG合理、行业龙头白马，兼顾抗跌防守与稳健成长弹性',
    target: '行业龙头 + 合理估值 + 持续高ROE (HV20 ≤ 60%, β ≤ 1.50, MDD20 ≤ 22%)',
    riskConstraint: '中度波动约束，大盘弱势时自动提升≥70%防御白马占比',
    color: '#1890ff'
  },
  {
    key: 'AGGRESSIVE',
    name: '进取突击雷达 🚀',
    label: '进取突击',
    badge: '短线进攻',
    icon: 'RocketOutlined',
    desc: '聚焦短期主线风口、量价多头突破与主力资金抢筹，博取超额短线爆发弹性',
    target: '量价多头突破 + 主力净流入 + 主线催化 (HV20 ≤ 85%, β ≤ 2.20)',
    riskConstraint: '强止损保护 (硬性止损 4%~6%)，快速止盈，规避高位暴跌',
    color: '#fa541c'
  }
];

export interface IndexItem {
  code: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
}

export interface SectorItem {
  name: string;
  changePercent: string;
  netInflow: string;
  leader: string;
  sentiment?: string;
}

export interface MarketBreadth {
  upCount: number;
  downCount: number;
  flatCount: number;
  totalTurnover: string;
  mainNetInflow: string;
  northboundInflow: string;
}

export interface MarketSummary {
  indices: IndexItem[];
  sectors: SectorItem[];
  breadth: MarketBreadth;
  scanTime: string;
  marketSentiment: string;
  msiScore?: number;
  marketRegime?: 'WEAK_BEAR' | 'OSCILLATING' | 'STRONG_BULL' | string;
  timingCycle?: string;
  defensiveGatewayActive?: boolean;
  defenseTriggered?: boolean;
  suggestedStrategy?: StrategyMode | string;
  gatewayWarningMessage?: string;
  sIndex?: number;
  sBreadth?: number;
  sFlow?: number;
}

export interface DimensionScores {
  technical: number;
  capital: number;
  sector: number;
  fundamental: number;
  composite: number;
}

export interface KlinePoint {
  date: string;
  open: number;
  close: number;
  low: number;
  high: number;
  volume: number;
}

export interface PredictionItem {
  id?: number;
  stockCode: string;
  stockName: string;
  industry: string;
  currentPrice: number;
  changePercent: number;
  winRate: number;
  expectedHorizon: string;
  predictedGain: string;
  buyRange: string;
  takeProfitPrice: number;
  stopLossPrice: number;
  dimensionScores: DimensionScores;
  mainForceTrend: string;
  catalystRationale: string;
  riskWarning: string;
  tags: string[];
  klineData?: KlinePoint[];
  rankOrder?: number;
  createdAt?: string;

  // ===== R5 多策略与风控扩展字段 =====
  strategyMode?: StrategyMode | string;
  strategyName?: string;
  hv?: number;
  volatility?: number;
  beta?: number;
  atr?: number;
  maxDrawdown?: number;
  maxDrawdown20?: number;
  initialBuyPrice?: number;
  firstBuyPrice?: number;
  dipBuyPrice?: number;
  secondaryBuyPrice?: number;
  safetyBuffer?: number;
  supportLevel?: string;
  riskBadges?: string[];
}

export interface PredictionScan {
  id: number;
  scanBatchId: string;
  strategyMode?: StrategyMode | string;
  marketRegime?: string;
  defensiveGatewayActive?: boolean;
  msiScore?: number;
  marketStatus: MarketSummary;
  summary: string;
  modelUsed: string;
  candidateCount: number;
  recommendedCount: number;
  items: PredictionItem[];
  createdAt: string;
}

export interface HistoryScanItem {
  id: number;
  scanBatchId: string;
  strategyMode?: StrategyMode | string;
  marketRegime?: string;
  defensiveGatewayActive?: boolean;
  msiScore?: number;
  summary: string;
  modelUsed: string;
  candidateCount: number;
  recommendedCount: number;
  createdAt: string;
}

export interface ScanHistoryResult {
  total: number;
  page: number;
  pageSize: number;
  list: HistoryScanItem[];
}

export interface BacktestItem {
  id: number;
  scanBatchId: string;
  stockCode: string;
  stockName: string;
  industry: string;
  strategyMode?: StrategyMode | string;
  initialPrice: number;
  livePrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  initialBuyPrice?: number;
  dipBuyPrice?: number;
  actualReturn: string;
  actualReturnNum: number;
  isWin: boolean;
  hv?: number;
  beta?: number;
  atr?: number;
  maxDrawdown?: number;
  riskBadges?: string[];
  predictedWinRate: number;
  expectedHorizon: string;
  predictedGain: string;
  status: 'HOLDING' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'PROFIT';
  statusText: string;
  statusColor: string;
  createdAt: string;
}

export interface BacktestReport {
  strategyMode?: string;
  totalCount: number;
  winCount: number;
  winRate: number;
  avgReturn: string;
  takeProfitHitRate: string;
  maxDrawdownObserved?: string;
  backtestList: BacktestItem[];
}

export interface LiveQuoteItem {
  name: string;
  open: number;
  prevClose: number;
  currentPrice: number;
  changePercent: number;
  turnoverWan: number;
}

export interface LiveQuotesResponse {
  quotes: Record<string, LiveQuoteItem>;
  market: MarketSummary;
  timestamp: string;
}

export interface SimPosition {
  id: number;
  stockCode: string;
  stockName: string;
  industry: string;
  shares: number;
  costPrice: number;
  currentPrice: number;
  todayChangePercent: number;
  marketValue: number;
  totalCost: number;
  floatingProfit: number;
  floatingProfitRate: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  isTakeProfitHit: boolean;
  isStopLossHit: boolean;
  createdAt: string;
}

export interface SimAccount {
  accountId: number;
  initialCapital: number;
  availableCash: number;
  totalMarketValue: number;
  totalAsset: number;
  totalProfit: number;
  totalProfitRate: number;
  positionCount: number;
  positions: SimPosition[];
  timestamp: string;
}

export interface SimOrder {
  id: number;
  accountId: number;
  stockCode: string;
  stockName: string;
  orderType: 'BUY' | 'SELL';
  price: number;
  shares: number;
  amount: number;
  profit: number;
  profitRate: number;
  reason: string;
  createdAt: string;
}

export interface SuggestedAllocation {
  suggestedPctText: string;
  actualPctText: string;
  suggestedShares: number;
  suggestedAmount: number;
  price: number;
}

export const stockService = {
  // 获取大盘全景
  getMarketSummary: async (): Promise<{ code: number; data: MarketSummary }> => {
    return request.get('/stock/market');
  },

  // 获取最新 AI 股票雷达预测 (支持指定策略模式: CONSERVATIVE / BALANCED / AGGRESSIVE)
  getLatestRadar: async (strategy?: StrategyMode | string): Promise<{ code: number; data: { scan: PredictionScan; market: MarketSummary } }> => {
    const q = strategy ? `?strategy=${encodeURIComponent(strategy)}` : '';
    return request.get(`/stock/radar${q}`);
  },

  // 手动触发全市场深度扫描 (支持策略模式与自适应防御网关)
  runStockScan: async (strategy?: StrategyMode | string, forceGateway?: boolean): Promise<{ code: number; data: PredictionScan; msg: string }> => {
    return request.post('/stock/scan', {
      strategyMode: strategy,
      strategy: strategy,
      forceGateway: Boolean(forceGateway)
    });
  },

  // 获取历史扫描记录 (支持按策略模式分类查询)
  getScanHistory: async (page = 1, pageSize = 10, strategy?: string): Promise<{ code: number; data: ScanHistoryResult }> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (strategy && strategy !== 'ALL') {
      params.append('strategy', strategy);
    }
    return request.get(`/stock/history?${params.toString()}`);
  },

  // 获取单股预测详情
  getStockDetail: async (id: number | string): Promise<{ code: number; data: PredictionItem }> => {
    return request.get(`/stock/detail/${id}`);
  },

  // 获取特定扫描批次详情
  getScanById: async (id: number | string): Promise<{ code: number; data: PredictionScan }> => {
    return request.get(`/stock/scan/${id}`);
  },

  // 获取历史预测复盘回测统计 (支持按策略模式分类复盘)
  getBacktestReport: async (limit = 1000, strategy?: string): Promise<{ code: number; data: BacktestReport }> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (strategy && strategy !== 'ALL') {
      params.append('strategy', strategy);
    }
    return request.get(`/stock/backtest?${params.toString()}`);
  },

  // 5s 高频批量拉取实时行情快照
  getLiveQuotes: async (codes: string[]): Promise<{ code: number; data: LiveQuotesResponse }> => {
    return request.get(`/stock/quotes?codes=${codes.join(',')}`);
  },

  // 获取模拟资金账户全景
  getSimAccount: async (): Promise<{ code: number; data: SimAccount }> => {
    return request.get('/stock/sim/account');
  },

  // 模拟买入建仓
  executeSimBuy: async (params: {
    stockCode: string;
    stockName: string;
    industry?: string;
    price: number;
    shares: number;
    takeProfitPrice?: number;
    stopLossPrice?: number;
    reason?: string;
  }): Promise<{ code: number; data: { order: SimOrder; summary: SimAccount } }> => {
    return request.post('/stock/sim/buy', params);
  },

  // 模拟平仓卖出
  executeSimSell: async (params: {
    positionId: number;
    price?: number;
    shares?: number;
    reason?: string;
  }): Promise<{ code: number; data: { order: SimOrder; summary: SimAccount; realizedProfit: number } }> => {
    return request.post('/stock/sim/sell', params);
  },

  // 重置模拟账户本金
  resetSimAccount: async (initialCapital = 1000000): Promise<{ code: number; data: SimAccount }> => {
    return request.post('/stock/sim/reset', { initialCapital });
  },

  // 获取模拟交易历史订单流水
  getSimOrders: async (limit = 50): Promise<{ code: number; data: SimOrder[] }> => {
    return request.get(`/stock/sim/orders?limit=${limit}`);
  }
};
