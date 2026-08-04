import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Select, Space, Statistic, Tag, Table, Alert, Empty, Typography, message } from 'antd';
import {
  PlayCircleOutlined,
  CodeOutlined,
  DashboardOutlined,
  DollarCircleOutlined,
  LineChartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import * as echarts from 'echarts';
import request from '../../../common/request';
import './index.scss';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

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
  mode?: string;
}

interface LogItem {
  id: number;
  strategyId: number;
  level: string;
  message: string;
  createdAt: string;
}

const QuantLiveTrading: React.FC = () => {
  const [runningStrategies, setRunningStrategies] = useState<StrategyItem[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<number | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyItem | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [marketKLines, setMarketKLines] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  
  const chartRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Fetch running strategies
  const fetchRunningStrategies = async () => {
    try {
      const res = await request.get('/quant/strategies');
      if (res && res.code === 200) {
        const active = res.data.filter((s: StrategyItem) => s.status === 'running');
        setRunningStrategies(active);
        
        if (active.length > 0 && selectedStrategyId === null) {
          setSelectedStrategyId(active[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Poll strategy status, logs and market ticking prices
  const fetchLiveDetails = async () => {
    if (!selectedStrategyId) return;

    try {
      let currentSymbol = selectedStrategy?.symbol;
      // 1. Fetch latest details of this strategy
      const stratRes = await request.get('/quant/strategies');
      if (stratRes && stratRes.code === 200) {
        const updated = stratRes.data.find((s: StrategyItem) => s.id === selectedStrategyId);
        if (updated) {
          setSelectedStrategy(updated);
          currentSymbol = updated.symbol;
        }
      }

      // 2. Fetch logs
      const logsRes = await request.get(`/quant/logs?strategyId=${selectedStrategyId}`);
      if (logsRes && logsRes.code === 200) {
        setLogs(logsRes.data.reverse()); // Reverse to chronological order for terminal
      }

      // 3. Fetch live market price and historical ticks
      if (currentSymbol) {
        const marketRes = await request.get(`/quant/market?symbol=${currentSymbol}`);
        if (marketRes && marketRes.code === 200) {
          setMarketKLines(marketRes.data.klines);
          setCurrentPrice(marketRes.data.currentPrice);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRunningStrategies();
    const stratInterval = setInterval(fetchRunningStrategies, 6000);
    return () => clearInterval(stratInterval);
  }, []);

  useEffect(() => {
    if (selectedStrategyId) {
      fetchLiveDetails();
      const liveInterval = setInterval(fetchLiveDetails, 3000); // Poll every 3 seconds for ticking updates
      return () => clearInterval(liveInterval);
    }
  }, [selectedStrategyId]);

  // Scroll to bottom in terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ECharts ticking initialization
  useEffect(() => {
    if (marketKLines.length === 0 || !chartRef.current) return;

    const myChart = echarts.init(chartRef.current);

    // Get last 40 ticking points
    const recentKLines = marketKLines.slice(marketKLines.length - 40);
    const times = recentKLines.map(k => new Date(k[0]).toLocaleTimeString());
    const prices = recentKLines.map(k => k[4]); // close price

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      grid: { left: '3%', right: '6%', bottom: '12%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        data: times,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#bbb' } }
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: { lineStyle: { color: '#bbb' } },
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
      },
      series: [
        {
          name: '最新成交价',
          type: 'line',
          data: prices,
          smooth: true,
          showSymbol: false,
          itemStyle: { color: '#52c41a' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(82,196,26,0.35)' },
              { offset: 1, color: 'rgba(82,196,26,0.01)' }
            ])
          },
          lineStyle: { width: 3 }
        }
      ]
    };

    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());

    return () => {
      myChart.dispose();
    };
  }, [marketKLines]);

  const getLogTextClass = (msg: string) => {
    if (msg.includes('Executed BUY') || msg.includes('buy trigger') || msg.includes('LIVE ORDER SUCCESS') || msg.includes('买入') || msg.includes('买进') || msg.includes('📈')) return 'log-buy';
    if (msg.includes('Executed SELL') || msg.includes('take-profit') || msg.includes('卖出') || msg.includes('变现') || msg.includes('🎉')) return 'log-sell';
    if (msg.includes('Error') || msg.includes('🚨') || msg.includes('FAILED') || msg.includes('拦截') || msg.includes('安全强平') || msg.includes('避险')) return 'log-error';
    if (msg.includes('LIVE ORDER SENDING') || msg.includes('⚡') || msg.includes('正在向币安发送')) return 'log-warning';
    return '';
  };

  const getStrategyName = (type: string) => {
    const types: Record<string, string> = {
      ma_crossover: '趋势波段捕手 📈',
      grid: '横盘震荡吸金 📊',
      dual_thrust: '瞬间突破追击 ⚡'
    };
    return types[type] || type;
  };

  return (
    <div className="quant-live">
      <div className="live-header">
        <Space size={12}>
          <PlayCircleOutlined className="header-icon animate-pulse" style={{ color: '#52c41a' }} />
          <div>
            <h2>📺 机器人工作直播间</h2>
            <p>在这里，您可以亲眼目睹您派出去的机器人小帮手正在帮您紧盯着什么，作出了什么决策</p>
          </div>
        </Space>

        <div className="strategy-selector">
          <Text style={{ marginRight: '8px', fontWeight: 'bold' }}>🔎 选择要视察的机器人: </Text>
          <Select
            style={{ width: 280 }}
            placeholder="请选择目前正在干活的小机器人"
            value={selectedStrategyId}
            onChange={(val) => {
              setSelectedStrategyId(val);
              setSelectedStrategy(null);
              setLogs([]);
              setMarketKLines([]);
            }}
          >
            {runningStrategies.map(s => (
              <Option key={s.id} value={s.id}>{s.name} ({s.symbol})</Option>
            ))}
          </Select>
        </div>
      </div>

      {runningStrategies.length === 0 ? (
        <Card className="glass-card placeholder-card" style={{ marginTop: '24px', padding: '60px 0', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <Empty
            image={<PlayCircleOutlined style={{ fontSize: '64px', color: '#ccc' }} />}
            description={
              <Space direction="vertical" size={12}>
                <Title level={4}>💤 暂时没有正在工作的小机器人</Title>
                <Paragraph type="secondary" style={{ maxWidth: '450px', margin: '0 auto' }}>
                  要想看直播，您需要先去唤醒至少一个小机器人！请点击左侧的“策略管理”菜单，选择一个已创建的机器人卡片，点击“唤醒机器人工作”即可！
                </Paragraph>
              </Space>
            }
          />
        </Card>
      ) : !selectedStrategy ? (
        <Card style={{ marginTop: '24px', textAlign: 'center' }}>机器人连线中，请稍候...</Card>
      ) : (
        <div className="live-monitor-workspace" style={{ marginTop: '24px' }}>
          {/* Strategy Basic Info Banner */}
          <Alert
            message={
              <Space>
                <strong style={{ fontSize: '15px' }}>🤖 当前连线机器人：{selectedStrategy.name}</strong>
                <Tag color="geekblue">投资标的: {selectedStrategy.symbol}</Tag>
                <Tag color="cyan">核心性格: {getStrategyName(selectedStrategy.type)}</Tag>
                <Tag color={selectedStrategy.mode === 'live' ? 'volcano' : 'blue'}>
                  运行环境: {selectedStrategy.mode === 'live' ? '实盘大盘' : '沙盒模拟'}
                </Tag>
              </Space>
            }
            description={
              <Row gutter={24} style={{ marginTop: '12px' }}>
                <Col span={6}>
                  <Statistic
                    title="交给机器人的本金"
                    value={parseFloat(selectedStrategy.initialCapital)}
                    precision={2}
                    prefix="$"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="手头备用现金"
                    value={parseFloat(selectedStrategy.currentBalance)}
                    precision={2}
                    prefix="$"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="手头持有的仓位数量"
                    value={parseFloat(selectedStrategy.assetPosition)}
                    precision={4}
                    suffix="Units"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="已替我净赚"
                    value={parseFloat(selectedStrategy.totalProfit)}
                    precision={2}
                    prefix={parseFloat(selectedStrategy.totalProfit) >= 0 ? '+' : ''}
                    valueStyle={{ color: parseFloat(selectedStrategy.totalProfit) >= 0 ? '#52c41a' : '#f5222d', fontWeight: 'bold' }}
                    suffix="$"
                  />
                </Col>
              </Row>
            }
            type="success"
            style={{ borderRadius: '12px', border: '1px solid rgba(82, 196, 26, 0.15)' }}
          />

          <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
            {/* Live Chart Panel */}
            <Col xs={24} lg={16}>
              <Card title={<Space><LineChartOutlined /> 📊 5秒级大盘行情实时波动直播</Space>} className="glass-card shadow-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                  <Text type="secondary">正在盯盘标的: <strong style={{ color: '#1f2937' }}>{selectedStrategy.symbol}</strong></Text>
                  <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                    当前大盘价格: ${currentPrice.toFixed(2)}
                  </Text>
                </div>
                <div ref={chartRef} style={{ width: '100%', height: '340px' }}></div>
              </Card>
            </Col>

            {/* Live Terminal Panel */}
            <Col xs={24} lg={8}>
              <Card title={<Space><CodeOutlined /> 💬 盯盘机器人的内心独白日志 (Terminal)</Space>} className="terminal-card shadow-card">
                <div className="terminal-screen">
                  {logs.map((log) => (
                    <div key={log.id} className={`terminal-line ${getLogTextClass(log.message)}`}>
                      <span className="line-time">[{log.createdAt.substring(11, 19)}]</span>
                      <span className="line-level">[{log.level === 'error' ? '风控' : '日志'}]</span>
                      <span className="line-text"> {log.message}</span>
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
};

export default QuantLiveTrading;
