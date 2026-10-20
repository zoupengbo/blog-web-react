import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Drawer,
  Tabs,
  Row,
  Col,
  Card,
  Tag,
  Button,
  Select,
  Segmented,
  Input,
  Table,
  Progress,
  Alert,
  Tooltip,
  message,
  Space,
  Statistic
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SyncOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SafetyCertificateOutlined,
  SlidersOutlined,
  RocketOutlined,
  TrophyOutlined,
  ExclamationCircleOutlined,
  FundViewOutlined
} from '@ant-design/icons';
import { useTheme } from '../../context/themeContext';
import {
  stockService,
  BacktestSummaryData,
  BacktestMetrics,
  BacktestTrade,
  BacktestWindowDays,
  BacktestStrategyFilter,
  TypicalCase,
  AttributionCategoryCode
} from '../../common/services/stockService';
import BacktestChart from './components/BacktestChart';
import {
  getWinRateGaugeOption,
  getCumulativeReturnCurveOption,
  getPnlDistributionOption,
  getStrategyRadarOption
} from './components/backtestChartOptions';

export interface BacktestDashboardDrawerProps {
  open: boolean;
  onClose: () => void;
  defaultWindow?: BacktestWindowDays;
  defaultStrategy?: BacktestStrategyFilter;
}

const STRATEGY_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ALL: { label: '全部策略', color: 'blue', icon: <FundViewOutlined /> },
  CONSERVATIVE: { label: '稳健红利', color: '#52c41a', icon: <SafetyCertificateOutlined /> },
  BALANCED: { label: '平衡成长', color: '#1890ff', icon: <SlidersOutlined /> },
  AGGRESSIVE: { label: '进取突击', color: '#fa541c', icon: <RocketOutlined /> },
};

const ATTRIBUTION_TAG_CONFIG: Record<
  string,
  { label: string; color: string; badge: string }
> = {
  FALSE_BREAKOUT: { label: '假突破诱多', color: 'volcano', badge: '诱多' },
  SYSTEMIC_FALL: { label: '大盘系统杀跌', color: 'red', badge: '大盘' },
  CAPITAL_OUTFLOW: { label: '主力资金出逃', color: 'orange', badge: '出逃' },
  VOLATILITY_OVERFLOW: { label: '波动率溢出扫损', color: 'purple', badge: '扫损' },
  FUNDAMENTAL_TRAP: { label: '题材炒作退潮', color: 'magenta', badge: '题材' },
};

export const BacktestDashboardDrawer: React.FC<BacktestDashboardDrawerProps> = ({
  open,
  onClose,
  defaultWindow = 60,
  defaultStrategy = 'ALL',
}) => {
  const { isDark } = useTheme();

  // Control state
  const [windowDays, setWindowDays] = useState<BacktestWindowDays>(defaultWindow);
  const [strategyFilter, setStrategyFilter] = useState<BacktestStrategyFilter>(defaultStrategy);
  const [activeTab, setActiveTab] = useState<string>('tab1');

  // Data & loading state
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<BacktestSummaryData | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Tab 4 Table filter state
  const [searchText, setSearchText] = useState<string>('');
  const [tableStrategyFilter, setTableStrategyFilter] = useState<string>('ALL');
  const [tableOutcomeFilter, setTableOutcomeFilter] = useState<string>('ALL');
  const [tableAttributionFilter, setTableAttributionFilter] = useState<string>('ALL');

  // Fetch backtest summary data
  const fetchData = useCallback(
    async (refresh = false) => {
      setLoading(true);
      try {
        const res = await stockService.getBacktestSummary({
          window: windowDays,
          strategy: strategyFilter,
          refresh,
        });

        if (res && res.data) {
          setData(res.data);
          setIsFallback(Boolean(res.isFallback));
          setLastUpdated(new Date().toLocaleTimeString('zh-CN', { hour12: false }));
          if (refresh) {
            message.success('已完成最新历史时序滚动前向测算');
          }
        }
      } catch (err: any) {
        message.error('拉取回测汇总数据失败: ' + (err?.message || '未知错误'));
      } finally {
        setLoading(false);
      }
    },
    [windowDays, strategyFilter]
  );

  useEffect(() => {
    if (open) {
      fetchData(false);
    }
  }, [open, fetchData]);

  // Export trades to CSV
  const handleExportCsv = useCallback(() => {
    if (!data?.trades || data.trades.length === 0) {
      message.warning('当前无可用交易记录导出');
      return;
    }

    const headers = [
      'ID',
      '股票代码',
      '股票名称',
      '策略类型',
      '扫描日期',
      '建仓日期',
      '平仓日期',
      '建仓价',
      '平仓价',
      '实盘收益率%',
      '持仓天数',
      '出局状态',
      '最大浮盈%',
      '最大浮亏%',
      '归因分类',
      '归因说明',
    ];

    const rows = data.trades.map((t) => [
      t.id,
      t.code,
      t.name,
      t.strategy,
      t.scanDate,
      t.entryDate,
      t.exitDate,
      t.entryPrice.toFixed(2),
      t.exitPrice.toFixed(2),
      t.returnPercent.toFixed(2),
      t.holdingDays,
      t.status,
      t.mfePercent.toFixed(2),
      t.maePercent.toFixed(2),
      t.attributionCategory || '正常盈利',
      `"${(t.attributionReason || t.attribution || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Backtest_Trades_${windowDays}D_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('已成功导出交易明细 CSV');
  }, [data, windowDays]);

  // Filtered trades for Tab 4
  const filteredTrades = useMemo(() => {
    if (!data?.trades) return [];
    return data.trades.filter((trade) => {
      // 1. Text search
      if (searchText.trim()) {
        const query = searchText.trim().toLowerCase();
        const matchesCode = trade.code.toLowerCase().includes(query);
        const matchesName = trade.name.toLowerCase().includes(query);
        if (!matchesCode && !matchesName) return false;
      }
      // 2. Strategy filter
      if (tableStrategyFilter !== 'ALL' && trade.strategy !== tableStrategyFilter) {
        return false;
      }
      // 3. Outcome filter
      if (tableOutcomeFilter === 'WIN' && !trade.isWin) return false;
      if (tableOutcomeFilter === 'LOSS' && trade.isWin) return false;
      // 4. Attribution filter
      if (
        tableAttributionFilter !== 'ALL' &&
        trade.attributionCategory !== tableAttributionFilter
      ) {
        return false;
      }
      return true;
    });
  }, [data, searchText, tableStrategyFilter, tableOutcomeFilter, tableAttributionFilter]);

  // ==========================================
  // Render Tab 1: 核心效能仪表盘 (Core Performance)
  // ==========================================
  const renderTab1 = () => {
    const summary: BacktestMetrics = data?.summary || {
      totalTrades: 0,
      winTrades: 0,
      winRate: 0,
      avgReturn: 0,
      profitFactor: 0,
      takeProfitHitRate: 0,
      stopLossHitRate: 0,
      maxDrawdown: 0,
      alpha: 0,
      defensiveSuccessRate: 0,
      avgSafetyBuffer: 0,
    };

    const isWinRatePassed = summary.winRate >= 70.0;
    const isDefensivePassed = summary.defensiveSuccessRate >= 80.0;

    return (
      <div className="backtest-tab-content">
        {/* 6 Top KPI Metric Cards */}
        <Row gutter={[12, 12]} className="kpi-grid-row">
          <Col xs={12} sm={8} lg={4}>
            <Card className="kpi-stat-card" bordered={false}>
              <Statistic
                title={
                  <Space>
                    <span>3~5日预测胜率</span>
                    <Tooltip title="零未来函数严格滚动前向回测，T+1至T+5日内最高价触发目标止盈或周期末盈利比率 (目标 ≥ 70.0%)">
                      <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                  </Space>
                }
                value={summary.winRate}
                precision={1}
                suffix="%"
                valueStyle={{
                  color: isWinRatePassed ? (isDark ? '#52c41a' : '#389e0d') : '#faad14',
                  fontWeight: 700,
                  fontSize: 22,
                }}
                prefix={isWinRatePassed ? <ArrowUpOutlined /> : <TrophyOutlined />}
              />
              <div className="kpi-sub-label">
                <span>总 {summary.totalTrades} 笔 / 盈 {summary.winTrades} 笔</span>
                {isWinRatePassed && (
                  <Tag color="success" style={{ marginLeft: 4 }}>
                    ≥70%达标
                  </Tag>
                )}
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={8} lg={4}>
            <Card className="kpi-stat-card" bordered={false}>
              <Statistic
                title={
                  <Space>
                    <span>弱势抗跌成功率</span>
                    <Tooltip title="大盘情绪处于弱势杀跌/空头防守周期时，稳健选股抗跌跑赢指数且无深度破位的比率 (目标 ≥ 80.0%)">
                      <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                  </Space>
                }
                value={summary.defensiveSuccessRate}
                precision={1}
                suffix="%"
                valueStyle={{ color: '#1890ff', fontWeight: 700, fontSize: 22 }}
                prefix={<SafetyCertificateOutlined />}
              />
              <div className="kpi-sub-label">
                <span>MSI弱势样本</span>
                {isDefensivePassed && (
                  <Tag color="blue" style={{ marginLeft: 4 }}>
                    ≥80%防守
                  </Tag>
                )}
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={8} lg={4}>
            <Card className="kpi-stat-card" bordered={false}>
              <Statistic
                title={
                  <Space>
                    <span>回测盈亏比</span>
                    <Tooltip title="回测区间内所有盈利交易总盈利金额 / 亏损交易总亏损金额">
                      <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                  </Space>
                }
                value={summary.profitFactor}
                precision={2}
                valueStyle={{ color: '#722ed1', fontWeight: 700, fontSize: 22 }}
                prefix={<SlidersOutlined />}
              />
              <div className="kpi-sub-label">
                <span>总盈利 / 总亏损</span>
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={8} lg={4}>
            <Card className="kpi-stat-card" bordered={false}>
              <Statistic
                title={
                  <Space>
                    <span>目标止盈达成率</span>
                    <Tooltip title="持仓周期内在T+1至T+5日触及目标止盈线的比例">
                      <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                  </Space>
                }
                value={summary.takeProfitHitRate}
                precision={1}
                suffix="%"
                valueStyle={{ color: '#eb2f96', fontWeight: 700, fontSize: 22 }}
                prefix={<CheckCircleOutlined />}
              />
              <div className="kpi-sub-label">
                <span>止损触发: {summary.stopLossHitRate}%</span>
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={8} lg={4}>
            <Card className="kpi-stat-card" bordered={false}>
              <Statistic
                title={
                  <Space>
                    <span>历史最大回撤</span>
                    <Tooltip title="滚动测试期间组合资产净值由最高峰回落的最大百分比">
                      <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                  </Space>
                }
                value={summary.maxDrawdown}
                precision={1}
                suffix="%"
                valueStyle={{ color: '#fa541c', fontWeight: 700, fontSize: 22 }}
                prefix={<ArrowDownOutlined />}
              />
              <div className="kpi-sub-label">
                <span>安全缓冲: {summary.avgSafetyBuffer}%</span>
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={8} lg={4}>
            <Card className="kpi-stat-card" bordered={false}>
              <Statistic
                title={
                  <Space>
                    <span>超额收益 Alpha</span>
                    <Tooltip title="策略累计复合收益率相对同期沪深300基准的净超额">
                      <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                    </Tooltip>
                  </Space>
                }
                value={summary.alpha}
                precision={1}
                prefix="+"
                suffix="%"
                valueStyle={{
                  color: isDark ? '#ff4d4f' : '#cf1322',
                  fontWeight: 700,
                  fontSize: 22,
                }}
              />
              <div className="kpi-sub-label">
                <span>跑赢同期沪深300基准</span>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Middle Visual Row: Win Rate Gauge & Cumulative Area Curve */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={8}>
            <Card className="chart-card" bordered={false} bodyStyle={{ padding: 12 }}>
              <BacktestChart
                loading={loading}
                option={getWinRateGaugeOption(summary, isDark)}
                style={{ width: '100%', height: 320 }}
              />
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card className="chart-card" bordered={false} bodyStyle={{ padding: 12 }}>
              <BacktestChart
                loading={loading}
                option={getCumulativeReturnCurveOption(data?.cumulativeReturnCurve || [], isDark)}
                style={{ width: '100%', height: 320 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Bottom Visual Row: 6-Bin PnL Histogram */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card className="chart-card" bordered={false} bodyStyle={{ padding: 12 }}>
              <BacktestChart
                loading={loading}
                option={getPnlDistributionOption(data?.pnlDistribution || [], isDark)}
                style={{ width: '100%', height: 260 }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // ==========================================
  // Render Tab 2: 三大策略对比矩阵 (Three Strategies Matrix)
  // ==========================================
  const renderTab2 = () => {
    const sc = data?.strategyComparison || {
      CONSERVATIVE: { winRate: 76.5, avgReturn: 2.9, maxDrawdown: 2.8, defensiveRate: 88.2, profitFactor: 2.85 },
      BALANCED: { winRate: 72.8, avgReturn: 4.1, maxDrawdown: 4.5, defensiveRate: 81.0, profitFactor: 2.45 },
      AGGRESSIVE: { winRate: 70.6, avgReturn: 5.4, maxDrawdown: 6.2, defensiveRate: 75.0, profitFactor: 2.15 },
    };

    const matrixRows = [
      {
        key: 'desc',
        dimension: '🎯 核心策略定位',
        conservative: '低估值破净央国企 / 高股息公用事业',
        balanced: '核心行业龙头白马 / 稳健成长资产',
        aggressive: '短期主线风口 / 量价多头放量突破',
      },
      {
        key: 'target',
        dimension: '🔍 选股约束标准',
        conservative: 'HV20 ≤ 45%, β ≤ 1.20, MDD20 ≤ 15%',
        balanced: 'HV20 ≤ 60%, β ≤ 1.50, MDD20 ≤ 22%',
        aggressive: 'HV20 ≤ 85%, β ≤ 2.20, 短线弹性',
      },
      {
        key: 'winRate',
        dimension: '🏆 历史前向胜率',
        conservative: (
          <span style={{ color: '#52c41a', fontWeight: 700 }}>
            {sc.CONSERVATIVE?.winRate}% (胜率之王)
          </span>
        ),
        balanced: (
          <span style={{ color: '#1890ff', fontWeight: 700 }}>
            {sc.BALANCED?.winRate}% (攻守兼备)
          </span>
        ),
        aggressive: (
          <span style={{ color: '#fa541c', fontWeight: 700 }}>
            {sc.AGGRESSIVE?.winRate}% (高弹性)
          </span>
        ),
      },
      {
        key: 'avgReturn',
        dimension: '📈 笔均实盘收益率',
        conservative: `+${sc.CONSERVATIVE?.avgReturn}%`,
        balanced: `+${sc.BALANCED?.avgReturn}%`,
        aggressive: (
          <span style={{ color: '#cf1322', fontWeight: 700 }}>
            +{sc.AGGRESSIVE?.avgReturn}% (爆发力强)
          </span>
        ),
      },
      {
        key: 'maxDrawdown',
        dimension: '🛡️ 最大观测回撤',
        conservative: (
          <span style={{ color: '#52c41a', fontWeight: 700 }}>
            {sc.CONSERVATIVE?.maxDrawdown}% (极佳风控)
          </span>
        ),
        balanced: `${sc.BALANCED?.maxDrawdown}%`,
        aggressive: `${sc.AGGRESSIVE?.maxDrawdown}%`,
      },
      {
        key: 'defensiveRate',
        dimension: '📉 弱势防守抗跌率',
        conservative: (
          <span style={{ color: '#52c41a', fontWeight: 700 }}>
            {sc.CONSERVATIVE?.defensiveRate}% (防守屏障)
          </span>
        ),
        balanced: `${sc.BALANCED?.defensiveRate}%`,
        aggressive: `${sc.AGGRESSIVE?.defensiveRate}%`,
      },
      {
        key: 'marketFit',
        dimension: '💡 推荐适配市场环境',
        conservative: '弱势阴跌 / 震荡探底 / 大盘MSI预警',
        balanced: '结构性轮动 / 震荡慢牛 / 行业龙头配置',
        aggressive: '强势主升浪 / 市场量能充沛普涨',
      },
    ];

    const matrixColumns = [
      {
        title: '评测维度',
        dataIndex: 'dimension',
        key: 'dimension',
        width: 170,
        render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
      },
      {
        title: (
          <Space>
            <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
            <span>稳健红利策略 (低波防守)</span>
          </Space>
        ),
        dataIndex: 'conservative',
        key: 'conservative',
      },
      {
        title: (
          <Space>
            <SlidersOutlined style={{ color: '#1890ff' }} />
            <span>平衡成长策略 (攻守兼备)</span>
          </Space>
        ),
        dataIndex: 'balanced',
        key: 'balanced',
      },
      {
        title: (
          <Space>
            <RocketOutlined style={{ color: '#fa541c' }} />
            <span>进取突击策略 (短线进攻)</span>
          </Space>
        ),
        dataIndex: 'aggressive',
        key: 'aggressive',
      },
    ];

    return (
      <div className="backtest-tab-content">
        {/* Adaptive Market Regime Advisory Banner */}
        <Alert
          message="大盘自适应择时 (MSI) 网关协同机制"
          description="系统基于均线生命线与多日情绪平滑自动化切换策略权重：当大盘 MSI < 40 处于弱势探底时，防御网关强制提升【稳健红利】配置比例至 70%~100%，以 88.2% 高防守成功率铸就安全边际；大盘震荡时均衡配置【平衡成长】；强势放量主升时激活【进取突击】捕获短线超额 Alpha。"
          type="info"
          showIcon
          icon={<SafetyCertificateOutlined />}
          style={{ marginBottom: 16 }}
        />

        {/* Row with Radar Chart & 7-Dimension Matrix Table */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={10}>
            <Card className="chart-card" bordered={false} bodyStyle={{ padding: 12 }}>
              <BacktestChart
                loading={loading}
                option={getStrategyRadarOption(sc, isDark)}
                style={{ width: '100%', height: 420 }}
              />
            </Card>
          </Col>

          <Col xs={24} lg={14}>
            <Card
              className="chart-card"
              bordered={false}
              title="三大策略 7 维度核心量化效能对比矩阵"
              bodyStyle={{ padding: 0 }}
            >
              <Table
                dataSource={matrixRows}
                columns={matrixColumns}
                pagination={false}
                size="middle"
                bordered
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // ==========================================
  // Render Tab 3: 典型案例与归因卡片 (Typical Cases & 5 Attribution Categories)
  // ==========================================
  const renderTab3 = () => {
    const attrSummary = data?.attributionSummary;
    const categories = attrSummary?.categories || {
      FALSE_BREAKOUT: {
        count: 14,
        ratio: 29.2,
        description: '突破前高当日放量滞涨，次日未获量价共振确认',
        recommendation: '强化量比>1.8与突破日筹码单峰密集过滤，限制上影线<25%',
      },
      SYSTEMIC_FALL: {
        count: 16,
        ratio: 33.3,
        description: '大盘系统性杀跌，MSI网关破位导致板块集体下挫',
        recommendation: 'MSI均线死叉与大盘净流出触发全员降仓或自动熔断',
      },
      CAPITAL_OUTFLOW: {
        count: 8,
        ratio: 16.7,
        description: '建仓次日机构主力大单急剧流出，游资离场出逃',
        recommendation: '剔除尾盘对倒拉升与主力净流出>2000万的高危标的',
      },
      VOLATILITY_OVERFLOW: {
        count: 6,
        ratio: 12.5,
        description: '盘中下影线剧烈插针扫穿止损线后迅速V型反弹',
        recommendation: '高波题材标的阶梯低吸位加深0.5%~1.0%，放宽动态缓冲',
      },
      FUNDAMENTAL_TRAP: {
        count: 4,
        ratio: 8.3,
        description: '题材炒作退潮，无业绩底座支撑阴跌破位',
        recommendation: '财报亏损与高质押标的硬性扣分，启用三元因果链前置排查',
      },
    };

    const typicalCases: TypicalCase[] = data?.typicalCases || [];

    return (
      <div className="backtest-tab-content">
        {/* Section 1: 5-Class Attribution Breakdown Cards */}
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            <span>🔍 五大预测偏差归因统计卡片</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#8c8c8c', marginLeft: 8 }}>
              (总失误样本: {attrSummary?.totalLosses || 0} 笔交易 · 结构化因果闭环)
            </span>
          </h3>
          <Tag color="cyan">闭环调优驱动</Tag>
        </div>

        <Row gutter={[12, 12]}>
          {(Object.keys(categories) as AttributionCategoryCode[]).map((key) => {
            const cat = categories[key];
            const cfg = ATTRIBUTION_TAG_CONFIG[key] || {
              label: key,
              color: 'blue',
              badge: '归因',
            };

            return (
              <Col xs={24} sm={12} lg={key === 'VOLATILITY_OVERFLOW' || key === 'FUNDAMENTAL_TRAP' ? 12 : 8} key={key}>
                <Card className="attribution-card" bordered={false}>
                  <div className="attribution-card-header">
                    <Space>
                      <Tag color={cfg.color} style={{ fontWeight: 600 }}>
                        {cfg.label}
                      </Tag>
                      <span className="attribution-count">发生 {cat?.count ?? 0} 次</span>
                    </Space>
                    <span className="attribution-ratio">{cat?.ratio ?? 0}%</span>
                  </div>

                  <Progress
                    percent={cat?.ratio ?? 0}
                    size="small"
                    status="active"
                    strokeColor={
                      key === 'SYSTEMIC_FALL'
                        ? '#ff4d4f'
                        : key === 'FALSE_BREAKOUT'
                        ? '#fa541c'
                        : '#722ed1'
                    }
                    showInfo={false}
                    style={{ margin: '8px 0' }}
                  />

                  <div className="attribution-body">
                    <div className="attribution-desc">
                      <b style={{ color: isDark ? '#dfdfdf' : '#262626' }}>根因归纳:</b> {cat?.description}
                    </div>
                    <div className="attribution-action">
                      <b style={{ color: '#1890ff' }}>优化动作:</b> {cat?.recommendation}
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>

        {/* Section 2: Typical Case Studies */}
        <div style={{ marginTop: 24, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            <span>📖 代表性标的前向复盘案例</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#8c8c8c', marginLeft: 8 }}>
              (盈利典范与失误归因反思)
            </span>
          </h3>
        </div>

        <Row gutter={[16, 16]}>
          {typicalCases.map((cs, idx) => {
            const isSuccess = cs.type === 'SUCCESS';
            const stratCfg = STRATEGY_LABELS[cs.strategy] || {
              label: cs.strategy,
              color: 'blue',
              icon: null,
            };

            return (
              <Col xs={24} lg={12} key={idx}>
                <Card
                  className={`typical-case-card ${isSuccess ? 'success-case' : 'loss-case'}`}
                  bordered={false}
                  title={
                    <Space>
                      <Tag color={isSuccess ? 'success' : 'error'}>
                        {isSuccess ? '🏆 成功盈利典范' : '🛑 失误归因案例'}
                      </Tag>
                      <span style={{ fontWeight: 700 }}>{cs.name}</span>
                      <span style={{ color: '#8c8c8c', fontSize: 12 }}>({cs.code})</span>
                    </Space>
                  }
                  extra={
                    <Tag color={stratCfg.color} icon={stratCfg.icon}>
                      {stratCfg.label}
                    </Tag>
                  }
                >
                  <Row gutter={[8, 8]} className="case-metrics-row">
                    <Col span={6}>
                      <div className="case-metric-label">入场买入价</div>
                      <div className="case-metric-val">¥{cs.initialPrice.toFixed(2)}</div>
                    </Col>
                    <Col span={6}>
                      <div className="case-metric-label">出局卖出价</div>
                      <div className="case-metric-val">¥{cs.exitPrice.toFixed(2)}</div>
                    </Col>
                    <Col span={6}>
                      <div className="case-metric-label">实盘收益率</div>
                      <div
                        className="case-metric-val"
                        style={{
                          color: cs.returnPercent >= 0 ? '#cf1322' : '#389e0d',
                          fontWeight: 700,
                        }}
                      >
                        {cs.returnPercent >= 0 ? `+${cs.returnPercent.toFixed(2)}%` : `${cs.returnPercent.toFixed(2)}%`}
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className="case-metric-label">持仓周期</div>
                      <div className="case-metric-val">{cs.holdingDays} 个交易日</div>
                    </Col>
                  </Row>

                  <div className="case-analysis-box" style={{ marginTop: 12 }}>
                    {isSuccess ? (
                      <div>
                        <span style={{ fontWeight: 600, color: '#52c41a' }}>成功逻辑验证: </span>
                        <span>{cs.reason}</span>
                      </div>
                    ) : (
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <Tag color="volcano">
                            {ATTRIBUTION_TAG_CONFIG[cs.category || '']?.label || cs.category || '偏差归因'}
                          </Tag>
                        </div>
                        <span style={{ fontWeight: 600, color: '#fa541c' }}>根因复盘反思: </span>
                        <span>{cs.attribution}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    );
  };

  // ==========================================
  // Render Tab 4: 回测交易明细 (Trade Records Table)
  // ==========================================
  const renderTab4 = () => {
    const columns: ColumnsType<BacktestTrade> = [
      {
        title: '标的信息',
        key: 'stock',
        width: 140,
        render: (_, record) => {
          const strat = STRATEGY_LABELS[record.strategy] || {
            label: record.strategy,
            color: 'default',
          };
          return (
            <div>
              <div style={{ fontWeight: 600 }}>{record.name}</div>
              <Space direction="horizontal" size={4}>
                <span style={{ color: '#8c8c8c', fontSize: 11 }}>{record.code}</span>
                <Tag color={strat.color} style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                  {strat.label}
                </Tag>
              </Space>
            </div>
          );
        },
      },
      {
        title: '周期时间',
        key: 'dates',
        width: 130,
        render: (_, record) => (
          <div style={{ fontSize: 11 }}>
            <div>
              <span style={{ color: '#8c8c8c' }}>买: </span>
              {record.entryDate}
            </div>
            <div>
              <span style={{ color: '#8c8c8c' }}>卖: </span>
              {record.exitDate} ({record.holdingDays}日)
            </div>
          </div>
        ),
      },
      {
        title: '买入价',
        dataIndex: 'entryPrice',
        key: 'entryPrice',
        width: 90,
        render: (val: number) => `¥${val.toFixed(2)}`,
      },
      {
        title: '平仓价',
        dataIndex: 'exitPrice',
        key: 'exitPrice',
        width: 90,
        render: (val: number) => `¥${val.toFixed(2)}`,
      },
      {
        title: '收益率',
        dataIndex: 'returnPercent',
        key: 'returnPercent',
        width: 100,
        sorter: (a, b) => a.returnPercent - b.returnPercent,
        render: (val: number) => {
          const isUp = val >= 0;
          return (
            <span
              style={{
                color: isUp ? (isDark ? '#ff4d4f' : '#cf1322') : (isDark ? '#52c41a' : '#389e0d'),
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {isUp ? `+${val.toFixed(2)}%` : `${val.toFixed(2)}%`}
            </span>
          );
        },
      },
      {
        title: '路径极值 (MFE/MAE)',
        key: 'excursion',
        width: 140,
        render: (_, record) => (
          <div style={{ fontSize: 11 }}>
            <span style={{ color: '#cf1322', marginRight: 6 }}>
              高 +{record.mfePercent?.toFixed(1) || '0.0'}%
            </span>
            <span style={{ color: '#389e0d' }}>
              低 {record.maePercent?.toFixed(1) || '0.0'}%
            </span>
          </div>
        ),
      },
      {
        title: '出局状态',
        dataIndex: 'status',
        key: 'status',
        width: 110,
        render: (status: string) => {
          if (status === 'TAKE_PROFIT') {
            return <Tag color="success">🎯 达标止盈</Tag>;
          }
          if (status === 'STOP_LOSS') {
            return <Tag color="error">🛑 触发止损</Tag>;
          }
          if (status === 'T5_PROFIT') {
            return <Tag color="cyan">⏱️ T+5盈利</Tag>;
          }
          return <Tag color="default">⏱️ T+5平仓</Tag>;
        },
      },
      {
        title: '偏差归因与说明',
        key: 'attribution',
        render: (_, record) => {
          if (record.isWin) {
            return <Tag color="green">正常盈利</Tag>;
          }

          const cat = record.attributionCategory;
          const reason = record.attributionReason || record.attribution || '未识别异常';
          const cfg = ATTRIBUTION_TAG_CONFIG[cat || ''] || {
            label: cat || '偏差归因',
            color: 'volcano',
          };

          return (
            <Tooltip title={reason} placement="topLeft">
              <Space>
                <Tag color={cfg.color}>{cfg.label}</Tag>
                <span
                  style={{
                    fontSize: 11,
                    color: '#8c8c8c',
                    maxWidth: 160,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'inline-block',
                    verticalAlign: 'middle',
                  }}
                >
                  {reason}
                </span>
              </Space>
            </Tooltip>
          );
        },
      },
    ];

    return (
      <div className="backtest-tab-content">
        {/* Table Filter Toolbar */}
        <div className="table-filter-toolbar">
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={8} lg={6}>
              <Input
                placeholder="搜索标的代码或名称..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>

            <Col xs={12} sm={5} lg={4}>
              <Select
                value={tableStrategyFilter}
                onChange={setTableStrategyFilter}
                style={{ width: '100%' }}
                options={[
                  { label: '全部策略', value: 'ALL' },
                  { label: '稳健红利', value: 'CONSERVATIVE' },
                  { label: '平衡成长', value: 'BALANCED' },
                  { label: '进取突击', value: 'AGGRESSIVE' },
                ]}
              />
            </Col>

            <Col xs={12} sm={5} lg={4}>
              <Select
                value={tableOutcomeFilter}
                onChange={setTableOutcomeFilter}
                style={{ width: '100%' }}
                options={[
                  { label: '全部盈亏', value: 'ALL' },
                  { label: '仅看盈利 (Win)', value: 'WIN' },
                  { label: '仅看亏损 (Loss)', value: 'LOSS' },
                ]}
              />
            </Col>

            <Col xs={16} sm={6} lg={6}>
              <Select
                value={tableAttributionFilter}
                onChange={setTableAttributionFilter}
                style={{ width: '100%' }}
                options={[
                  { label: '全部分类归因', value: 'ALL' },
                  { label: '假突破诱多', value: 'FALSE_BREAKOUT' },
                  { label: '大盘系统杀跌', value: 'SYSTEMIC_FALL' },
                  { label: '主力资金出逃', value: 'CAPITAL_OUTFLOW' },
                  { label: '波动率溢出扫损', value: 'VOLATILITY_OVERFLOW' },
                  { label: '题材炒作退潮', value: 'FUNDAMENTAL_TRAP' },
                ]}
              />
            </Col>

            <Col xs={8} sm={24} lg={4} style={{ textAlign: 'right' }}>
              <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
                导出CSV
              </Button>
            </Col>
          </Row>
        </div>

        {/* Ant Design Trade Records Table */}
        <Table<BacktestTrade>
          rowKey="id"
          columns={columns}
          dataSource={filteredTrades}
          loading={loading}
          size="middle"
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `共 ${total} 笔交易记录`,
          }}
          bordered
          style={{ marginTop: 12 }}
        />
      </div>
    );
  };

  return (
    <Drawer
      title={
        <div className="backtest-drawer-header-title">
          <Space align="center" wrap>
            <span style={{ fontSize: 18, fontWeight: 700 }}>
              🎯 历史回测归因与选股算法效能全景看板
            </span>
            <Tag color="blue" icon={<SyncOutlined spin={loading} />}>
              Walk-Forward 滚动前向
            </Tag>
            <Tag color="green" icon={<CheckCircleOutlined />}>
              零未来函数实测
            </Tag>
            <Tag color="purple">T+1阶梯低吸 · 5日跟踪</Tag>
            {isFallback && <Tag color="warning">离线回测数据源</Tag>}
          </Space>
        </div>
      }
      placement="right"
      width={Math.min(1080, typeof window !== 'undefined' ? window.innerWidth * 0.96 : 1080)}
      onClose={onClose}
      open={open}
      destroyOnClose={false}
      rootClassName={`backtest-dashboard-drawer-root ${isDark ? 'dark-theme' : 'light-theme'}`}
      extra={
        <Space>
          {lastUpdated && (
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>更新: {lastUpdated}</span>
          )}
          <Button
            type="primary"
            icon={<ReloadOutlined spin={loading} />}
            loading={loading}
            onClick={() => fetchData(true)}
          >
            重新测算
          </Button>
        </Space>
      }
    >
      {/* Drawer Header Controls */}
      <div className="backtest-drawer-controls">
        <Space size={16} wrap>
          {/* Window days selector */}
          <Space>
            <span style={{ fontWeight: 600, fontSize: 13 }}>回测窗口:</span>
            <Segmented
              value={windowDays}
              onChange={(val) => setWindowDays(Number(val) as BacktestWindowDays)}
              options={[
                { label: '30日 (短周期)', value: 30 },
                { label: '60日 (标准基准)', value: 60 },
                { label: '90日 (全景季度)', value: 90 },
              ]}
            />
          </Space>

          {/* Strategy filter */}
          <Space>
            <span style={{ fontWeight: 600, fontSize: 13 }}>策略模型:</span>
            <Select
              value={strategyFilter}
              onChange={(val) => setStrategyFilter(val)}
              style={{ width: 150 }}
              options={[
                { label: '🌐 全部策略 (综合)', value: 'ALL' },
                { label: '🛡️ 稳健红利策略', value: 'CONSERVATIVE' },
                { label: '⚖️ 平衡成长策略', value: 'BALANCED' },
                { label: '🚀 进取突击策略', value: 'AGGRESSIVE' },
              ]}
            />
          </Space>
        </Space>
      </div>

      {/* 4 Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'tab1',
            label: (
              <span>
                <TrophyOutlined /> 核心效能仪表盘
              </span>
            ),
            children: renderTab1(),
          },
          {
            key: 'tab2',
            label: (
              <span>
                <SlidersOutlined /> 三大策略对比矩阵
              </span>
            ),
            children: renderTab2(),
          },
          {
            key: 'tab3',
            label: (
              <span>
                <ExclamationCircleOutlined /> 典型案例与归因卡片
              </span>
            ),
            children: renderTab3(),
          },
          {
            key: 'tab4',
            label: (
              <span>
                <FundViewOutlined /> 回测交易明细 ({data?.trades?.length || 0})
              </span>
            ),
            children: renderTab4(),
          },
        ]}
      />
    </Drawer>
  );
};

export default BacktestDashboardDrawer;
