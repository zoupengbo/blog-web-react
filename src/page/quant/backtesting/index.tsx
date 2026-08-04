import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Form, Input, Select, Button, Statistic, Table, Tag, Space, Spin, Empty, Typography, message, Radio } from 'antd';
import {
  ExperimentOutlined,
  PlayCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  InfoCircleOutlined,
  SlidersOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import * as echarts from 'echarts';
import request from '../../../common/request';
import './index.scss';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface TradeLog {
  time: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  amount: number;
  reason: string;
  profit?: number;
  profitPct?: number;
}

interface EquityPoint {
  time: string;
  equity: number;
  price: number;
}

interface BacktestResults {
  strategyType: string;
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  tradesCount: number;
  equityCurve: EquityPoint[];
  tradesList: TradeLog[];
  klines: number[][]; // [time, open, high, low, close, volume]
}

const QuantBacktesting: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [selectedType, setSelectedType] = useState<string>('ma_crossover');
  const [creationMode, setCreationMode] = useState<'novice' | 'expert'>('novice');
  const [form] = Form.useForm();
  const chartRef = useRef<HTMLDivElement>(null);

  const handleRunBacktest = async (values: any) => {
    setLoading(true);
    setResults(null);
    const { strategyType, symbol, initialCapital, trendType, volatilityRate, ...parameters } = values;

    try {
      const payload: any = {
        strategyType,
        symbol,
        initialCapital: parseFloat(initialCapital),
        trendType,
        volatilityRate
      };

      if (creationMode === 'novice') {
        payload.riskPreference = values.riskPreference || 'balanced';
      } else {
        payload.parameters = parameters;
      }

      const res = await request.post('/quant/backtest', payload);

      if (res && res.code === 200) {
        setResults(res.data);
        message.success('策略回测完成！');
      }
    } catch (err) {
      console.error(err);
      message.error('运行回测失败，请检查参数设置');
    } finally {
      setLoading(false);
    }
  };

  // Render KLine & Equity curve EChart when results are updated
  useEffect(() => {
    if (!results || !chartRef.current) return;

    const myChart = echarts.init(chartRef.current);

    const times = results.equityCurve.map(pt => pt.time);
    const prices = results.equityCurve.map(pt => pt.price);
    const equities = results.equityCurve.map(pt => pt.equity);

    // Map trades into buy/sell chart marks
    const markData: any[] = [];
    results.tradesList.forEach(tr => {
      // Find the index in equityCurve matching or closest to this trade time
      // For backtest generated trades, time is a string. Find matching time index
      const matchingIndex = results.equityCurve.findIndex(pt => {
        if (!tr.time) return false;
        const timeParts = tr.time.split(' ');
        const timePart = timeParts.length > 1 ? timeParts[1] : tr.time;
        return pt.time.includes(timePart) || (tr.time.length >= 15 && pt.time.includes(tr.time.substring(10, 15)));
      });

      if (matchingIndex !== -1) {
        markData.push({
          name: tr.type === 'buy' ? '买入信号' : '卖出信号',
          value: tr.price,
          xAxis: times[matchingIndex],
          yAxis: tr.price,
          itemStyle: {
            color: tr.type === 'buy' ? '#52c41a' : '#f5222d'
          },
          symbol: tr.type === 'buy' ? 'triangle' : 'triangle',
          symbolSize: 12,
          symbolRotate: tr.type === 'buy' ? 0 : 180,
          label: {
            show: true,
            formatter: tr.type === 'buy' ? 'B' : 'S',
            position: tr.type === 'buy' ? 'bottom' : 'top',
            color: tr.type === 'buy' ? '#52c41a' : '#f5222d',
            fontWeight: 'bold'
          }
        });
      }
    });

    const option = {
      title: { text: '行情走势 & 账户资产曲线', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: { data: [`${results.symbol} 价格`, '账户资产值'], bottom: 0 },
      grid: [
        { left: '3%', right: '8%', height: '40%', containLabel: true }, // K-line grid
        { left: '3%', right: '8%', top: '55%', height: '35%', containLabel: true } // Equity grid
      ],
      xAxis: [
        {
          type: 'category',
          data: times,
          boundaryGap: false,
          axisLine: { onZero: false },
          splitLine: { show: false },
          gridIndex: 0
        },
        {
          type: 'category',
          data: times,
          boundaryGap: false,
          axisLine: { onZero: false },
          gridIndex: 1
        }
      ],
      yAxis: [
        {
          name: '资产价格 ($)',
          type: 'value',
          scale: true,
          splitLine: { lineStyle: { type: 'dashed' } },
          gridIndex: 0
        },
        {
          name: '资产余额 ($)',
          type: 'value',
          scale: true,
          splitLine: { lineStyle: { type: 'dashed' } },
          gridIndex: 1
        }
      ],
      series: [
        {
          name: `${results.symbol} 价格`,
          type: 'line',
          data: prices,
          smooth: true,
          showSymbol: false,
          itemStyle: { color: '#fa8c16' },
          lineStyle: { width: 2 },
          markPoint: {
            data: markData
          },
          xAxisIndex: 0,
          yAxisIndex: 0
        },
        {
          name: '账户资产值',
          type: 'line',
          data: equities,
          smooth: true,
          showSymbol: false,
          itemStyle: { color: '#1890ff' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(24,144,255,0.3)' },
              { offset: 1, color: 'rgba(24,144,255,0.01)' }
            ])
          },
          lineStyle: { width: 3 },
          xAxisIndex: 1,
          yAxisIndex: 1
        }
      ]
    };

    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());

    return () => {
      myChart.dispose();
    };
  }, [results]);

  const getSharpeStars = (sr: number) => {
    if (sr >= 1.5) return '⭐⭐⭐⭐⭐ (极稳健，躺着收租)';
    if (sr >= 0.8) return '⭐⭐⭐⭐ (表现优异，稳步攀升)';
    if (sr >= 0.2) return '⭐⭐⭐ (正常起伏，温和上扬)';
    if (sr >= -0.2) return '⭐⭐ (回撤剧烈，表现一般)';
    return '⭐ (颠簸频繁，风险极大)';
  };

  const renderParametersForm = () => {
    switch (selectedType) {
      case 'ma_crossover':
        return (
          <>
            <Form.Item name="shortPeriod" label="短期均线周期 (Short SMA)" rules={[{ required: true, message: '请输入均线周期' }]}>
              <Input type="number" />
            </Form.Item>
            <Form.Item name="longPeriod" label="长期均线周期 (Long SMA)" rules={[{ required: true, message: '请输入均线周期' }]}>
              <Input type="number" />
            </Form.Item>
          </>
        );
      case 'grid':
        return (
          <>
            <Form.Item name="lowerPrice" label="区间下限价格 (USDT)" rules={[{ required: true, message: '请输入下限价格' }]}>
              <Input type="number" />
            </Form.Item>
            <Form.Item name="upperPrice" label="区间上限价格 (USDT)" rules={[{ required: true, message: '请输入上限价格' }]}>
              <Input type="number" />
            </Form.Item>
            <Form.Item name="gridCount" label="网格划分格子数" rules={[{ required: true, message: '请输入划分网格数' }]}>
              <Input type="number" />
            </Form.Item>
          </>
        );
      case 'dual_thrust':
        return (
          <>
            <Form.Item name="period" label="对比周期 K线数 (Period)" rules={[{ required: true, message: '请输入参考周期数' }]}>
              <Input type="number" />
            </Form.Item>
            <Form.Item name="k1" label="BuyLine上轨系数 (K1)" rules={[{ required: true, message: '请输入K1' }]}>
              <Input type="number" step="0.1" />
            </Form.Item>
            <Form.Item name="k2" label="SellLine下轨系数 (K2)" rules={[{ required: true, message: '请输入K2' }]}>
              <Input type="number" step="0.1" />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  const tradeColumns = [
    {
      title: '第几笔交易',
      key: 'index',
      render: (text: any, record: any, index: number) => index + 1
    },
    {
      title: '交易时刻',
      dataIndex: 'time',
      key: 'time'
    },
    {
      title: '机器人动作',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'buy' ? 'green' : 'red'}>
          {type === 'buy' ? '低吸买进 📥' : '高抛变现 📤'}
        </Tag>
      )
    },
    {
      title: '成交价',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `$${price.toFixed(2)}`
    },
    {
      title: '交易股数',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number) => qty.toFixed(4)
    },
    {
      title: '买卖金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amt: number) => `$${amt.toFixed(2)}`
    },
    {
      title: '单笔落袋净赚',
      dataIndex: 'profit',
      key: 'profit',
      render: (profit: number, record: any) => {
        if (record.type === 'buy' || profit === undefined) return '-';
        const color = profit >= 0 ? '#52c41a' : '#f5222d';
        return <span style={{ color, fontWeight: 'bold' }}>{profit >= 0 ? '+' : ''}${profit.toFixed(2)} ({record.profitPct.toFixed(2)}%)</span>;
      }
    },
    {
      title: '出手理由 (机器人决策心声)',
      dataIndex: 'reason',
      key: 'reason'
    }
  ];

  return (
    <div className="quant-backtest">
      <div className="backtest-header">
        <Space size={12}>
          <ExperimentOutlined className="header-icon" />
          <div>
            <h2>🧪 模拟太空舱测试 (回测实验室)</h2>
            <p>使用历史 K 线行情对您的小机器人进行演练，提前观察财富变动曲线</p>
          </div>
        </Space>
      </div>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        {/* Left Config Panel */}
        <Col xs={24} lg={7}>
          <Card title={<Space><SlidersOutlined /> 模拟测试配置</Space>} className="glass-card shadow-card">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleRunBacktest}
              initialValues={{
                strategyType: 'ma_crossover',
                symbol: 'BTC/USDT',
                initialCapital: 10000,
                trendType: 'highly_bullish',
                volatilityRate: 'high',
                riskPreference: 'balanced',
                shortPeriod: 5,
                longPeriod: 20,
                lowerPrice: 61000,
                upperPrice: 66000,
                gridCount: 5,
                period: 5,
                k1: 0.5,
                k2: 0.5
              }}
            >
              <Form.Item name="strategyType" label="测试哪一个机器人">
                <Select onChange={(val) => setSelectedType(val)}>
                  <Option value="ma_crossover">趋势大波段捕手 📈 (双均线交叉)</Option>
                  <Option value="grid">横盘震荡吸金器 📊 (网格交易)</Option>
                  <Option value="dual_thrust">爆发瞬间追击手 ⚡ (Dual Thrust)</Option>
                </Select>
              </Form.Item>

              <Form.Item name="symbol" label="选择模拟投资产品">
                <Select>
                  <Option value="BTC/USDT">比特币 (BTC/USDT)</Option>
                  <Option value="ETH/USDT">以太坊 (ETH/USDT)</Option>
                  <Option value="AAPL">苹果股票 (AAPL)</Option>
                </Select>
              </Form.Item>

              <Form.Item name="initialCapital" label="给机器人的虚拟启动资金 ($)" rules={[{ required: true, message: '请输入回测资金' }]}>
                <Input type="number" addonAfter="USDT" />
              </Form.Item>

              <Title level={5} style={{ fontSize: '13px', color: '#8c8c8c', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                时光机市场环境设置
              </Title>

              <Row gutter={8}>
                <Col span={12}>
                  <Form.Item name="trendType" label="设定虚拟市场大势">
                    <Select>
                      <Option value="highly_bullish">强劲牛市 (大幅上涨 🚀)</Option>
                      <Option value="bullish">温和牛市 (波动走高 📈)</Option>
                      <Option value="sideways">震荡横盘 (来回起伏 📊)</Option>
                      <Option value="bearish">熊市下跌 (行情低迷 📉)</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="volatilityRate" label="设定市场颠簸程度">
                    <Select>
                      <Option value="high">高起伏率 (数字货币风格)</Option>
                      <Option value="medium">中起伏率 (普通股票风格)</Option>
                      <Option value="low">低起伏率 (平稳指数风格)</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', margin: '8px 0 16px 0' }}>
                <span style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>参数配置方式</span>
                <Radio.Group 
                  value={creationMode} 
                  onChange={(e) => setCreationMode(e.target.value)} 
                  optionType="button" 
                  buttonStyle="solid"
                  size="small"
                  style={{ width: '100%' }}
                >
                  <Radio.Button value="novice" style={{ width: '50%', textAlign: 'center' }}>✨ 新手智能一键</Radio.Button>
                  <Radio.Button value="expert" style={{ width: '50%', textAlign: 'center' }}>⚙️ 专家全手动</Radio.Button>
                </Radio.Group>
              </div>

              {creationMode === 'novice' ? (
                <Form.Item 
                  name="riskPreference" 
                  label="为模拟机器人指定性格"
                  rules={[{ required: true }]}
                >
                  <Select placeholder="选择理财性格">
                    <Option value="conservative">保守型 🛡️ (防守大均线/窄网格，极稳)</Option>
                    <Option value="balanced">平衡型 ⚖️ (中等周期，适应性强)</Option>
                    <Option value="aggressive">进取型 🚀 (追求大波动收益，频繁出手)</Option>
                  </Select>
                </Form.Item>
              ) : (
                <>
                  <Title level={5} style={{ fontSize: '13px', color: '#8c8c8c', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                    策略专属数学参数
                  </Title>
                  {renderParametersForm()}
                </>
              )}

              <Button
                type="primary"
                htmlType="submit"
                icon={<PlayCircleOutlined />}
                loading={loading}
                block
                style={{ height: '40px', marginTop: '16px' }}
              >
                🚀 开启时光穿梭模拟测试
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Right Output Panel */}
        <Col xs={24} lg={17}>
          {loading && (
            <Card className="glass-card loading-card" style={{ height: '620px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Space direction="vertical" align="center" size={16}>
                <Spin size="large" />
                <Text type="secondary" style={{ fontSize: '16px' }}>⏳ 时空隧道已开启，机器人正在对历史数据进行全速模拟交易...</Text>
              </Space>
            </Card>
          )}

          {!loading && !results && (
            <Card className="glass-card placeholder-card" style={{ height: '620px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty
                image={<ExperimentOutlined style={{ fontSize: '64px', color: '#bfbfbf' }} />}
                description={
                  <Space direction="vertical" size={12}>
                    <Title level={4}>⌛ 准备开始穿越时空测试您的机器人</Title>
                    <Paragraph type="secondary" style={{ maxWidth: '400px', margin: '0 auto' }}>
                      请在左侧参数配置栏中选择您想测试的策略、初始资金和大盘趋势，点击按钮开启时光演练，检验机器人是否能带您赚钱。
                    </Paragraph>
                  </Space>
                }
              />
            </Card>
          )}

          {results && !loading && (
            <div className="backtest-results-panel">
              {/* Stats Metrics Cards */}
              <Row gutter={[16, 16]}>
                <Col xs={12} md={8}>
                  <Card className="metric-card shadow-card">
                    <Statistic
                      title="📈 模拟期间净收益率"
                      value={results.totalReturn}
                      precision={2}
                      prefix={results.totalReturn >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                      valueStyle={{ color: results.totalReturn >= 0 ? '#3f8600' : '#cf1322', fontWeight: 'bold' }}
                      suffix="%"
                    />
                    <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px' }}>
                      虚拟盈亏额: ${ (results.finalCapital - results.initialCapital).toFixed(2) }
                    </div>
                  </Card>
                </Col>
                <Col xs={12} md={8}>
                  <Card className="metric-card shadow-card">
                    <Statistic
                      title="💰 期末帮我赚到的总家当"
                      value={results.finalCapital}
                      precision={2}
                      prefix="$"
                      valueStyle={{ fontWeight: 'bold' }}
                    />
                    <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px' }}>
                      初始代入虚拟资金: ${results.initialCapital.toFixed(2)}
                    </div>
                  </Card>
                </Col>
                <Col xs={12} md={8}>
                  <Card className="metric-card shadow-card">
                    <Statistic
                      title="📉 最坏情况可能亏钱的幅度"
                      value={results.maxDrawdown}
                      precision={2}
                      valueStyle={{ color: results.maxDrawdown >= 15 ? '#cf1322' : results.maxDrawdown >= 8 ? '#fa8c16' : '#3f8600', fontWeight: 'bold' }}
                      suffix="%"
                    />
                    <div style={{ fontSize: '11px', color: results.maxDrawdown >= 15 ? '#f5222d' : results.maxDrawdown >= 8 ? '#fa8c16' : '#52c41a', marginTop: '4px', fontWeight: 'bold' }}>
                      风险评级: {results.maxDrawdown >= 15 ? '🚨 风险极高' : results.maxDrawdown >= 8 ? '⚠️ 中等回撤' : '🛡️ 稳妥极安全'}
                    </div>
                  </Card>
                </Col>
                <Col xs={12} md={8} style={{ marginTop: '16px' }}>
                  <Card className="metric-card shadow-card">
                    <Statistic
                      title="⭐ 机器人赚钱稳健星级"
                      value={results.sharpeRatio}
                      precision={2}
                      valueStyle={{ color: results.sharpeRatio >= 0.5 ? '#3f8600' : '#fa8c16', fontWeight: 'bold' }}
                    />
                    <div style={{ fontSize: '11px', color: '#1890ff', marginTop: '4px', fontWeight: 'bold' }}>
                      稳健评估: {getSharpeStars(results.sharpeRatio)}
                    </div>
                  </Card>
                </Col>
                <Col xs={12} md={8} style={{ marginTop: '16px' }}>
                  <Card className="metric-card shadow-card">
                    <Statistic
                      title="⚡ 机器人模拟出手次数"
                      value={results.tradesCount}
                      valueStyle={{ fontWeight: 'bold' }}
                      suffix="次"
                    />
                    <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px' }}>
                      包含低吸与高抛全周期
                    </div>
                  </Card>
                </Col>
                <Col xs={12} md={8} style={{ marginTop: '16px' }}>
                  <Card className="metric-card shadow-card">
                    <Statistic
                      title="🏆 交易胜利次数占比 (胜率)"
                      value={results.tradesCount > 0 ? (results.tradesList.filter(tr => tr.type === 'sell' && (tr.profit || 0) > 0).length / Math.floor(results.tradesCount / 2) * 100) : 0}
                      precision={1}
                      valueStyle={{ color: '#3f8600', fontWeight: 'bold' }}
                      suffix="%"
                    />
                    <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px' }}>
                      卖出平仓单中盈利占比
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* Chart Card */}
              <Card title={<Space><LineChartOutlined /> 📊 模拟测试盈亏曲线走势图</Space>} className="shadow-card" style={{ marginTop: '24px' }}>
                <div ref={chartRef} style={{ width: '100%', height: '420px' }}></div>
              </Card>

              {/* Transactions Logs Table */}
              <Card title={<Space><InfoCircleOutlined /> 📜 机器人模拟期间的详细成交账单</Space>} className="shadow-card" style={{ marginTop: '24px' }}>
                <Table
                  dataSource={results.tradesList}
                  columns={tradeColumns}
                  rowKey="time"
                  pagination={{ pageSize: 8 }}
                  size="middle"
                  locale={{ emptyText: '时光模拟中机器人没有做买卖。提示：建议让市场大势更具波动性，或切换为更加敏感的进取型性格机器人！' }}
                />
              </Card>
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default QuantBacktesting;
