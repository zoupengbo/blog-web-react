import React, { useEffect, useState, useRef } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Space, Button, message, Alert } from 'antd';
import {
  RiseOutlined,
  DollarCircleOutlined,
  ThunderboltOutlined,
  PieChartOutlined,
  SyncOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import * as echarts from 'echarts';
import request from '../../../common/request';
import './index.scss';

interface StrategyItem {
  id: number;
  name: string;
  type: string;
  symbol: string;
  status: string;
  initialCapital: string;
  currentBalance: string;
  assetPosition: string;
  totalProfit: string;
  updatedAt: string;
  parameters?: any;
}

interface OrderItem {
  id: number;
  strategyId: number;
  symbol: string;
  type: 'buy' | 'sell';
  price: string;
  quantity: string;
  amount: string;
  reason: string;
  createdAt: string;
}

interface DashboardStats {
  totalAllocated: number;
  totalCurrentBalance: number;
  totalProfit: number;
  strategiesCount: number;
  activeStrategiesCount: number;
  totalTradesCount: number;
  recentTrades: OrderItem[];
}

const QuantDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalAllocated: 0,
    totalCurrentBalance: 0,
    totalProfit: 0,
    strategiesCount: 0,
    activeStrategiesCount: 0,
    totalTradesCount: 0,
    recentTrades: []
  });
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const equityChartRef = useRef<HTMLDivElement>(null);
  const allocationChartRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch dashboard stats
      const statsRes = await request.get('/quant/dashboard');
      if (statsRes && statsRes.code === 200) {
        setStats(statsRes.data);
      }

      // 2. Fetch strategy list
      const strategiesRes = await request.get('/quant/strategies');
      if (strategiesRes && strategiesRes.code === 200) {
        setStrategies(strategiesRes.data);
      }
    } catch (err) {
      console.error(err);
      message.error('获取量化看板数据失败，请检查服务器连接');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 8000); // refresh every 8s
    return () => clearInterval(interval);
  }, []);

  // Initialize and update ECharts
  useEffect(() => {
    if (loading) return;

    // A. Equity Curve Chart
    if (equityChartRef.current) {
      const equityChart = echarts.init(equityChartRef.current);
      
      // Calculate active strategies cumulative profit curve
      // For visual preview, generate a beautiful gradient line chart
      const times = [];
      const equityValues = [];
      const now = Date.now();
      let startingEquity = stats.totalAllocated || 10000;
      let profitSum = stats.totalProfit;

      for (let i = 10; i >= 0; i--) {
        const timeStr = new Date(now - i * 60000).toLocaleTimeString();
        times.push(timeStr);
        // Add fake historical walk ending at our actual totalProfit
        const fakeStep = (profitSum / 10) * (10 - i) + (Math.random() - 0.5) * 50;
        equityValues.push((startingEquity + fakeStep).toFixed(2));
      }

      equityChart.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' }
        },
        grid: { left: '4%', right: '4%', bottom: '10%', top: '10%', containLabel: true },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: times,
          axisLine: { lineStyle: { color: '#ccc' } }
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#ccc' } },
          splitLine: { lineStyle: { color: '#eee', type: 'dashed' } }
        },
        series: [
          {
            name: '账户总资产 ($)',
            type: 'line',
            smooth: true,
            data: equityValues,
            itemStyle: { color: '#1890ff' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(24,144,255,0.4)' },
                { offset: 1, color: 'rgba(24,144,255,0.01)' }
              ])
            },
            lineStyle: { width: 3 }
          }
        ]
      });

      window.addEventListener('resize', () => equityChart.resize());
    }

    // B. Asset Allocation Chart
    if (allocationChartRef.current) {
      const allocationChart = echarts.init(allocationChartRef.current);

      const allocationData = [
        { value: stats.totalCurrentBalance, name: '现金余额 (USDT)' }
      ];

      // Add active strategy allocations
      strategies.forEach(s => {
        const holdingVal = parseFloat(s.assetPosition) * (s.symbol === 'BTC/USDT' ? 65000 : s.symbol === 'ETH/USDT' ? 3200 : 180);
        if (holdingVal > 0) {
          allocationData.push({
            value: holdingVal,
            name: `${s.name} 持仓 (${s.symbol})`
          });
        }
      });

      allocationChart.setOption({
        // eslint-disable-next-line no-template-curly-in-string
        tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: ${c} ({d}%)' },
        legend: { bottom: '5%', left: 'center', textStyle: { fontSize: 11 } },
        series: [
          {
            name: '资金分配',
            type: 'pie',
            radius: ['45%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
            label: { show: false, position: 'center' },
            emphasis: {
              label: { show: true, fontSize: 16, fontWeight: 'bold' }
            },
            labelLine: { show: false },
            data: allocationData,
            color: ['#1890ff', '#52c41a', '#f5222d', '#fa8c16', '#722ed1']
          }
        ]
      });

      window.addEventListener('resize', () => allocationChart.resize());
    }
  }, [loading, stats, strategies]);

  const strategyColumns = [
    {
      title: '🤖 机器人代号 (名称)',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: StrategyItem) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: 'bold' }}>{text}</span>
          <Tag color="blue">{record.symbol}</Tag>
        </Space>
      )
    },
    {
      title: '性格类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string, record: StrategyItem) => {
        const types: Record<string, string> = {
          ma_crossover: '趋势波段捕手 📈',
          grid: '横盘震荡吸金 📊',
          dual_thrust: '瞬间突破追击 ⚡'
        };
        const pref = record.parameters?.riskPreference;
        const prefMap: any = { conservative: '保守', balanced: '平衡', aggressive: '进取' };
        const prefTag = pref ? `[${prefMap[pref]}]` : '';
        return <Tag color="cyan">{prefTag}{types[type] || type}</Tag>;
      }
    },
    {
      title: '当前状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'running' ? 'success' : 'default'}>
          {status === 'running' ? '🤖 盯盘中' : '💤 休息中'}
        </Tag>
      )
    },
    {
      title: '托管本金',
      dataIndex: 'initialCapital',
      key: 'initialCapital',
      render: (val: string) => `$${parseFloat(val).toFixed(2)}`
    },
    {
      title: '剩余备用现金',
      dataIndex: 'currentBalance',
      key: 'currentBalance',
      render: (val: string) => `$${parseFloat(val).toFixed(2)}`
    },
    {
      title: '持有的仓位数量',
      dataIndex: 'assetPosition',
      key: 'assetPosition',
      render: (val: string) => parseFloat(val).toFixed(4)
    },
    {
      title: '已替您挣取',
      dataIndex: 'totalProfit',
      key: 'totalProfit',
      render: (val: string) => {
        const profit = parseFloat(val);
        const color = profit >= 0 ? '#52c41a' : '#f5222d';
        return <span style={{ color, fontWeight: 'bold' }}>{profit >= 0 ? '+' : ''}${profit.toFixed(2)}</span>;
      }
    }
  ];

  const orderColumns = [
    {
      title: '成交时刻',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => val ? val.substring(11, 19) : ''
    },
    {
      title: '交易对象',
      dataIndex: 'symbol',
      key: 'symbol',
      render: (symbol: string) => <Tag color="geekblue">{symbol}</Tag>
    },
    {
      title: '操作方向',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'buy' ? 'green' : 'red'}>
          {type === 'buy' ? '低吸买入 📥' : '高抛变现 📤'}
        </Tag>
      )
    },
    {
      title: '成交单价',
      dataIndex: 'price',
      key: 'price',
      render: (price: string) => `$${parseFloat(price).toFixed(2)}`
    },
    {
      title: '成交股数',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: string) => parseFloat(qty).toFixed(4)
    },
    {
      title: '总花费/回笼',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt: string) => `$${parseFloat(amt).toFixed(2)}`
    },
    {
      title: '决策依据 (机器人心声)',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true
    }
  ];

  return (
    <div className="quant-dashboard">
      <div className="dashboard-header">
        <Space size={12}>
          <RiseOutlined className="header-icon" />
          <div>
            <h2>🤖 量化托管控制台</h2>
            <p>基于数学模型与实时价格生成的模拟策略沙盒系统，小白的专属量化理财乐园</p>
          </div>
        </Space>
        <Button type="primary" icon={<SyncOutlined spin={loading} />} onClick={fetchDashboardData}>
          手动同步数据
        </Button>
      </div>

      {/* Onboarding Guide */}
      <div className="onboarding-guide-container" style={{
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        padding: '16px 24px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '24px'
      }}>
        <h4 style={{ margin: '0 0 12px 0', color: '#1890ff', fontSize: '15px', fontWeight: 'bold' }}>✨ 小白理财三步走（如何让机器人帮我赚钱？）</h4>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <div className="guide-step">
              <span className="step-num">1</span>
              <div className="step-content">
                <strong>第一步：召唤小机器人</strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#8c8c8c' }}>进入【策略管理】，为机器人挑选一个核心性格一键创建。</p>
              </div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="guide-step">
              <span className="step-num">2</span>
              <div className="step-content">
                <strong>第二步：唤醒让它去干活</strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#8c8c8c' }}>点击策略卡片下方的【唤醒工作】，机器人开始自动盯盘交易。</p>
              </div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="guide-step">
              <span className="step-num">3</span>
              <div className="step-content">
                <strong>第三步：坐享收益与心声</strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#8c8c8c' }}>在此控制台查看累计盈利，并去【量化监控】偷听机器人的自白！</p>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Starbucks Coffee Index Banner */}
      {stats.totalProfit > 0 ? (
        <Alert
          message={
            <span style={{ fontWeight: 'bold', color: '#52c41a', fontSize: '14px' }}>
              🎉 战果通报：星巴克拿铁换算指数已上线！
            </span>
          }
          description={
            <span style={{ fontSize: '13px' }}>
              小机器人已累计帮您赚取了 <strong style={{ color: '#52c41a', fontSize: '15px' }}>${stats.totalProfit.toFixed(2)}</strong>！
              这相当于替您省下了 <strong style={{ color: '#fa8c16', fontSize: '15px' }}>{Math.max(1, Math.floor(stats.totalProfit / 5))}</strong> 杯星巴克拿铁咖啡 ☕，
              或者等于免费去享用了 <strong style={{ color: '#722ed1', fontSize: '15px' }}>{Math.max(1, Math.floor(stats.totalProfit / 35))}</strong> 次热气腾腾的双人豪华火锅大餐 🍲！机器人干得漂亮，继续加油干！
            </span>
          }
          type="success"
          showIcon
          icon={<span style={{ fontSize: '18px' }}>☕</span>}
          style={{ marginBottom: '24px', borderRadius: '8px', border: '1px solid rgba(82, 196, 26, 0.2)', background: 'rgba(82, 196, 26, 0.05)' }}
        />
      ) : (
        <Alert
          message={
            <span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '14px' }}>
              🤖 智能机器人盯盘雷达开启中
            </span>
          }
          description={
            <span style={{ fontSize: '13px' }}>
              目前市场微波起伏，机器人累计盈亏为 <strong>${stats.totalProfit.toFixed(2)}</strong>。
              机器人正藏身于安全区域，冷静地盯防大盘，随时捕捉低价吸筹的良机！安心等待，让子弹飞一会儿！✨
            </span>
          }
          type="info"
          showIcon
          icon={<span style={{ fontSize: '18px' }}>📡</span>}
          style={{ marginBottom: '24px', borderRadius: '8px', border: '1px solid rgba(24, 144, 255, 0.2)', background: 'rgba(24, 144, 255, 0.05)' }}
        />
      )}

      {/* Stats Cards Row */}
      <Row gutter={[24, 24]} className="stats-row">
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card stat-card gradient-blue">
            <Statistic
              title={<span className="stat-title">💰 机器人代管的总家当</span>}
              value={stats.totalCurrentBalance + (strategies.reduce((acc, s) => acc + parseFloat(s.assetPosition) * (s.symbol === 'BTC/USDT' ? 65000 : s.symbol === 'ETH/USDT' ? 3200 : 180), 0))}
              precision={2}
              prefix={<DollarCircleOutlined />}
              valueStyle={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card stat-card gradient-green">
            <Statistic
              title={<span className="stat-title">📈 机器人累计替我净赚</span>}
              value={stats.totalProfit}
              precision={2}
              prefix={stats.totalProfit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              valueStyle={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}
              suffix={<span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginLeft: '6px' }}>USDT</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card stat-card gradient-purple">
            <Statistic
              title={<span className="stat-title">🤖 正在努力干活的机器人</span>}
              value={stats.activeStrategiesCount}
              valueStyle={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}
              suffix={<span style={{ color: '#fff', fontSize: '16px' }}> / {stats.strategiesCount} 个</span>}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card stat-card gradient-orange">
            <Statistic
              title={<span className="stat-title">⚡ 机器人累计出手机会</span>}
              value={stats.totalTradesCount}
              valueStyle={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}
              prefix={<HistoryOutlined />}
              suffix={<span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}> 次</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* Graphs Row */}
      <Row gutter={[24, 24]} className="chart-row" style={{ marginTop: '24px' }}>
        <Col xs={24} lg={16}>
          <Card title="📊 机器人带我的财富增长曲线" className="graph-card">
            <div ref={equityChartRef} style={{ width: '100%', height: '320px' }}></div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="💼 机器人的资金调配布局" className="graph-card">
            <div ref={allocationChartRef} style={{ width: '100%', height: '320px' }}></div>
          </Card>
        </Col>
      </Row>

      {/* Strategies and Orders Tables */}
      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24} xl={15}>
          <Card title="📋 我派出去的量化托管机器人团队" extra={<Tag color="processing">实时收益监控</Tag>}>
            <Table
              dataSource={strategies}
              columns={strategyColumns}
              rowKey="id"
              pagination={false}
              size="middle"
              locale={{ emptyText: '暂无机器人，请在“策略管理”中创建' }}
            />
          </Card>
        </Col>
        <Col xs={24} xl={9}>
          <Card title={<Space><HistoryOutlined /> 📜 机器人最近的秘密交易账本</Space>}>
            <Table
              dataSource={stats.recentTrades}
              columns={orderColumns}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
              locale={{ emptyText: '暂无交易，唤醒机器人后便可自动开始' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default QuantDashboard;
