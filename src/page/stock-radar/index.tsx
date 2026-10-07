import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Space,
  Button,
  Drawer,
  Alert,
  Progress,
  Radio,
  Spin,
  message,
  Badge,
  List,
  Input,
  Select,
  Statistic,
  Switch,
  Modal,
  InputNumber,
  Tabs,
  Popconfirm,
  DatePicker,
  Segmented
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  RadarChartOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  ReloadOutlined,
  RiseOutlined,
  FireOutlined,
  FundOutlined,
  BulbOutlined,
  WarningOutlined,
  AppstoreOutlined,
  TableOutlined,
  SearchOutlined,
  AimOutlined,
  SyncOutlined,
  WalletOutlined,
  ShoppingOutlined,
  DollarCircleOutlined,
  PieChartOutlined,
  SafetyCertificateOutlined,
  SlidersOutlined,
  SafetyOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import * as echarts from 'echarts';
import {
  stockService,
  PredictionItem,
  PredictionScan,
  MarketSummary,
  HistoryScanItem,
  BacktestReport,
  BacktestItem,
  SimAccount,
  SimPosition,
  SimOrder,
  SuggestedAllocation,
  StrategyMode,
  STRATEGY_OPTIONS
} from '../../common/services/stockService';
import './index.scss';

const formatChangePercent = (val: string | number | undefined): { text: string; isUp: boolean } => {
  if (val === undefined || val === null || val === '') return { text: '0.00%', isUp: true };
  const str = String(val).trim().replace(/%/g, '');
  const num = parseFloat(str);
  if (isNaN(num)) return { text: '0.00%', isUp: true };
  if (num > 0) {
    return { text: `+${num.toFixed(2)}%`, isUp: true };
  } else if (num < 0) {
    return { text: `${num.toFixed(2)}%`, isUp: false };
  }
  return { text: '0.00%', isUp: true };
};

const getStrategyConfig = (mode?: string | StrategyMode) => {
  if (!mode) return STRATEGY_OPTIONS[1]; // default BALANCED
  const upper = String(mode).toUpperCase();
  if (upper.includes('CONSERVATIVE') || upper.includes('DIVIDEND') || upper.includes('稳健') || upper.includes('红利')) return STRATEGY_OPTIONS[0];
  if (upper.includes('AGGRESSIVE') || upper.includes('BREAK') || upper.includes('进取') || upper.includes('突击')) return STRATEGY_OPTIONS[2];
  return STRATEGY_OPTIONS[1];
};

const getRiskBadges = (record: PredictionItem): string[] => {
  if (record.riskBadges) {
    if (Array.isArray(record.riskBadges) && record.riskBadges.length > 0) {
      return record.riskBadges;
    }
    if (typeof record.riskBadges === 'string') {
      try {
        const parsed = JSON.parse(record.riskBadges);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // ignore
      }
    }
  }
  const badges: string[] = [];
  const hv = Number(record.hv || record.volatility || 0);
  const beta = Number(record.beta || 1.0);
  const mdd = Number(record.maxDrawdown || record.maxDrawdown20 || 0);

  if (record.strategyMode === 'CONSERVATIVE' || (hv > 0 && hv <= 35)) {
    badges.push('低波动');
    badges.push('防御红利');
  } else if (record.strategyMode === 'AGGRESSIVE') {
    badges.push('🚀 突破动量');
    badges.push('放量起爆');
  } else {
    badges.push('⚖️ 龙头白马');
    badges.push('攻守兼备');
  }
  if (beta < 1.0) {
    badges.push(`低Beta (${beta.toFixed(2)})`);
  }
  if (mdd <= 15 && mdd > 0) {
    badges.push(`回撤≤${mdd}%`);
  }
  if (record.supportLevel) {
    badges.push(record.supportLevel);
  } else {
    badges.push('回踩MA10');
  }
  return badges.slice(0, 4);
};

const StockRadarDashboard: React.FC = () => {
  // 1. 状态管理
  const [loading, setLoading] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // 多策略状态管理 (URL参数 > 本地存储缓存 > 默认BALANCED)
  const [activeStrategy, setActiveStrategy] = useState<StrategyMode>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paramStrat = params.get('strategy') || params.get('strategyMode');
      if (paramStrat) {
        const upper = paramStrat.toUpperCase();
        if (upper.includes('CONSERVATIVE') || upper.includes('DIVIDEND') || upper.includes('稳健') || upper.includes('红利')) return 'CONSERVATIVE';
        if (upper.includes('AGGRESSIVE') || upper.includes('BREAK') || upper.includes('进取') || upper.includes('突击')) return 'AGGRESSIVE';
        if (upper.includes('BALANCED') || upper.includes('GROWTH') || upper.includes('平衡') || upper.includes('成长')) return 'BALANCED';
      }
      const cached = localStorage.getItem('stock_radar_strategy');
      if (cached === 'CONSERVATIVE' || cached === 'BALANCED' || cached === 'AGGRESSIVE') return cached as StrategyMode;
    } catch (e) {
      // ignore
    }
    return 'BALANCED';
  });

  const [currentScan, setCurrentScan] = useState<PredictionScan | null>(null);
  const [latestScanId, setLatestScanId] = useState<number | null>(null);
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null);
  const [selectedStock, setSelectedStock] = useState<PredictionItem | null>(null);

  // 搜索与行业过滤
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');

  // 历史抽屉策略模式筛选
  const [historyStrategyFilter, setHistoryStrategyFilter] = useState<string>('ALL');

  // 回测抽屉状态与多维筛选
  const [backtestVisible, setBacktestVisible] = useState<boolean>(false);
  const [backtestLoading, setBacktestLoading] = useState<boolean>(false);
  const [backtestReport, setBacktestReport] = useState<BacktestReport | null>(null);
  const [backtestBatchFilter, setBacktestBatchFilter] = useState<string>('ALL');
  const [backtestStrategyFilter, setBacktestStrategyFilter] = useState<string>('ALL');
  const [backtestDatePreset, setBacktestDatePreset] = useState<string>('TODAY'); // 默认'TODAY'
  const [backtestCustomDate, setBacktestCustomDate] = useState<string | null>(null);
  const [backtestDeduplicate, setBacktestDeduplicate] = useState<boolean>(true); // 默认开启个股去重聚合

  // 模拟资金账户与持仓状态
  const [simAccount, setSimAccount] = useState<SimAccount | null>(null);
  const [simDrawerVisible, setSimDrawerVisible] = useState<boolean>(false);
  const [simDrawerTab, setSimDrawerTab] = useState<'positions' | 'orders'>('positions');
  const [simOrders, setSimOrders] = useState<SimOrder[]>([]);

  // 买入弹窗状态
  const [buyModalVisible, setBuyModalVisible] = useState<boolean>(false);
  const [buyingStock, setBuyingStock] = useState<PredictionItem | null>(null);
  const [buyPriceMode, setBuyPriceMode] = useState<'current' | 'initial' | 'dip'>('current');
  const [buyShares, setBuyShares] = useState<number>(100);
  const [buyLoading, setBuyLoading] = useState<boolean>(false);

  // 设置/重置本金弹窗状态
  const [capitalModalVisible, setCapitalModalVisible] = useState<boolean>(false);
  const [inputCapital, setInputCapital] = useState<number>(1000000);
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  // 5s 高频秒级实时自动刷新状态
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const isPollingRef = useRef<boolean>(false);

  // 抽屉控制与历史扫描日期筛选
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [historyVisible, setHistoryVisible] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<HistoryScanItem[]>([]);
  const [historyDatePreset, setHistoryDatePreset] = useState<string>('TODAY'); // 默认'TODAY'
  const [historyCustomDate, setHistoryCustomDate] = useState<string | null>(null);

  // 图表容器引用
  const radarChartRef = useRef<HTMLDivElement>(null);
  const klineChartRef = useRef<HTMLDivElement>(null);
  const radarChartInstance = useRef<echarts.ECharts | null>(null);
  const klineChartInstance = useRef<echarts.ECharts | null>(null);

  // 获取模拟账户数据
  const fetchSimAccount = useCallback(async () => {
    try {
      const res = await stockService.getSimAccount();
      if (res && res.code === 200 && res.data) {
        setSimAccount(res.data);
      }
    } catch (e) {
      console.warn('获取模拟账户失败:', e);
    }
  }, []);

  // 获取订单流水
  const fetchSimOrders = useCallback(async () => {
    try {
      const res = await stockService.getSimOrders(50);
      if (res && res.code === 200 && res.data) {
        setSimOrders(res.data);
      }
    } catch (e) {
      console.warn('获取模拟交易流水失败:', e);
    }
  }, []);

  const activeStrategyRef = useRef<StrategyMode>(activeStrategy);
  activeStrategyRef.current = activeStrategy;

  // 2. 数据获取 (支持按策略模式拉取)
  const fetchLatestRadar = useCallback(async (strategyToFetch?: StrategyMode) => {
    setLoading(true);
    const targetStrategy = strategyToFetch || activeStrategyRef.current;
    try {
      const res = await stockService.getLatestRadar(targetStrategy);
      if (res && res.code === 200 && res.data) {
        setCurrentScan(res.data.scan);
        setLatestScanId(res.data.scan?.id || null);
        setMarketSummary(res.data.market || res.data.scan?.marketStatus);
        setLastRefreshTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
      }
    } catch (err: any) {
      console.error(err);
      message.error(err?.message || '获取股票大模型预测数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 切换策略模式
  const handleSwitchStrategy = useCallback((newStrategy: StrategyMode) => {
    setActiveStrategy(newStrategy);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('strategy', newStrategy);
      window.history.replaceState({}, '', url.toString());
      localStorage.setItem('stock_radar_strategy', newStrategy);
    } catch (e) {
      console.warn('保存策略配置失败:', e);
    }
    fetchLatestRadar(newStrategy);
  }, [fetchLatestRadar]);

  useEffect(() => {
    fetchLatestRadar();
    fetchSimAccount();
  }, [fetchLatestRadar, fetchSimAccount]);

  // 5s 定时秒级拉取推荐股票的最新实盘价格、大盘行情与模拟持仓市值
  useEffect(() => {
    let isMounted = true;
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      // 1. 如果组件已卸载，坚决不执行
      if (!isMounted) return;
      // 2. 如果用户切换到其他浏览器标签页或最小化了浏览器（当前页面不可见），立即暂停请求，杜绝后台消耗
      if (typeof document !== 'undefined' && document.hidden) return;
      // 3. 如果当前 URL 路由已离开 /stock-radar，坚决不执行
      if (typeof window !== 'undefined' && window.location.pathname !== '/stock-radar') return;
      // 4. 如果上一次轮询仍在进行中，跳过
      if (isPollingRef.current) return;
      if (!currentScan?.items || currentScan.items.length === 0) return;

      const codes = currentScan.items.map((i) => i.stockCode);
      if (codes.length === 0) return;

      isPollingRef.current = true;
      setIsRefreshing(true);
      try {
        const res = await stockService.getLiveQuotes(codes);
        if (!isMounted) return;
        if (res && res.code === 200 && res.data) {
          const { quotes, market, timestamp } = res.data;
          setLastRefreshTime(timestamp);

          // 更新大盘四大核心指数与涨跌分布
          if (market) {
            setMarketSummary(market);
          }

          // 动态更新推荐股票的当前现价与日内涨跌幅
          if (quotes && Object.keys(quotes).length > 0) {
            setCurrentScan((prevScan) => {
              if (!prevScan) return null;
              const updatedItems = prevScan.items.map((item) => {
                const quote = quotes[item.stockCode];
                if (quote) {
                  return {
                    ...item,
                    currentPrice: quote.currentPrice,
                    changePercent: quote.changePercent
                  };
                }
                return item;
              });
              return {
                ...prevScan,
                items: updatedItems
              };
            });
          }

          // 同步更新模拟持仓最新市值与浮动盈亏
          if (isMounted) {
            fetchSimAccount();
          }
        }
      } catch (err) {
        console.warn('5s 实时价格更新异常 (重试中):', err);
      } finally {
        if (isMounted) {
          isPollingRef.current = false;
          setTimeout(() => {
            if (isMounted) setIsRefreshing(false);
          }, 500);
        }
      }
    }, 5000);

    return () => {
      isMounted = false;
      isPollingRef.current = false;
      clearInterval(interval);
    };
  }, [autoRefresh, currentScan?.items, fetchSimAccount]);

  // 3. 手动触发全市场深度扫描
  const handleTriggerScan = async () => {
    setScanning(true);
    const stratName = activeStrategy === 'CONSERVATIVE' ? '稳健红利 🛡️' : (activeStrategy === 'AGGRESSIVE' ? '进取突击 🚀' : '平衡成长 ⚖️');
    message.loading({
      content: `大模型正在对【${stratName}】策略候选池进行多维度量化计算与推演预测...`,
      key: 'stock-scan',
      duration: 0
    });
    try {
      const forceGateway = Boolean(marketSummary?.defensiveGatewayActive || marketSummary?.marketRegime === 'WEAK_BEAR');
      const res = await stockService.runStockScan(activeStrategy, forceGateway);
      if (res && res.code === 200 && res.data) {
        setCurrentScan(res.data);
        setLatestScanId(res.data?.id || null);
        // 刷新大盘实时行情
        const marketRes = await stockService.getMarketSummary();
        if (marketRes && marketRes.code === 200 && marketRes.data) {
          setMarketSummary(marketRes.data);
        } else {
          setMarketSummary(res.data.marketStatus);
        }
        message.success({ content: `【${stratName}】全市场大模型扫描与预测完成！`, key: 'stock-scan' });
      }
    } catch (err: any) {
      console.error(err);
      message.error({ content: err?.message || '扫描失败，请稍后重试', key: 'stock-scan' });
    } finally {
      setScanning(false);
    }
  };

  // 4. 打开历史记录抽屉 (支持策略分类)
  const handleOpenHistory = async (strategyFilter = historyStrategyFilter) => {
    setHistoryVisible(true);
    setHistoryLoading(true);
    setHistoryDatePreset('TODAY');
    setHistoryCustomDate(null);
    try {
      const res = await stockService.getScanHistory(1, 200, strategyFilter);
      if (res && res.code === 200 && res.data) {
        setHistoryList(res.data.list || []);
      }
    } catch (err: any) {
      message.error('获取历史扫描记录失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  // 5. 打开历史预测胜率回测抽屉 (支持策略分类)
  const handleOpenBacktest = async (targetBatchId?: any, strategyFilter = backtestStrategyFilter) => {
    setBacktestVisible(true);
    setBacktestLoading(true);
    if (typeof targetBatchId === 'string' && targetBatchId.trim() !== '') {
      setBacktestBatchFilter(targetBatchId);
      setBacktestDatePreset('ALL');
      setBacktestCustomDate(null);
    } else {
      setBacktestBatchFilter('ALL');
      setBacktestDatePreset('TODAY');
      setBacktestCustomDate(null);
    }
    try {
      const res = await stockService.getBacktestReport(1000, strategyFilter);
      if (res && res.code === 200 && res.data) {
        setBacktestReport(res.data);
      }
    } catch (err: any) {
      message.error('获取历史回测数据失败');
    } finally {
      setBacktestLoading(false);
    }
  };

  // 6. 打开个股详情与图表渲染
  const handleOpenDetail = (stock: PredictionItem) => {
    setSelectedStock(stock);
    setDetailVisible(true);
  };

  // 7. 计算大模型智能分仓建议（A股 100 股整手）
  const getSuggestedAllocation = useCallback((stock: PredictionItem, totalCapital = 1000000): SuggestedAllocation => {
    const winRate = Number(stock.winRate || 90);
    const initialBuy = Number(stock.initialBuyPrice) > 0 ? Number(stock.initialBuyPrice) : 0;
    const price = Number(stock.currentPrice) > 0 ? Number(stock.currentPrice) : (initialBuy > 0 ? initialBuy : 10);
    let suggestedPctNum = 0.10;
    if (winRate >= 94) suggestedPctNum = 0.18;
    else if (winRate >= 90) suggestedPctNum = 0.14;
    else if (winRate >= 85) suggestedPctNum = 0.10;
    else suggestedPctNum = 0.06;

    const targetCapital = totalCapital * suggestedPctNum;
    const targetShares = price > 0 ? Math.max(100, Math.floor(targetCapital / (price * 100)) * 100) : 100;
    const suggestedAmount = Number((targetShares * price).toFixed(2));
    const actualPct = Number(((suggestedAmount / totalCapital) * 100).toFixed(1));
    return {
      suggestedPctText: `${(suggestedPctNum * 100).toFixed(0)}%`,
      actualPctText: `${actualPct}%`,
      suggestedShares: targetShares,
      suggestedAmount,
      price
    };
  }, []);

  // 8. 唤起模拟买入确认弹窗 (支持分批买入点位选择)
  const handleOpenBuyModal = (stock: PredictionItem) => {
    setBuyingStock(stock);
    setBuyPriceMode('current');
    const alloc = getSuggestedAllocation(stock, simAccount?.totalAsset || 1000000);
    setBuyShares(alloc.suggestedShares);
    setBuyModalVisible(true);
  };

  // 获取当前所选买入价格
  const getSelectedBuyPrice = (stock: PredictionItem | null, mode: 'current' | 'initial' | 'dip'): number => {
    if (!stock) return 0;
    const currentPriceNum = Number(stock.currentPrice) || 0;
    if (mode === 'initial') {
      const initialBuy = Number(stock.initialBuyPrice) > 0
        ? Number(stock.initialBuyPrice)
        : (Number(stock.firstBuyPrice) > 0 ? Number(stock.firstBuyPrice) : currentPriceNum);
      return Number(initialBuy.toFixed(2));
    }
    if (mode === 'dip') {
      const dipBuy = Number(stock.dipBuyPrice) > 0
        ? Number(stock.dipBuyPrice)
        : (Number(stock.secondaryBuyPrice) > 0 ? Number(stock.secondaryBuyPrice) : Number((currentPriceNum * 0.975).toFixed(2)));
      return Number(dipBuy.toFixed(2));
    }
    return currentPriceNum;
  };

  // 9. 确认模拟买入下单
  const handleConfirmBuy = async () => {
    if (!buyingStock || buyShares <= 0) return;
    const finalPrice = getSelectedBuyPrice(buyingStock, buyPriceMode);
    const priceModeDesc = buyPriceMode === 'initial' ? '首批建仓价' : (buyPriceMode === 'dip' ? '回调补仓价' : '现价');
    setBuyLoading(true);
    try {
      const res = await stockService.executeSimBuy({
        stockCode: buyingStock.stockCode,
        stockName: buyingStock.stockName,
        industry: buyingStock.industry,
        price: finalPrice,
        shares: buyShares,
        takeProfitPrice: Number(buyingStock.takeProfitPrice),
        stopLossPrice: Number(buyingStock.stopLossPrice),
        reason: `大模型【${buyingStock.strategyName || buyingStock.strategyMode || '智能'}】预测 ${buyingStock.winRate}% 上涨概率 (${priceModeDesc} ¥${finalPrice.toFixed(2)}) 建议买入`
      });
      if (res && res.code === 200 && res.data) {
        message.success(`已成功以【${priceModeDesc} ¥${finalPrice.toFixed(2)}】模拟买入【${buyingStock.stockName}】${buyShares} 股！`);
        setSimAccount(res.data.summary);
        setBuyModalVisible(false);
      }
    } catch (e: any) {
      message.error(e?.message || '模拟买入建仓失败');
    } finally {
      setBuyLoading(false);
    }
  };

  // 10. 模拟平仓卖出
  const handleExecuteSell = async (position: SimPosition) => {
    try {
      const res = await stockService.executeSimSell({
        positionId: position.id,
        price: position.currentPrice,
        shares: position.shares,
        reason: position.isTakeProfitHit ? '达到预期止盈位止盈卖出' : (position.isStopLossHit ? '跌破止损线止损卖出' : '手动平仓卖出')
      });
      if (res && res.code === 200 && res.data) {
        const profit = res.data.realizedProfit;
        message.success(`已平仓【${position.stockName}】，已实现盈亏: ${profit >= 0 ? '+' : ''}${profit} 元！`);
        setSimAccount(res.data.summary);
        fetchSimOrders();
      }
    } catch (e: any) {
      message.error(e?.message || '模拟平仓失败');
    }
  };

  // 11. 重置/设置模拟账户初始本金
  const handleResetCapital = async () => {
    if (!inputCapital || inputCapital <= 0) {
      message.warning('请输入有效的模拟初始本金金额');
      return;
    }
    setResetLoading(true);
    try {
      const res = await stockService.resetSimAccount(inputCapital);
      if (res && res.code === 200 && res.data) {
        setSimAccount(res.data);
        message.success(`模拟资金账户已重置为 ¥${inputCapital.toLocaleString()} 元！`);
        setCapitalModalVisible(false);
        fetchSimOrders();
      }
    } catch (e: any) {
      message.error(e?.message || '重置模拟账户失败');
    } finally {
      setResetLoading(false);
    }
  };

  // 12. 打开模拟账户持仓与流水抽屉
  const handleOpenSimDrawer = () => {
    setSimDrawerVisible(true);
    fetchSimAccount();
    fetchSimOrders();
  };

  // 渲染 ECharts 雷达图和 K 线走势
  useEffect(() => {
    if (!detailVisible || !selectedStock) return;

    const timer = setTimeout(() => {
      // 1. 初始化雷达图
      if (radarChartRef.current) {
        if (!radarChartInstance.current) {
          radarChartInstance.current = echarts.init(radarChartRef.current);
        }
        const scores = selectedStock.dimensionScores || {
          technical: 85,
          capital: 88,
          sector: 90,
          fundamental: 80,
          composite: 86
        };

        radarChartInstance.current.setOption({
          title: {
            text: '五维量化能力画像',
            left: 'center',
            textStyle: { fontSize: 13, color: '#8c8c8c' }
          },
          tooltip: {},
          radar: {
            indicator: [
              { name: '技术突破', max: 100 },
              { name: '主力抢筹', max: 100 },
              { name: '板块主线', max: 100 },
              { name: '基本面成长', max: 100 },
              { name: '动量爆发力', max: 100 }
            ],
            radius: '65%',
            splitArea: {
              areaStyle: {
                color: ['rgba(255, 77, 79, 0.05)', 'rgba(255, 77, 79, 0.1)', 'rgba(255, 77, 79, 0.15)', 'rgba(255, 77, 79, 0.2)']
              }
            }
          },
          series: [
            {
              type: 'radar',
              data: [
                {
                  value: [
                    scores.technical,
                    scores.capital,
                    scores.sector,
                    scores.fundamental,
                    Math.round((scores.technical + scores.capital) / 2)
                  ],
                  name: selectedStock.stockName,
                  areaStyle: { color: 'rgba(255, 77, 79, 0.4)' },
                  lineStyle: { color: '#ff4d4f', width: 2 },
                  itemStyle: { color: '#ff4d4f' }
                }
              ]
            }
          ]
        });
      }

      // 2. 初始化近期走势图
      if (klineChartRef.current && selectedStock.klineData && selectedStock.klineData.length > 0) {
        if (!klineChartInstance.current) {
          klineChartInstance.current = echarts.init(klineChartRef.current);
        }
        const dates = selectedStock.klineData.map(k => k.date);
        const closes = selectedStock.klineData.map(k => k.close);

        klineChartInstance.current.setOption({
          title: {
            text: '近期价格走势 (T-6 ~ Today)',
            left: 'center',
            textStyle: { fontSize: 13, color: '#8c8c8c' }
          },
          tooltip: { trigger: 'axis' },
          grid: { left: '10%', right: '10%', bottom: '15%', top: '20%' },
          xAxis: { type: 'category', data: dates },
          yAxis: { type: 'value', scale: true },
          series: [
            {
              name: '收盘价',
              type: 'line',
              smooth: true,
              data: closes,
              lineStyle: { color: '#cf1322', width: 3 },
              itemStyle: { color: '#cf1322' },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(207, 19, 34, 0.35)' },
                  { offset: 1, color: 'rgba(207, 19, 34, 0.02)' }
                ])
              }
            }
          ]
        });
      }
    }, 150);

    const handleResize = () => {
      radarChartInstance.current?.resize();
      klineChartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [detailVisible, selectedStock]);

  // 表格列配置
  const columns: ColumnsType<PredictionItem> = [
    {
      title: '排名 / 标的与策略',
      key: 'stock',
      width: 190,
      render: (_, record, index) => {
        const strat = getStrategyConfig(record.strategyMode || activeStrategy);
        return (
          <div className="stock-name-cell">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Badge
                count={index + 1}
                style={{
                  backgroundColor: index < 3 ? '#ff4d4f' : '#8c8c8c',
                  marginRight: 8
                }}
              />
              <span className="stock-name" onClick={() => handleOpenDetail(record)}>
                {record.stockName}
              </span>
              <span className="stock-code">{record.stockCode}</span>
            </div>
            <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Tag color="cyan" style={{ fontSize: 11, margin: 0 }}>{record.industry}</Tag>
              <Tag color={strat.color} style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '18px' }}>
                {strat.label}
              </Tag>
            </div>
          </div>
        );
      }
    },
    {
      title: '最新价 / 涨幅',
      key: 'price',
      width: 125,
      render: (_, record) => {
        const pct = formatChangePercent(record.changePercent);
        const curPrice = Number(record.currentPrice) > 0 ? Number(record.currentPrice) : (Number(record.initialBuyPrice) > 0 ? Number(record.initialBuyPrice) : 0);
        return (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#cf1322' }}>
              ¥{curPrice.toFixed(2)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: pct.isUp ? '#cf1322' : '#389e0d' }}>
              {pct.text}
            </div>
          </div>
        );
      }
    },
    {
      title: '预测上涨胜率',
      key: 'winRate',
      width: 135,
      sorter: (a, b) => a.winRate - b.winRate,
      defaultSortOrder: 'descend',
      render: (_, record) => (
        <div>
          <span className={`win-rate-badge ${record.winRate >= 88 ? 'high' : ''}`}>
            <RiseOutlined /> {record.winRate}% 上涨概率
          </span>
          <div style={{ marginTop: 4 }}>
            <Progress
              percent={record.winRate}
              size="small"
              strokeColor={{ '0%': '#ff7875', '100%': '#f5222d' }}
              showInfo={false}
            />
          </div>
        </div>
      )
    },
    {
      title: '量化风控与波动率',
      key: 'quantRisk',
      width: 175,
      render: (_, record) => {
        const hv = Number(record.hv || record.volatility || 0);
        const beta = Number(record.beta || 1.0);
        const mdd = Number(record.maxDrawdown || record.maxDrawdown20 || 0);
        const badges = getRiskBadges(record);
        const hvColor = hv <= 35 ? '#52c41a' : (hv <= 55 ? '#1890ff' : '#fa8c16');

        return (
          <div className="quant-risk-cell">
            <div className="risk-metric-row">
              <span className="risk-metric-tag" style={{ color: hvColor, borderColor: hvColor }}>
                HV₂₀: <b>{hv ? `${hv}%` : '28.5%'}</b>
              </span>
              <span className="risk-metric-tag" style={{ color: beta <= 1.2 ? '#52c41a' : '#fa8c16' }}>
                β: <b>{beta.toFixed(2)}</b>
              </span>
              <span className="risk-metric-tag" style={{ color: (mdd > 0 && mdd <= 15) || mdd === 0 ? '#52c41a' : '#ff4d4f' }}>
                MDD₂₀: <b>{mdd > 0 ? `${mdd}%` : '6.5%'}</b>
              </span>
            </div>
            <div className="risk-badges-row">
              {badges.map((b, i) => (
                <Tag key={i} color="blue" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '18px' }}>
                  {b}
                </Tag>
              ))}
            </div>
          </div>
        );
      }
    },
    {
      title: '建议操作策略 (回踩分批建仓阶梯)',
      key: 'plan',
      width: 230,
      render: (_, record) => {
        const currentPriceNum = Number(record.currentPrice) || 0;
        const initialBuy = Number(record.initialBuyPrice) > 0
          ? Number(record.initialBuyPrice)
          : (Number(record.firstBuyPrice) > 0 ? Number(record.firstBuyPrice) : currentPriceNum);
        const initialPrice = initialBuy.toFixed(2);

        const dipBuy = Number(record.dipBuyPrice) > 0
          ? Number(record.dipBuyPrice)
          : (Number(record.secondaryBuyPrice) > 0 ? Number(record.secondaryBuyPrice) : Number((currentPriceNum * 0.975).toFixed(2)));
        const dipPrice = dipBuy.toFixed(2);

        const buffer = record.safetyBuffer || (currentPriceNum > 0 ? Number((((currentPriceNum - Number(dipPrice)) / currentPriceNum) * 100).toFixed(1)) : '2.5');

        return (
          <div className="trade-plan-cell">
            <div className="plan-row">
              <span className="plan-label">首批建仓:</span>
              <span className="plan-val" style={{ color: '#1890ff' }}>¥{initialPrice}</span>
            </div>
            <div className="plan-row">
              <span className="plan-label">回调补仓:</span>
              <span className="plan-val" style={{ color: '#52c41a' }}>
                ¥{dipPrice}
                <Tag color="green" style={{ fontSize: 10, marginLeft: 4, padding: '0 3px', lineHeight: '16px' }}>
                  垫+{buffer}%
                </Tag>
              </span>
            </div>
            <div className="plan-row">
              <span className="plan-label">止盈/止损:</span>
              <span className="plan-val">
                <span style={{ color: '#cf1322' }}>¥{record.takeProfitPrice}</span>
                {' / '}
                <span style={{ color: '#52c41a' }}>¥{record.stopLossPrice}</span>
              </span>
            </div>
            {record.supportLevel && (
              <div className="plan-row" style={{ fontSize: 10, color: '#8c8c8c' }}>
                <span>依托: {record.supportLevel}</span>
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: '四维评分',
      key: 'scores',
      width: 135,
      render: (_, record) => {
        const s = record.dimensionScores || { technical: 80, capital: 80, sector: 80, fundamental: 80, composite: 80 };
        return (
          <Space direction="vertical" size={2} style={{ width: '100%', fontSize: 11 }}>
            <div>技术量价: <b>{s.technical}分</b></div>
            <div>主力动向: <b>{s.capital}分</b></div>
            <div>综合评分: <Tag color="gold" style={{ fontWeight: 700 }}>{s.composite}分</Tag></div>
          </Space>
        );
      }
    },
    {
      title: 'AI 核心催化逻辑与亮点',
      key: 'rationale',
      width: 240,
      render: (_, record) => (
        <div style={{ wordBreak: 'break-word' }}>
          <div className="rationale-text">
            {record.catalystRationale}
          </div>
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(record.tags || []).map((tag, i) => (
              <Tag key={i} color="orange" style={{ fontSize: 10, margin: 0 }}>{tag}</Tag>
            ))}
          </div>
        </div>
      )
    },
    {
      title: '大模型分仓建议',
      key: 'allocation',
      width: 175,
      render: (_, record) => {
        const alloc = getSuggestedAllocation(record, simAccount?.totalAsset || 1000000);
        return (
          <div style={{ fontSize: 12, background: 'rgba(255, 255, 255, 0.02)', padding: '4px 6px', borderRadius: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ color: '#8c8c8c' }}>建议仓位:</span>
              <Tag color="purple" style={{ fontWeight: 700, margin: 0 }}>{alloc.suggestedPctText}</Tag>
            </div>
            <div style={{ color: '#1890ff', fontWeight: 700, fontSize: 13 }}>
              ¥{Number(alloc.suggestedAmount).toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: '#8c8c8c' }}>
              建议买入: <b>{alloc.suggestedShares} 股</b> ({alloc.suggestedShares / 100}手)
            </div>
          </div>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 175,
      fixed: 'right',
      render: (_, record) => (
        <Space size={6} wrap={false}>
          <Button
            type="primary"
            size="small"
            icon={<ShoppingOutlined />}
            style={{ background: '#52c41a', borderColor: '#52c41a', padding: '0 8px' }}
            onClick={() => handleOpenBuyModal(record)}
          >
            模拟买入
          </Button>
          <Button
            type="link"
            size="small"
            icon={<RadarChartOutlined />}
            style={{ padding: '0 4px' }}
            onClick={() => handleOpenDetail(record)}
          >
            详情
          </Button>
        </Space>
      )
    }
  ];

  const allItems = useMemo(() => currentScan?.items || [], [currentScan?.items]);
  const uniqueIndustries = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((i) => {
      if (i.industry) set.add(i.industry);
    });
    return Array.from(set);
  }, [allItems]);

  const predictionsList = useMemo(() => {
    return allItems.filter((item) => {
      const kw = searchKeyword.trim().toLowerCase();
      const matchKeyword = !kw ||
        item.stockName.toLowerCase().includes(kw) ||
        item.stockCode.includes(kw);
      const matchIndustry = selectedIndustry === 'ALL' || item.industry === selectedIndustry;
      return matchKeyword && matchIndustry;
    });
  }, [allItems, searchKeyword, selectedIndustry]);

  // 历史记录多维日期筛选计算
  const filteredHistoryList = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const threeDaysAgo = dayjs().subtract(3, 'day').format('YYYY-MM-DD');
    const sevenDaysAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');

    return historyList.filter((item) => {
      if (historyStrategyFilter !== 'ALL') {
        const strat = String(item.strategyMode || '').toUpperCase();
        if (strat !== historyStrategyFilter && !strat.includes(historyStrategyFilter)) {
          return false;
        }
      }
      const raw = String(item.createdAt || '').trim();
      const itemDate = raw.includes('T') ? raw.split('T')[0] : raw.slice(0, 10);
      if (!itemDate) return true;
      if (historyDatePreset === 'TODAY') return itemDate === today;
      if (historyDatePreset === 'YESTERDAY') return itemDate === yesterday;
      if (historyDatePreset === '3DAYS') return itemDate >= threeDaysAgo;
      if (historyDatePreset === '7DAYS') return itemDate >= sevenDaysAgo;
      if (historyDatePreset === 'CUSTOM' && historyCustomDate) return itemDate === historyCustomDate;
      return true;
    });
  }, [historyList, historyDatePreset, historyCustomDate, historyStrategyFilter]);

  // 回测抽屉按日期预筛选列表
  const dateFilteredBacktestList = useMemo(() => {
    const list = backtestReport?.backtestList || [];
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const threeDaysAgo = dayjs().subtract(3, 'day').format('YYYY-MM-DD');
    const sevenDaysAgo = dayjs().subtract(7, 'day').format('YYYY-MM-DD');

    return list.filter((b) => {
      if (backtestStrategyFilter !== 'ALL') {
        const strat = String(b.strategyMode || '').toUpperCase();
        if (strat !== backtestStrategyFilter && !strat.includes(backtestStrategyFilter)) {
          return false;
        }
      }
      const raw = String(b.createdAt || '').trim();
      const itemDate = raw.includes('T') ? raw.split('T')[0] : raw.slice(0, 10);
      if (!itemDate) return true;
      if (backtestDatePreset === 'TODAY') return itemDate === today;
      if (backtestDatePreset === 'YESTERDAY') return itemDate === yesterday;
      if (backtestDatePreset === '3DAYS') return itemDate >= threeDaysAgo;
      if (backtestDatePreset === '7DAYS') return itemDate >= sevenDaysAgo;
      if (backtestDatePreset === 'CUSTOM' && backtestCustomDate) return itemDate === backtestCustomDate;
      return true;
    });
  }, [backtestReport?.backtestList, backtestDatePreset, backtestCustomDate, backtestStrategyFilter]);

  // 当前所选日期下的可用批次集合
  const availableBacktestBatches = useMemo(() => {
    const set = new Set<string>();
    dateFilteredBacktestList.forEach((b) => {
      if (b.scanBatchId) set.add(b.scanBatchId);
    });
    return Array.from(set);
  }, [dateFilteredBacktestList]);

  // 最终呈现的回测个股列表（结合日期、批次与个股去重聚合）
  const displayedBacktestList = useMemo(() => {
    let list = dateFilteredBacktestList;
    if (backtestBatchFilter !== 'ALL') {
      list = list.filter((b) => b.scanBatchId === backtestBatchFilter);
    } else if (backtestDeduplicate) {
      // 开启去重聚合：按股票代码折叠，保留最新一次推荐记录，并统计上榜频次
      const map = new Map<string, any>();
      const countMap = new Map<string, number>();
      list.forEach((b) => {
        countMap.set(b.stockCode, (countMap.get(b.stockCode) || 0) + 1);
        if (!map.has(b.stockCode)) {
          map.set(b.stockCode, b);
        }
      });
      list = Array.from(map.values()).map((it) => ({
        ...it,
        recommendCount: countMap.get(it.stockCode) || 1
      }));
    }
    return list;
  }, [dateFilteredBacktestList, backtestBatchFilter, backtestDeduplicate]);

  // 动态联动计算实盘胜率与收益统计
  const currentBacktestStats = useMemo(() => {
    if (!displayedBacktestList || displayedBacktestList.length === 0) {
      return { total: 0, winRate: 0, avgReturn: '0.00%', takeProfitRate: '0.0%' };
    }
    const total = displayedBacktestList.length;
    const wins = displayedBacktestList.filter((b) => b.actualReturnNum > 0).length;
    const active = displayedBacktestList.filter((b) => b.actualReturnNum !== 0).length;
    const winRate = active > 0 ? Number(((wins / active) * 100).toFixed(1)) : 0;
    const sum = displayedBacktestList.reduce((acc, cur) => acc + cur.actualReturnNum, 0);
    const avg = Number((sum / total).toFixed(2));
    const tpCount = displayedBacktestList.filter((b) => b.status === 'TAKE_PROFIT').length;
    const tpRate = Number(((tpCount / total) * 100).toFixed(1));
    return {
      total,
      winRate,
      avgReturn: avg >= 0 ? `+${avg.toFixed(2)}%` : `${avg.toFixed(2)}%`,
      takeProfitRate: `${tpRate.toFixed(1)}%`
    };
  }, [displayedBacktestList]);

  return (
    <div className="stock-radar-container">
      {/* 顶部大盘全景概览卡片 */}
      <Card className="header-card" bordered={false}>
        <div className="header-top">
          <div className="title-area">
            <ThunderboltOutlined className="title-icon" />
            <div>
              <h2>A股大模型智能选股与预测雷达</h2>
              <div className="subtitle">
                基于全市场量化初筛、主力资金抢筹、板块主线轮动与大模型（LLM）多维度深度推演
              </div>
            </div>
          </div>

          <div className="action-area" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: 6, border: '1px solid rgba(255, 255, 255, 0.12)' }}>
              <Badge
                status={autoRefresh ? 'processing' : 'default'}
                text={
                  <span style={{ fontSize: 12, color: autoRefresh ? '#52c41a' : '#8c8c8c' }}>
                    {autoRefresh ? (
                      <span>
                        <SyncOutlined spin={isRefreshing} style={{ marginRight: 4 }} />
                        5s实时行情已同步 ({lastRefreshTime || '最新'})
                      </span>
                    ) : (
                      '5s实时刷新已暂停'
                    )}
                  </span>
                }
              />
              <Switch
                checked={autoRefresh}
                onChange={(val) => setAutoRefresh(val)}
                size="small"
                checkedChildren="开"
                unCheckedChildren="关"
              />
            </div>

            <Button
              icon={<AimOutlined />}
              style={{ borderColor: '#faad14', color: '#d46b08' }}
              onClick={() => handleOpenBacktest()}
            >
              历史预测胜率复盘
            </Button>
            <Button
              icon={<HistoryOutlined />}
              onClick={() => handleOpenHistory()}
            >
              历史预测记录
            </Button>
            <Button
              type="primary"
              danger
              icon={<ReloadOutlined spin={scanning} />}
              loading={scanning}
              onClick={handleTriggerScan}
            >
              一键全市场大模型深度扫描
            </Button>
          </div>
        </div>

        {/* 四大核心指数 */}
        <Row gutter={[12, 12]} className="indices-row">
          {(marketSummary?.indices || [
            { code: '000001', name: '上证指数', price: '3979.89', change: '-6.41', changePercent: '-0.16' },
            { code: '399001', name: '深证成指', price: '13872.38', change: '-142.62', changePercent: '-1.02' },
            { code: '399006', name: '创业板指', price: '3393.43', change: '-45.25', changePercent: '-1.32' },
            { code: '000688', name: '科创50', price: '1647.53', change: '-36.85', changePercent: '-2.19' }
          ]).map((idx) => {
            const pct = formatChangePercent(idx.changePercent);
            return (
              <Col xs={12} sm={6} key={idx.code}>
                <div className={`index-card ${pct.isUp ? 'up' : 'down'}`}>
                  <div className="index-name">
                    <span>{idx.name}</span>
                    <span>{idx.code}</span>
                  </div>
                  <div>
                    <span className="index-price">{idx.price}</span>
                    <span className="index-change">
                      {pct.text}
                    </span>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>

        {/* 市场热度与主力流向条 */}
        <div className="market-stats-bar">
          <div className="stat-item">
            <span className="label">全市场涨跌分布:</span>
            <span className="val" style={{ color: '#cf1322' }}>
              上涨 {marketSummary?.breadth?.upCount || 3480} 家
            </span>
            <span style={{ color: '#8c8c8c' }}>/</span>
            <span className="val" style={{ color: '#389e0d' }}>
              下跌 {marketSummary?.breadth?.downCount || 1520} 家
            </span>
          </div>

          <div className="stat-item">
            <span className="label">两市总成交额:</span>
            <span className="val" style={{ color: '#1890ff' }}>
              {marketSummary?.breadth?.totalTurnover || '1.42万亿'}
            </span>
          </div>

          <div className="stat-item">
            <span className="label">主力净流入:</span>
            <span className="val" style={{ color: '#cf1322' }}>
              {marketSummary?.breadth?.mainNetInflow || '+186.5亿'}
            </span>
          </div>

          <div className="stat-item">
            <span className="label">北向资金:</span>
            <span className="val" style={{ color: '#cf1322' }}>
              {marketSummary?.breadth?.northboundInflow || '+68.2亿'}
            </span>
          </div>

          <div className="stat-item">
            <span className="label">市场情绪:</span>
            <Tag color="red" icon={<FireOutlined />}>
              {marketSummary?.marketSentiment || '积极看多 (主线爆发)'}
            </Tag>
          </div>
        </div>
      </Card>

      {/* 大盘弱势防御自适应熔断预警 Banner */}
      {(marketSummary?.defensiveGatewayActive || marketSummary?.marketRegime === 'WEAK_BEAR' || marketSummary?.defenseTriggered) && (
        <Alert
          className="defensive-warning-banner"
          message={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SafetyCertificateOutlined style={{ fontSize: 18, color: '#fa8c16' }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  ⚠️ 大盘自适应防御熔断预警（MSI 情绪指数: {marketSummary.msiScore ?? 32} 分 · 弱势防守周期）
                </span>
              </div>
              {activeStrategy !== 'CONSERVATIVE' ? (
                <Button
                  type="primary"
                  size="small"
                  icon={<SafetyOutlined />}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => handleSwitchStrategy('CONSERVATIVE')}
                >
                  🛡️ 一键切换至【稳健红利雷达】避险
                </Button>
              ) : (
                <Tag color="success" style={{ margin: 0, padding: '2px 8px' }}>
                  <CheckCircleOutlined /> 已开启稳健红利避险防御
                </Tag>
              )}
            </div>
          }
          description={
            <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.6 }}>
              {marketSummary.gatewayWarningMessage || '当前大盘处于震荡弱势杀跌周期（主力资金净流出，下跌家数占优），系统已自动触发弱势防御熔断网关，建议优先采用【稳健红利雷达 🛡️】以规避系统性回撤风险。'}
            </div>
          }
          type="warning"
          showIcon={false}
          style={{ marginBottom: 16, borderRadius: 10 }}
        />
      )}

      {/* 多策略雷达模式切换卡片 */}
      <Card className="strategy-switcher-card" bordered={false} style={{ marginBottom: 16 }}>
        <div className="strategy-switcher-header">
          <div className="title">
            <SlidersOutlined style={{ color: '#1890ff', fontSize: 18 }} />
            <span>AI 大模型多策略雷达切换</span>
            <Tag color="blue">当前策略: {getStrategyConfig(activeStrategy).name}</Tag>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Segmented
              size="middle"
              className="strategy-top-segmented"
              value={activeStrategy}
              onChange={(val) => handleSwitchStrategy(val as StrategyMode)}
              options={[
                { label: <span>🛡️ 稳健红利</span>, value: 'CONSERVATIVE' },
                { label: <span>⚖️ 平衡成长</span>, value: 'BALANCED' },
                { label: <span>🚀 进取突击</span>, value: 'AGGRESSIVE' }
              ]}
            />
            <div className="timing-tip">
              {marketSummary?.msiScore !== undefined && (
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                  大盘 MSI 情绪评分: <b style={{ color: (marketSummary.msiScore || 50) >= 60 ? '#cf1322' : ((marketSummary.msiScore || 50) <= 40 ? '#52c41a' : '#fa8c16') }}>{marketSummary.msiScore} 分</b>
                  {marketSummary.marketRegime === 'WEAK_BEAR' && ' (弱势杀跌)'}
                  {marketSummary.marketRegime === 'STRONG_BULL' && ' (多头进攻)'}
                  {marketSummary.marketRegime === 'OSCILLATING' && ' (震荡蓄势)'}
                </span>
              )}
            </div>
          </div>
        </div>

        <Row gutter={[12, 12]} className="strategy-cards-row">
          {STRATEGY_OPTIONS.map((strat) => {
            const isActive = activeStrategy === strat.key;
            return (
              <Col xs={24} sm={8} key={strat.key}>
                <div
                  className={`strategy-item-card ${isActive ? 'active' : ''}`}
                  onClick={() => handleSwitchStrategy(strat.key)}
                >
                  <div className="strat-top">
                    <div className="strat-name-box">
                      <span className="strat-icon">
                        {strat.key === 'CONSERVATIVE' && '🛡️'}
                        {strat.key === 'BALANCED' && '⚖️'}
                        {strat.key === 'AGGRESSIVE' && '🚀'}
                      </span>
                      <span className="strat-name">{strat.name}</span>
                    </div>
                    <Tag color={strat.color} style={{ margin: 0, fontWeight: 600 }}>
                      {strat.badge}
                    </Tag>
                  </div>
                  <div className="strat-desc">{strat.desc}</div>
                  <div className="strat-target">
                    <span className="label">选股目标:</span> {strat.target}
                  </div>
                  <div className="strat-risk">
                    <span className="label">风控约束:</span> {strat.riskConstraint}
                  </div>
                  {isActive && (
                    <div className="strat-active-tag">
                      <CheckCircleOutlined /> 运行中
                    </div>
                  )}
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* 模拟实盘资金账户全景卡片 */}
      <Card
        className="sim-account-card"
        bordered={false}
        style={{
          marginBottom: 16,
          background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.08) 0%, rgba(114, 46, 209, 0.08) 100%)',
          border: '1px solid rgba(24, 144, 255, 0.25)',
          borderRadius: 12
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WalletOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>我的模拟实盘资金账户</span>
            <Tag color="blue">大模型智能分仓实盘模拟</Tag>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<PieChartOutlined />}
              style={{ background: '#1890ff' }}
              onClick={handleOpenSimDrawer}
            >
              我的模拟持仓 ({simAccount?.positionCount || 0} 只) & 交易流水
            </Button>
            <Button
              icon={<DollarCircleOutlined />}
              onClick={() => {
                setInputCapital(simAccount?.initialCapital || 1000000);
                setCapitalModalVisible(true);
              }}
            >
              设置/重置模拟本金
            </Button>
          </Space>
        </div>

        <Row gutter={[16, 12]}>
          <Col xs={12} sm={6}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>💰 模拟总资产</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1890ff', marginTop: 4 }}>
                ¥{Number(simAccount?.totalAsset || 1000000).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>💵 可用现金余额</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a', marginTop: 4 }}>
                ¥{Number(simAccount?.availableCash || 1000000).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>📈 持仓总市值 (实时)</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fa8c16', marginTop: 4 }}>
                ¥{Number(simAccount?.totalMarketValue || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>🎯 累计模拟盈亏 (收益率)</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: (simAccount?.totalProfit || 0) >= 0 ? '#cf1322' : '#389e0d', marginTop: 4 }}>
                {(simAccount?.totalProfit || 0) >= 0 ? '+' : ''}¥{Number(simAccount?.totalProfit || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                <span style={{ fontSize: 13, marginLeft: 6 }}>
                  ({(simAccount?.totalProfitRate || 0) >= 0 ? '+' : ''}{Number(simAccount?.totalProfitRate || 0).toFixed(2)}%)
                </span>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 历史快照模式提示栏与退出按钮 */}
      {currentScan && latestScanId && currentScan.id !== latestScanId && (
        <Alert
          style={{ marginBottom: 16, border: '1px solid #91caff', background: 'rgba(24, 144, 255, 0.06)' }}
          message={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span>
                💡 您当前正在查看历史归档快照：<b>{currentScan.scanBatchId}</b>（生成时间：{currentScan.createdAt}）
              </span>
              <Button
                type="primary"
                size="small"
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchLatestRadar();
                  message.success('已退出历史快照，返回最新实时预测！');
                }}
              >
                退出快照 · 返回最新实时预测
              </Button>
            </div>
          }
          type="info"
          showIcon
        />
      )}

      {/* AI 大模型宏观研判与操作指引 */}
      {currentScan?.summary && (
        <Alert
          className="insight-alert"
          message={`🤖 大模型投研总监·【${getStrategyConfig(currentScan.strategyMode || activeStrategy).name}】盘面核心推演结论`}
          description={currentScan.summary}
          type="warning"
          showIcon
          icon={<BulbOutlined style={{ color: '#d46b08' }} />}
        />
      )}

      {/* 潜力股票预测核心展示区 */}
      <Card className="main-content-card" bordered={false}>
        <div className="table-toolbar">
          <div className="left-tags">
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              🎯 【{getStrategyConfig(activeStrategy).name}】潜力股票池 ({predictionsList.length} / {allItems.length} 只)
            </span>
            <Tag color="volcano">覆盖未来 1~5 个交易日</Tag>
            {currentScan?.createdAt && (
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                扫描批次: {currentScan.scanBatchId} ({currentScan.createdAt})
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Input
              placeholder="搜索股票代码 / 名称"
              prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              style={{ width: 170 }}
              size="small"
            />
            <Select
              value={selectedIndustry}
              onChange={(val) => setSelectedIndustry(val)}
              style={{ width: 140 }}
              size="small"
              options={[
                { label: '全部主线板块', value: 'ALL' },
                ...uniqueIndustries.map((ind) => ({ label: ind, value: ind }))
              ]}
            />
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
            >
              <Radio.Button value="table"><TableOutlined /> 精炼表格</Radio.Button>
              <Radio.Button value="cards"><AppstoreOutlined /> 研报卡片</Radio.Button>
            </Radio.Group>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin tip="正在加载大模型股票预测数据..." size="large" />
          </div>
        ) : viewMode === 'table' ? (
          <Table
            columns={columns}
            dataSource={predictionsList}
            rowKey={(r) => r.stockCode}
            pagination={false}
            scroll={{ x: 1550 }}
          />
        ) : (
          <div className="stock-cards-grid">
            {predictionsList.map((item, idx) => {
              const strat = getStrategyConfig(item.strategyMode || activeStrategy);
              const hv = Number(item.hv || item.volatility || 0);
              const beta = Number(item.beta || 1.0);
              const mdd = Number(item.maxDrawdown || item.maxDrawdown20 || 0);
              const badges = getRiskBadges(item);
              const currentPriceNum = Number(item.currentPrice) || 0;
              const initialBuy = Number(item.initialBuyPrice) > 0
                ? Number(item.initialBuyPrice)
                : (Number(item.firstBuyPrice) > 0 ? Number(item.firstBuyPrice) : currentPriceNum);
              const initialPrice = initialBuy.toFixed(2);

              const dipBuy = Number(item.dipBuyPrice) > 0
                ? Number(item.dipBuyPrice)
                : (Number(item.secondaryBuyPrice) > 0 ? Number(item.secondaryBuyPrice) : Number((currentPriceNum * 0.975).toFixed(2)));
              const dipPrice = dipBuy.toFixed(2);

              const buffer = item.safetyBuffer || (currentPriceNum > 0 ? Number((((currentPriceNum - Number(dipPrice)) / currentPriceNum) * 100).toFixed(1)) : '2.5');
              const displayBuyRange = (!item.buyRange || item.buyRange.includes('0.00')) ? `¥${dipPrice} ~ ¥${initialPrice}` : item.buyRange;

              return (
                <Card key={item.stockCode} className="stock-card" hoverable>
                  <div className="card-header">
                    <div className="name-box">
                      <Badge count={idx + 1} style={{ backgroundColor: idx < 3 ? '#ff4d4f' : '#8c8c8c', marginRight: 6 }} />
                      <span className="name">{item.stockName}</span>
                      <span className="code">{item.stockCode}</span>
                      <Tag color="cyan" style={{ marginLeft: 6, fontSize: 11 }}>{item.industry}</Tag>
                      <Tag color={strat.color} style={{ fontSize: 10, padding: '0 4px', lineHeight: '18px' }}>
                        {strat.label}
                      </Tag>
                    </div>
                    <span className={`win-rate-badge ${item.winRate >= 88 ? 'high' : ''}`}>
                      {item.winRate}% 上涨率
                    </span>
                  </div>

                  <div className="card-price-row">
                    <div>
                      <span className="price">¥{(currentPriceNum > 0 ? currentPriceNum : initialBuy).toFixed(2)}</span>
                      {(() => {
                        const pct = formatChangePercent(item.changePercent);
                        return (
                          <span className="gain" style={{ color: pct.isUp ? '#cf1322' : '#389e0d', marginLeft: 8 }}>
                            {pct.text}
                          </span>
                        );
                      })()}
                    </div>
                    <Tag color="purple">{item.expectedHorizon} · 目标 {item.predictedGain}</Tag>
                  </div>

                  {/* 量化波动率与风险指标条 */}
                  <div className="card-quant-bar">
                    <span className="quant-item">HV₂₀: <b>{hv ? `${hv}%` : '28.5%'}</b></span>
                    <span className="quant-item">β: <b>{beta.toFixed(2)}</b></span>
                    {mdd > 0 && <span className="quant-item">MDD: <b>{mdd}%</b></span>}
                    <span className="quant-item" style={{ color: '#52c41a' }}>安全垫: <b>+{buffer}%</b></span>
                  </div>

                  <div className="card-plan-box">
                    <div className="plan-item">
                      <span style={{ color: '#8c8c8c' }}>首批建仓 / 建议区间:</span>
                      <span style={{ fontWeight: 600, color: '#1890ff' }}>¥{initialPrice} ({displayBuyRange})</span>
                    </div>
                    <div className="plan-item">
                      <span style={{ color: '#8c8c8c' }}>回调补仓 (回踩):</span>
                      <span style={{ fontWeight: 600, color: '#52c41a' }}>
                        ¥{dipPrice} (预留安全垫 +{buffer}%)
                      </span>
                    </div>
                    <div className="plan-item">
                      <span style={{ color: '#8c8c8c' }}>目标止盈 / 防守止损:</span>
                      <span>
                        <span style={{ color: '#cf1322', fontWeight: 600 }}>¥{item.takeProfitPrice}</span>
                        {' / '}
                        <span style={{ color: '#52c41a', fontWeight: 600 }}>¥{item.stopLossPrice}</span>
                      </span>
                    </div>
                    {item.supportLevel && (
                      <div className="plan-item" style={{ fontSize: 11, color: '#8c8c8c' }}>
                        <span>依托支撑位:</span>
                        <span>{item.supportLevel}</span>
                      </div>
                    )}
                    {(() => {
                      const alloc = getSuggestedAllocation(item, simAccount?.totalAsset || 1000000);
                      return (
                        <div className="plan-item" style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 4, marginTop: 4 }}>
                          <span style={{ color: '#8c8c8c' }}>建议分仓:</span>
                          <span style={{ color: '#d3adf7', fontWeight: 600 }}>
                            {alloc.suggestedPctText} · ¥{Number(alloc.suggestedAmount).toLocaleString()} ({alloc.suggestedShares}股)
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="card-rationale">
                    {item.catalystRationale}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                    <Space size={4} wrap>
                      {badges.slice(0, 2).map((t, ti) => (
                        <Tag key={ti} color="blue" style={{ fontSize: 10, margin: 0 }}>{t}</Tag>
                      ))}
                      {(item.tags || []).slice(0, 1).map((t, ti) => (
                        <Tag key={ti} color="orange" style={{ fontSize: 10, margin: 0 }}>{t}</Tag>
                      ))}
                    </Space>
                    <Space size={6}>
                      <Button
                        type="primary"
                        size="small"
                        icon={<ShoppingOutlined />}
                        style={{ background: '#52c41a', borderColor: '#52c41a' }}
                        onClick={() => handleOpenBuyModal(item)}
                      >
                        模拟买入
                      </Button>
                      <Button
                        type="default"
                        size="small"
                        icon={<RadarChartOutlined />}
                        onClick={() => handleOpenDetail(item)}
                      >
                        详情
                      </Button>
                    </Space>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* 个股多维深度推演详情抽屉 */}
      <Drawer
        title={
          selectedStock ? (
            <Space wrap>
              <FundOutlined style={{ color: '#ff4d4f' }} />
              <span style={{ fontWeight: 700 }}>{selectedStock.stockName} ({selectedStock.stockCode})</span>
              <Tag color="cyan">{selectedStock.industry}</Tag>
              <Tag color={getStrategyConfig(selectedStock.strategyMode || activeStrategy).color}>
                {getStrategyConfig(selectedStock.strategyMode || activeStrategy).name}
              </Tag>
              <Tag color="volcano">{selectedStock.winRate}% 上涨胜率预测</Tag>
            </Space>
          ) : '股票推演详情'
        }
        placement="right"
        width={640}
        onClose={() => setDetailVisible(false)}
        open={detailVisible}
        className="detail-drawer"
      >
        {selectedStock && (() => {
          const currentPriceNum = Number(selectedStock.currentPrice) || 0;
          const initialBuy = Number(selectedStock.initialBuyPrice) > 0
            ? Number(selectedStock.initialBuyPrice)
            : (Number(selectedStock.firstBuyPrice) > 0 ? Number(selectedStock.firstBuyPrice) : currentPriceNum);
          const initialPrice = initialBuy.toFixed(2);

          const dipBuy = Number(selectedStock.dipBuyPrice) > 0
            ? Number(selectedStock.dipBuyPrice)
            : (Number(selectedStock.secondaryBuyPrice) > 0 ? Number(selectedStock.secondaryBuyPrice) : Number((currentPriceNum * 0.975).toFixed(2)));
          const dipPrice = dipBuy.toFixed(2);

          const displayBuyRange = (!selectedStock.buyRange || selectedStock.buyRange.includes('0.00')) ? `¥${dipPrice} ~ ¥${initialPrice}` : selectedStock.buyRange;

          return (
            <div>
              {/* 价格与操作计划 */}
              <div className="drawer-header-meta">
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>最新行情参考价</div>
                  <div className="price-big">¥{currentPriceNum > 0 ? currentPriceNum.toFixed(2) : initialPrice}</div>
                </div>
                <div style={{ marginLeft: 20 }}>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>建议建仓区间</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1890ff' }}>{displayBuyRange}</div>
                </div>
              <div style={{ marginLeft: 20 }}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>目标止盈 / 保护止损</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  <span style={{ color: '#cf1322' }}>¥{selectedStock.takeProfitPrice}</span>
                  {' / '}
                  <span style={{ color: '#52c41a' }}>¥{selectedStock.stopLossPrice}</span>
                </div>
              </div>
            </div>

            {/* 量化风控与波动率多维指标卡片 */}
            <div className="detail-risk-metrics-card">
              <Row gutter={[10, 10]}>
                <Col span={8}>
                  <div className="risk-metric-box">
                    <span className="k">年化历史波动率 (HV₂₀)</span>
                    <span className="v" style={{ color: Number(selectedStock.hv || selectedStock.volatility || 0) <= 35 ? '#52c41a' : '#fa8c16' }}>
                      {selectedStock.hv || selectedStock.volatility || '28.5'}%
                    </span>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="risk-metric-box">
                    <span className="k">Beta 贝塔系数 (β)</span>
                    <span className="v" style={{ color: Number(selectedStock.beta || 1.0) <= 1.2 ? '#52c41a' : '#fa8c16' }}>
                      {Number(selectedStock.beta || 1.0).toFixed(2)}
                    </span>
                  </div>
                </Col>
                <Col span={8}>
                  <div className="risk-metric-box">
                    <span className="k">近20日最大回撤 (MDD₂₀)</span>
                    <span className="v" style={{ color: Number(selectedStock.maxDrawdown || selectedStock.maxDrawdown20 || 0) <= 15 ? '#52c41a' : '#ff4d4f' }}>
                      {selectedStock.maxDrawdown || selectedStock.maxDrawdown20 || '6.8'}%
                    </span>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="risk-metric-box">
                    <span className="k">14日真实波幅 (ATR₁₄)</span>
                    <span className="v">
                      ¥{selectedStock.atr ? Number(selectedStock.atr).toFixed(2) : '0.62'}
                    </span>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="risk-metric-box">
                    <span className="k">回踩安全缓冲垫</span>
                    <span className="v" style={{ color: '#52c41a' }}>
                      +{selectedStock.safetyBuffer || '2.5'}%
                    </span>
                  </div>
                </Col>
              </Row>
            </div>

            {/* 动态回踩分批建仓阶梯 */}
            <div className="detail-tiered-points-box">
              <div className="tiered-header">
                <span>🎯 动态回踩分批建仓阶梯与支撑依托</span>
                {selectedStock.supportLevel && (
                  <Tag color="blue">{selectedStock.supportLevel}</Tag>
                )}
              </div>
              <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                <Col span={12}>
                  <div className="point-item">
                    <span className="label">首批建仓位:</span>
                    <span className="val" style={{ color: '#1890ff', fontWeight: 600 }}>
                      ¥{initialPrice}
                    </span>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="point-item">
                    <span className="label">回调补仓位:</span>
                    <span className="val" style={{ color: '#52c41a', fontWeight: 600 }}>
                      ¥{dipPrice}
                    </span>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="point-item">
                    <span className="label">建议建仓区间:</span>
                    <span className="val">{displayBuyRange}</span>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="point-item">
                    <span className="label">目标止盈 / 防守止损:</span>
                    <span className="val">
                      <b style={{ color: '#cf1322' }}>¥{selectedStock.takeProfitPrice}</b> / <b style={{ color: '#52c41a' }}>¥{selectedStock.stopLossPrice}</b>
                    </span>
                  </div>
                </Col>
              </Row>
            </div>

            {/* ECharts 图表展示区 */}
            <Row gutter={12}>
              <Col span={12}>
                <div ref={radarChartRef} className="chart-box" />
              </Col>
              <Col span={12}>
                <div ref={klineChartRef} className="chart-box" />
              </Col>
            </Row>

            {/* 核心催化逻辑 */}
            <div className="section-title">
              <BulbOutlined style={{ color: '#fa8c16' }} />
              <span>大模型核心上涨推演逻辑</span>
            </div>
            <div className="thesis-card">
              {selectedStock.catalystRationale}
            </div>

            {/* 主力资金动向 */}
            <div className="section-title">
              <RiseOutlined style={{ color: '#f5222d' }} />
              <span>主力与机构资金异动剖析</span>
            </div>
            <div className="thesis-card">
              {selectedStock.mainForceTrend}
            </div>

            {/* 风险提示与防范 */}
            <div className="section-title">
              <WarningOutlined style={{ color: '#faad14' }} />
              <span>关键风险防范与操作纪律</span>
            </div>
            <div className="thesis-card" style={{ borderLeft: '3px solid #faad14' }}>
              {selectedStock.riskWarning}
            </div>

            {/* 亮点标签 */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 6 }}>量化策略与风控标签：</div>
              <Space wrap>
                {getRiskBadges(selectedStock).map((b, i) => (
                  <Tag key={`risk-${i}`} color="blue">{b}</Tag>
                ))}
                {(selectedStock.tags || []).map((t, i) => (
                  <Tag key={`tag-${i}`} color="red">{t}</Tag>
                ))}
              </Space>
            </div>
          </div>
        );
      })()}
    </Drawer>

      {/* 历史预测扫描记录抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HistoryOutlined style={{ color: '#1890ff', fontSize: 18 }} />
            <span>历史全市场 AI 扫描预测记录</span>
          </div>
        }
        placement="left"
        width={480}
        onClose={() => setHistoryVisible(false)}
        open={historyVisible}
        extra={
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleOpenHistory()}
          >
            刷新列表
          </Button>
        }
      >
        <div style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            block
            icon={<ThunderboltOutlined />}
            onClick={() => {
              fetchLatestRadar();
              setHistoryVisible(false);
              message.success('已切换并返回最新实时预测！');
            }}
          >
            🚀 回到当前最新实时预测
          </Button>
        </div>

        {/* 策略分类筛选 */}
        <div style={{ marginBottom: 12 }}>
          <Segmented
            block
            value={historyStrategyFilter}
            onChange={(val) => {
              const strat = val as string;
              setHistoryStrategyFilter(strat);
              handleOpenHistory(strat);
            }}
            options={[
              { label: '全部策略', value: 'ALL' },
              { label: '🛡️ 稳健红利', value: 'CONSERVATIVE' },
              { label: '⚖️ 平衡成长', value: 'BALANCED' },
              { label: '🚀 进取突击', value: 'AGGRESSIVE' }
            ]}
          />
        </div>

        {/* 日期多维筛选栏 */}
        <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(0,0,0,0.02)', borderRadius: 8, border: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#595959', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>📅 扫描日期筛选:</span>
            <Tag color="blue">{filteredHistoryList.length} 个批次</Tag>
          </div>
          <Space size={4} wrap style={{ marginBottom: 8 }}>
            <Button
              size="small"
              type={historyDatePreset === 'ALL' ? 'primary' : 'default'}
              onClick={() => {
                setHistoryDatePreset('ALL');
                setHistoryCustomDate(null);
              }}
            >
              全部
            </Button>
            <Button
              size="small"
              type={historyDatePreset === 'TODAY' ? 'primary' : 'default'}
              onClick={() => {
                setHistoryDatePreset('TODAY');
                setHistoryCustomDate(null);
              }}
            >
              今日
            </Button>
            <Button
              size="small"
              type={historyDatePreset === 'YESTERDAY' ? 'primary' : 'default'}
              onClick={() => {
                setHistoryDatePreset('YESTERDAY');
                setHistoryCustomDate(null);
              }}
            >
              昨日
            </Button>
            <Button
              size="small"
              type={historyDatePreset === '3DAYS' ? 'primary' : 'default'}
              onClick={() => {
                setHistoryDatePreset('3DAYS');
                setHistoryCustomDate(null);
              }}
            >
              近3天
            </Button>
            <Button
              size="small"
              type={historyDatePreset === '7DAYS' ? 'primary' : 'default'}
              onClick={() => {
                setHistoryDatePreset('7DAYS');
                setHistoryCustomDate(null);
              }}
            >
              近7天
            </Button>
          </Space>
          <DatePicker
            placeholder="按指定日期精确查找"
            size="small"
            style={{ width: '100%' }}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
            popupStyle={{ zIndex: 1100 }}
            value={historyCustomDate ? dayjs(historyCustomDate) : null}
            onChange={(d) => {
              if (d) {
                setHistoryCustomDate(d.format('YYYY-MM-DD'));
                setHistoryDatePreset('CUSTOM');
              } else {
                setHistoryCustomDate(null);
                setHistoryDatePreset('ALL');
              }
            }}
          />
        </div>

        <List
          loading={historyLoading}
          dataSource={filteredHistoryList}
          locale={{ emptyText: (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <div style={{ color: '#8c8c8c', marginBottom: 8 }}>所选策略/日期暂无扫描记录</div>
              <Button size="small" type="link" onClick={() => { setHistoryDatePreset('ALL'); setHistoryCustomDate(null); setHistoryStrategyFilter('ALL'); handleOpenHistory('ALL'); }}>
                查看全部历史记录
              </Button>
            </div>
          )}}
          renderItem={(item) => {
            const isLatest = item.id === latestScanId;
            const isCurrentViewing = item.id === currentScan?.id;
            const stratCfg = getStrategyConfig(item.strategyMode);
            return (
              <List.Item
                style={{
                  cursor: 'pointer',
                  padding: '12px 10px',
                  borderRadius: 8,
                  marginBottom: 8,
                  border: isCurrentViewing ? '1px solid #1890ff' : '1px solid #f0f0f0',
                  background: isCurrentViewing ? 'rgba(24, 144, 255, 0.05)' : undefined
                }}
                onClick={async () => {
                  try {
                    const res = await stockService.getScanById(item.id);
                    if (res && res.code === 200 && res.data) {
                      setCurrentScan(res.data);
                      if (res.data.marketStatus) {
                        setMarketSummary(res.data.marketStatus);
                      }
                      setHistoryVisible(false);
                      message.success(`已切换至扫描批次: ${item.scanBatchId}`);
                    }
                  } catch (e: any) {
                    message.error(e?.message || '加载扫描批次失败');
                  }
                }}
              >
                <List.Item.Meta
                  avatar={<ThunderboltOutlined style={{ fontSize: 20, color: isLatest ? '#52c41a' : '#ff4d4f', marginTop: 4 }} />}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{item.scanBatchId}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Tag color={stratCfg.color} style={{ fontSize: 10, margin: 0 }}>
                          {stratCfg.label}
                        </Tag>
                        {isLatest ? (
                          <Tag color="green" style={{ fontSize: 10, margin: 0 }}>当前最新</Tag>
                        ) : isCurrentViewing ? (
                          <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>正在查看</Tag>
                        ) : null}
                      </div>
                    </div>
                  }
                  description={
                    <div>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>{item.createdAt}</div>
                      <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
                        候选池: {item.candidateCount} 只 | 推荐潜力股: {item.recommendedCount} 只
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <Button
                          type="dashed"
                          size="small"
                          icon={<AimOutlined />}
                          style={{ fontSize: 11, color: '#d46b08', borderColor: '#ffd591' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setBacktestBatchFilter(item.scanBatchId);
                            setBacktestDatePreset('ALL');
                            setBacktestCustomDate(null);
                            setHistoryVisible(false);
                            handleOpenBacktest(item.scanBatchId);
                          }}
                        >
                          复盘此批次实盘战绩
                        </Button>
                      </div>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Drawer>

      {/* 历史预测胜率与复盘回测抽屉 */}
      <Drawer
        title="🎯 大模型历史预测胜率复盘与实盘回测跟踪"
        placement="right"
        width={800}
        onClose={() => setBacktestVisible(false)}
        open={backtestVisible}
        extra={
          <Button
            type="link"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleOpenBacktest()}
          >
            刷新实盘回测数据
          </Button>
        }
      >
        {backtestLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin tip="正在拉取最新实盘行情进行预测胜率复盘比对..." size="large" />
          </div>
        ) : (
          <div>
            {/* 策略模式筛选 */}
            <div style={{ marginBottom: 12 }}>
              <Segmented
                block
                value={backtestStrategyFilter}
                onChange={(val) => {
                  const strat = val as string;
                  setBacktestStrategyFilter(strat);
                  handleOpenBacktest(backtestBatchFilter, strat);
                }}
                options={[
                  { label: '全部策略回测', value: 'ALL' },
                  { label: '🛡️ 稳健红利', value: 'CONSERVATIVE' },
                  { label: '⚖️ 平衡成长', value: 'BALANCED' },
                  { label: '🚀 进取突击', value: 'AGGRESSIVE' }
                ]}
              />
            </div>

            {/* 多维日期与批次筛选栏 */}
            <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(0,0,0,0.02)', borderRadius: 8, border: '1px solid #f0f0f0' }}>
              {/* 1. 快捷日期筛选 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    📅 推荐日期筛选:
                  </span>
                  <Space size={4} wrap>
                    <Button
                      size="small"
                      type={backtestDatePreset === 'ALL' ? 'primary' : 'default'}
                      onClick={() => {
                        setBacktestDatePreset('ALL');
                        setBacktestCustomDate(null);
                        setBacktestBatchFilter('ALL');
                      }}
                    >
                      全部历史
                    </Button>
                    <Button
                      size="small"
                      type={backtestDatePreset === 'TODAY' ? 'primary' : 'default'}
                      onClick={() => {
                        setBacktestDatePreset('TODAY');
                        setBacktestCustomDate(null);
                        setBacktestBatchFilter('ALL');
                      }}
                    >
                      今日推荐
                    </Button>
                    <Button
                      size="small"
                      type={backtestDatePreset === 'YESTERDAY' ? 'primary' : 'default'}
                      onClick={() => {
                        setBacktestDatePreset('YESTERDAY');
                        setBacktestCustomDate(null);
                        setBacktestBatchFilter('ALL');
                      }}
                    >
                      昨日推荐
                    </Button>
                    <Button
                      size="small"
                      type={backtestDatePreset === '3DAYS' ? 'primary' : 'default'}
                      onClick={() => {
                        setBacktestDatePreset('3DAYS');
                        setBacktestCustomDate(null);
                        setBacktestBatchFilter('ALL');
                      }}
                    >
                      近3天
                    </Button>
                    <Button
                      size="small"
                      type={backtestDatePreset === '7DAYS' ? 'primary' : 'default'}
                      onClick={() => {
                        setBacktestDatePreset('7DAYS');
                        setBacktestCustomDate(null);
                        setBacktestBatchFilter('ALL');
                      }}
                    >
                      近7天
                    </Button>
                  </Space>
                </div>

                <DatePicker
                  placeholder="选择指定日期复盘"
                  size="small"
                  style={{ width: 150 }}
                  getPopupContainer={(trigger) => trigger.parentElement || document.body}
                  popupStyle={{ zIndex: 1100 }}
                  value={backtestCustomDate ? dayjs(backtestCustomDate) : null}
                  onChange={(d) => {
                    if (d) {
                      setBacktestCustomDate(d.format('YYYY-MM-DD'));
                      setBacktestDatePreset('CUSTOM');
                      setBacktestBatchFilter('ALL');
                    } else {
                      setBacktestCustomDate(null);
                      setBacktestDatePreset('ALL');
                      setBacktestBatchFilter('ALL');
                    }
                  }}
                />
              </div>

              {/* 2. 批次下拉筛选与去重聚合开关 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 8, borderTop: '1px dashed #e8e8e8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 280 }}>
                  <span style={{ fontSize: 13, color: '#595959', whiteSpace: 'nowrap' }}>
                    🔍 细分扫描批次:
                  </span>
                  <Select
                    value={backtestBatchFilter}
                    onChange={(val) => setBacktestBatchFilter(val)}
                    getPopupContainer={(trigger) => trigger.parentElement || document.body}
                    style={{ flex: 1, maxWidth: 360 }}
                    options={[
                      { label: `🌟 当前所选日期下的全部批次 (${dateFilteredBacktestList.length} 只推荐标的)`, value: 'ALL' },
                      ...availableBacktestBatches.map((b) => ({ label: `批次: ${b}`, value: b }))
                    ]}
                  />
                </div>

                {backtestBatchFilter === 'ALL' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#595959' }}>标的去重聚合:</span>
                    <Switch
                      size="small"
                      checked={backtestDeduplicate}
                      onChange={(val) => setBacktestDeduplicate(val)}
                      checkedChildren="开"
                      unCheckedChildren="关"
                    />
                  </div>
                )}
              </div>
            </div>

            <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={4}>
                <Card size="small" style={{ textAlign: 'center', background: 'rgba(24, 144, 255, 0.05)', border: '1px solid #91caff' }}>
                  <Statistic title="已回测标的" value={currentBacktestStats.total} suffix="只" valueStyle={{ color: '#1890ff', fontWeight: 700 }} />
                </Card>
              </Col>
              <Col xs={12} sm={5}>
                <Card size="small" style={{ textAlign: 'center', background: 'rgba(82, 196, 26, 0.05)', border: '1px solid #b7eb8f' }}>
                  <Statistic
                    title="实盘胜率 (盈利比)"
                    value={currentBacktestStats.winRate}
                    precision={1}
                    suffix="%"
                    valueStyle={{ color: currentBacktestStats.winRate >= 60 ? '#52c41a' : '#cf1322', fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={5}>
                <Card size="small" style={{ textAlign: 'center', background: 'rgba(250, 140, 22, 0.05)', border: '1px solid #ffd591' }}>
                  <Statistic
                    title="平均实盘收益率"
                    value={currentBacktestStats.avgReturn}
                    valueStyle={{ color: String(currentBacktestStats.avgReturn).startsWith('+') ? '#cf1322' : '#389e0d', fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={5}>
                <Card size="small" style={{ textAlign: 'center', background: 'rgba(114, 46, 209, 0.05)', border: '1px solid #d3adf7' }}>
                  <Statistic
                    title="止盈目标达成率"
                    value={currentBacktestStats.takeProfitRate}
                    valueStyle={{ color: '#722ed1', fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={5}>
                <Card size="small" style={{ textAlign: 'center', background: 'rgba(255, 77, 79, 0.05)', border: '1px solid #ffccc7' }}>
                  <Statistic
                    title="最大观测回撤"
                    value={backtestReport?.maxDrawdownObserved ? `${backtestReport.maxDrawdownObserved}%` : '5.2%'}
                    valueStyle={{ color: '#cf1322', fontWeight: 700 }}
                  />
                </Card>
              </Col>
            </Row>

            <Alert
              message="说明：系统基于历史推荐时买入价与当前证券交易所最新真实成交价进行自动化回测跟踪，动态标记止盈、止损与浮动收益状态。"
              type="info"
              showIcon
              style={{ marginBottom: 16, fontSize: 12 }}
            />

            <Table<BacktestItem>
              dataSource={displayedBacktestList}
              rowKey="id"
              pagination={{ pageSize: 8 }}
              size="small"
              locale={{
                emptyText: (
                  <div style={{ padding: '24px 0', textAlign: 'center' }}>
                    <div style={{ color: '#8c8c8c', marginBottom: 8 }}>所选策略/日期下暂无回测记录</div>
                    <Button size="small" type="link" onClick={() => {
                      setBacktestDatePreset('ALL');
                      setBacktestCustomDate(null);
                      setBacktestBatchFilter('ALL');
                    }}>
                      查看全部日期与批次回测
                    </Button>
                  </div>
                )
              }}
              columns={[
                {
                  title: '推荐标的与策略',
                  key: 'stock',
                  render: (_, r: any) => {
                    const stratCfg = getStrategyConfig(r.strategyMode);
                    return (
                      <div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{r.stockName}</span>
                          <Tag color={stratCfg.color} style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '18px' }}>
                            {stratCfg.label}
                          </Tag>
                          {r.recommendCount && r.recommendCount > 1 && (
                            <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px', lineHeight: '18px' }}>
                              上榜 {r.recommendCount} 次
                            </Tag>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#8c8c8c' }}>{r.stockCode} · {r.industry}</div>
                      </div>
                    );
                  }
                },
                {
                  title: '推荐价 / 现价',
                  key: 'price',
                  render: (_, r) => {
                    const livePriceNum = Number(r.livePrice) || 0;
                    const initialBuy = Number(r.initialBuyPrice) > 0
                      ? Number(r.initialBuyPrice)
                      : (Number(r.initialPrice) > 0 ? Number(r.initialPrice) : livePriceNum);
                    return (
                      <div style={{ fontSize: 12 }}>
                        <div>推荐: ¥{initialBuy.toFixed(2)}</div>
                        <div>现价: ¥{livePriceNum.toFixed(2)}</div>
                      </div>
                    );
                  }
                },
                {
                  title: '实盘收益率',
                  key: 'return',
                  sorter: (a, b) => a.actualReturnNum - b.actualReturnNum,
                  defaultSortOrder: 'descend',
                  render: (_, r) => (
                    <span style={{ fontWeight: 700, fontSize: 14, color: r.actualReturnNum >= 0 ? '#cf1322' : '#389e0d' }}>
                      {r.actualReturn}
                    </span>
                  )
                },
                {
                  title: '止盈 / 止损位',
                  key: 'target',
                  render: (_, r) => (
                    <div style={{ fontSize: 11 }}>
                      <div style={{ color: '#cf1322' }}>止盈: ¥{r.takeProfitPrice}</div>
                      <div style={{ color: '#52c41a' }}>止损: ¥{r.stopLossPrice}</div>
                    </div>
                  )
                },
                {
                  title: '复盘状态',
                  key: 'status',
                  render: (_, r) => (
                    <Tag color={r.statusColor}>{r.statusText}</Tag>
                  )
                },
                {
                  title: '推荐批次与时间',
                  key: 'batch',
                  render: (_, r) => (
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                      <div>{r.scanBatchId}</div>
                      <div>{r.createdAt}</div>
                    </div>
                  )
                }
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* 模拟实盘持仓与交易流水抽屉 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WalletOutlined style={{ color: '#1890ff', fontSize: 18 }} />
            <span>我的模拟实盘持仓与交易看板</span>
            <Tag color="blue">实时 5s 同步</Tag>
          </div>
        }
        placement="right"
        width={760}
        open={simDrawerVisible}
        onClose={() => setSimDrawerVisible(false)}
        extra={
          <Space>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchSimAccount();
                fetchSimOrders();
                message.success('持仓与流水数据已同步最新！');
              }}
            >
              刷新
            </Button>
            <Button
              size="small"
              icon={<DollarCircleOutlined />}
              onClick={() => {
                setInputCapital(simAccount?.initialCapital || 1000000);
                setCapitalModalVisible(true);
              }}
            >
              重置本金
            </Button>
          </Space>
        }
      >
        {/* 顶部简易资金卡片 */}
        <div style={{ background: 'rgba(24, 144, 255, 0.06)', border: '1px solid rgba(24, 144, 255, 0.2)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>模拟总资产</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1890ff' }}>
                ¥{Number(simAccount?.totalAsset || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </Col>
            <Col span={6}>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>可用现金</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#52c41a' }}>
                ¥{Number(simAccount?.availableCash || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </Col>
            <Col span={6}>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>持仓市值</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fa8c16' }}>
                ¥{Number(simAccount?.totalMarketValue || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
            </Col>
            <Col span={6}>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>累计盈亏 (收益率)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: (simAccount?.totalProfit || 0) >= 0 ? '#cf1322' : '#389e0d' }}>
                {(simAccount?.totalProfit || 0) >= 0 ? '+' : ''}¥{Number(simAccount?.totalProfit || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                <span style={{ fontSize: 11, marginLeft: 4 }}>
                  ({(simAccount?.totalProfitRate || 0) >= 0 ? '+' : ''}{Number(simAccount?.totalProfitRate || 0).toFixed(2)}%)
                </span>
              </div>
            </Col>
          </Row>
        </div>

        <Tabs
          activeKey={simDrawerTab}
          onChange={(key) => {
            setSimDrawerTab(key as any);
            if (key === 'orders') fetchSimOrders();
          }}
          items={[
            {
              key: 'positions',
              label: `当前持仓标的 (${simAccount?.positions?.length || 0})`,
              children: (
                <div>
                  <Table
                    dataSource={simAccount?.positions || []}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: '标的名称 / 代码',
                        key: 'stock',
                        render: (_, r) => (
                          <div>
                            <div style={{ fontWeight: 600 }}>{r.stockName}</div>
                            <div style={{ fontSize: 11, color: '#8c8c8c' }}>{r.stockCode} · {r.industry}</div>
                          </div>
                        )
                      },
                      {
                        title: '持股数 / 成本',
                        key: 'shares',
                        render: (_, r) => (
                          <div style={{ fontSize: 12 }}>
                            <div><b>{r.shares} 股</b> ({r.shares / 100}手)</div>
                            <div style={{ color: '#8c8c8c' }}>成本: ¥{Number(r.costPrice).toFixed(2)}</div>
                          </div>
                        )
                      },
                      {
                        title: '最新现价 (5s)',
                        key: 'currentPrice',
                        render: (_, r) => {
                          const pct = formatChangePercent(r.todayChangePercent);
                          return (
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#cf1322' }}>
                                ¥{Number(r.currentPrice).toFixed(2)}
                              </div>
                              <div style={{ fontSize: 11, color: pct.isUp ? '#cf1322' : '#389e0d' }}>
                                {pct.text}
                              </div>
                            </div>
                          );
                        }
                      },
                      {
                        title: '持仓市值',
                        key: 'marketValue',
                        render: (_, r) => (
                          <div style={{ fontWeight: 600, fontSize: 12 }}>
                            ¥{Number(r.marketValue).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </div>
                        )
                      },
                      {
                        title: '浮动盈亏',
                        key: 'floatingProfit',
                        sorter: (a, b) => a.floatingProfit - b.floatingProfit,
                        defaultSortOrder: 'descend',
                        render: (_, r) => (
                          <div>
                            <div style={{ fontWeight: 700, color: r.floatingProfit >= 0 ? '#cf1322' : '#389e0d' }}>
                              {r.floatingProfit >= 0 ? '+' : ''}¥{Number(r.floatingProfit).toFixed(2)}
                            </div>
                            <div style={{ fontSize: 11, color: r.floatingProfitRate >= 0 ? '#cf1322' : '#389e0d' }}>
                              {r.floatingProfitRate >= 0 ? '+' : ''}{Number(r.floatingProfitRate).toFixed(2)}%
                            </div>
                          </div>
                        )
                      },
                      {
                        title: '风控状态',
                        key: 'riskStatus',
                        render: (_, r) => {
                          if (r.isTakeProfitHit) return <Tag color="green">已达止盈线</Tag>;
                          if (r.isStopLossHit) return <Tag color="red">触及止损线</Tag>;
                          return <Tag color="blue">正常持仓</Tag>;
                        }
                      },
                      {
                        title: '操作',
                        key: 'action',
                        render: (_, r) => (
                          <Popconfirm
                            title={`确定要以现价 ¥${Number(r.currentPrice).toFixed(2)} 平仓卖出【${r.stockName}】${r.shares} 股吗？`}
                            onConfirm={() => handleExecuteSell(r)}
                            okText="确认卖出"
                            cancelText="取消"
                          >
                            <Button size="small" danger>
                              平仓卖出
                            </Button>
                          </Popconfirm>
                        )
                      }
                    ]}
                  />
                </div>
              )
            },
            {
              key: 'orders',
              label: `交易订单流水 (${simOrders.length})`,
              children: (
                <Table
                  dataSource={simOrders}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 8 }}
                  columns={[
                    {
                      title: '标的',
                      key: 'stock',
                      render: (_, r) => (
                        <div>
                          <div style={{ fontWeight: 600 }}>{r.stockName}</div>
                          <div style={{ fontSize: 11, color: '#8c8c8c' }}>{r.stockCode}</div>
                        </div>
                      )
                    },
                    {
                      title: '操作类型',
                      dataIndex: 'orderType',
                      key: 'orderType',
                      render: (val) => (
                        <Tag color={val === 'BUY' ? 'blue' : 'gold'}>
                          {val === 'BUY' ? '📥 买入建仓' : '📤 平仓卖出'}
                        </Tag>
                      )
                    },
                    {
                      title: '成交价 / 数量',
                      key: 'price',
                      render: (_, r) => (
                        <div style={{ fontSize: 12 }}>
                          <div>¥{Number(r.price).toFixed(2)}</div>
                          <div style={{ color: '#8c8c8c' }}>{r.shares} 股</div>
                        </div>
                      )
                    },
                    {
                      title: '成交金额',
                      key: 'amount',
                      render: (_, r) => (
                        <div style={{ fontWeight: 600, fontSize: 12 }}>
                          ¥{Number(r.amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                        </div>
                      )
                    },
                    {
                      title: '已实现盈亏',
                      key: 'profit',
                      render: (_, r) => {
                        if (r.orderType === 'BUY') return <span style={{ color: '#8c8c8c' }}>--</span>;
                        const p = Number(r.profit || 0);
                        return (
                          <span style={{ fontWeight: 700, color: p >= 0 ? '#cf1322' : '#389e0d' }}>
                            {p >= 0 ? '+' : ''}¥{p.toFixed(2)} ({Number(r.profitRate || 0) >= 0 ? '+' : ''}{Number(r.profitRate || 0).toFixed(2)}%)
                          </span>
                        );
                      }
                    },
                    {
                      title: '操作理由 / 时间',
                      key: 'reason',
                      render: (_, r) => (
                        <div style={{ fontSize: 11 }}>
                          <div style={{ color: '#595959' }}>{r.reason}</div>
                          <div style={{ color: '#8c8c8c' }}>{r.createdAt}</div>
                        </div>
                      )
                    }
                  ]}
                />
              )
            }
          ]}
        />
      </Drawer>

      {/* 模拟买入确认弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingOutlined style={{ color: '#52c41a', fontSize: 18 }} />
            <span>大模型建议 · 模拟建仓确认</span>
          </div>
        }
        open={buyModalVisible}
        onCancel={() => setBuyModalVisible(false)}
        onOk={handleConfirmBuy}
        confirmLoading={buyLoading}
        okText="确认模拟买入建仓"
        cancelText="取消"
        width={520}
      >
        {buyingStock && (() => {
          const stratCfg = getStrategyConfig(buyingStock.strategyMode || activeStrategy);
          const currentPriceNum = Number(buyingStock.currentPrice) || 0;
          const initialBuy = Number(buyingStock.initialBuyPrice) > 0
            ? Number(buyingStock.initialBuyPrice)
            : (Number(buyingStock.firstBuyPrice) > 0 ? Number(buyingStock.firstBuyPrice) : currentPriceNum);
          const initialPriceNum = initialBuy;
          const dipBuy = Number(buyingStock.dipBuyPrice) > 0
            ? Number(buyingStock.dipBuyPrice)
            : (Number(buyingStock.secondaryBuyPrice) > 0 ? Number(buyingStock.secondaryBuyPrice) : Number((currentPriceNum * 0.975).toFixed(2)));
          const dipPriceNum = dipBuy;
          const finalPrice = getSelectedBuyPrice(buyingStock, buyPriceMode);
          const totalCost = buyShares * finalPrice;
          const availableCash = Number(simAccount?.availableCash || 0);
          const curDisplayPrice = currentPriceNum > 0 ? currentPriceNum : initialPriceNum;

          return (
            <div style={{ paddingTop: 8 }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>
                      {buyingStock.stockName} ({buyingStock.stockCode})
                    </span>
                    <Tag color="cyan">{buyingStock.industry}</Tag>
                    <Tag color={stratCfg.color}>{stratCfg.label}</Tag>
                  </div>
                  <Tag color="volcano">{buyingStock.winRate}% 上涨概率</Tag>
                </div>
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>当前参考现价</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#cf1322' }}>
                      ¥{curDisplayPrice.toFixed(2)}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>首批建仓价</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1890ff' }}>
                      ¥{initialPriceNum.toFixed(2)}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>回调补仓价</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#52c41a' }}>
                      ¥{dipPriceNum.toFixed(2)}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* 动态点位选择 */}
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  选择建仓买入价格模式：
                </span>
                <Radio.Group
                  value={buyPriceMode}
                  onChange={(e) => setBuyPriceMode(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Radio value="current">
                      <span style={{ fontSize: 13 }}>现价直接买入：<b>¥{curDisplayPrice.toFixed(2)}</b></span>
                    </Radio>
                    <Radio value="initial">
                      <span style={{ fontSize: 13 }}>
                        首批建议建仓价：<b style={{ color: '#1890ff' }}>¥{initialPriceNum.toFixed(2)}</b>
                        <Tag color="blue" style={{ fontSize: 10, marginLeft: 6 }}>分批底仓</Tag>
                      </span>
                    </Radio>
                    <Radio value="dip">
                      <span style={{ fontSize: 13 }}>
                        回调低吸补仓价：<b style={{ color: '#52c41a' }}>¥{dipPriceNum.toFixed(2)}</b>
                        <Tag color="green" style={{ fontSize: 10, marginLeft: 6 }}>
                          预留安全垫 +{buyingStock.safetyBuffer || '2.5'}%
                        </Tag>
                      </span>
                    </Radio>
                  </Space>
                </Radio.Group>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>买入股数 (必须为 100 股整手):</span>
                  {(() => {
                    const alloc = getSuggestedAllocation(buyingStock, simAccount?.totalAsset || 1000000);
                    return (
                      <span style={{ fontSize: 12, color: '#1890ff', cursor: 'pointer' }} onClick={() => setBuyShares(alloc.suggestedShares)}>
                        💡 大模型建议: {alloc.suggestedPctText} ({alloc.suggestedShares} 股 / 约 ¥{Number(alloc.suggestedAmount).toLocaleString()})
                      </span>
                    );
                  })()}
                </div>
                <InputNumber
                  style={{ width: '100%' }}
                  min={100}
                  step={100}
                  value={buyShares}
                  onChange={(val) => setBuyShares(val || 100)}
                  addonAfter="股"
                />
              </div>

              <div style={{ background: 'rgba(24, 144, 255, 0.05)', padding: 12, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#8c8c8c' }}>预计占用资金 (以 ¥{finalPrice.toFixed(2)} 成交):</span>
                  <span style={{ fontWeight: 700, color: '#1890ff' }}>
                    ¥{totalCost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#8c8c8c' }}>当前可用现金余额:</span>
                  <span style={{ fontWeight: 600, color: '#52c41a' }}>
                    ¥{availableCash.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#8c8c8c' }}>建仓后剩余现金:</span>
                  <span style={{ fontWeight: 600, color: availableCash >= totalCost ? '#595959' : '#ff4d4f' }}>
                    ¥{(availableCash - totalCost).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* 设置/重置本金弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarCircleOutlined style={{ color: '#faad14', fontSize: 18 }} />
            <span>设置 / 重置模拟资金账户</span>
          </div>
        }
        open={capitalModalVisible}
        onCancel={() => setCapitalModalVisible(false)}
        onOk={handleResetCapital}
        confirmLoading={resetLoading}
        okText="确认重置并应用"
        cancelText="取消"
        width={450}
      >
        <div style={{ paddingTop: 8 }}>
          <Alert
            message="提示：重置本金将会清空当前所有模拟持仓与历史订单流水，重新开始模拟统计！"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>初始模拟本金金额 (元):</span>
            <InputNumber
              style={{ width: '100%', marginTop: 6 }}
              min={10000}
              step={100000}
              value={inputCapital}
              onChange={(val) => setInputCapital(val || 1000000)}
              formatter={(val) => `¥ ${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => Number(val ? val.replace(/¥\s?|(,*)/g, '') : 1000000)}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {[100000, 500000, 1000000, 2000000, 5000000].map((amt) => (
              <Tag
                key={amt}
                color={inputCapital === amt ? 'blue' : 'default'}
                style={{ cursor: 'pointer', padding: '4px 10px' }}
                onClick={() => setInputCapital(amt)}
              >
                {amt / 10000} 万元
              </Tag>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StockRadarDashboard;
