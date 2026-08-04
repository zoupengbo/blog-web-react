import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Modal, Form, Input, Select, Switch, Space, Tag, Popconfirm, message, Typography, Badge, Statistic, Radio, Tooltip } from 'antd';
import {
  SettingOutlined,
  PlusOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SlidersOutlined
} from '@ant-design/icons';
import request from '../../../common/request';
import './index.scss';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface StrategyItem {
  id: number;
  name: string;
  type: 'ma_crossover' | 'grid' | 'dual_thrust';
  symbol: string;
  status: 'idle' | 'running';
  mode?: 'sandbox' | 'live';
  parameters: any;
  initialCapital: string;
  currentBalance: string;
  assetPosition: string;
  totalProfit: string;
  updatedAt: string;
}

const QuantStrategies: React.FC = () => {
  const [strategies, setStrategies] = useState<StrategyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedType, setSelectedType] = useState<string>('ma_crossover');
  const [creationMode, setCreationMode] = useState<'novice' | 'expert'>('novice');

  const fetchStrategies = async () => {
    setLoading(true);
    try {
      const res = await request.get('/quant/strategies');
      if (res && res.code === 200) {
        setStrategies(res.data);
      }
    } catch (err) {
      console.error(err);
      message.error('获取策略列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const handleCreate = async (values: any) => {
    const { name, type, symbol, initialCapital, ...parameters } = values;

    try {
      const payload: any = {
        name,
        type,
        symbol,
        initialCapital: parseFloat(initialCapital),
        mode: values.mode || 'sandbox'
      };

      if (creationMode === 'novice') {
        payload.riskPreference = values.riskPreference || 'balanced';
      } else {
        payload.parameters = parameters;
      }

      const res = await request.post('/quant/strategy', payload);

      if (res && res.code === 200) {
        message.success('恭喜！量化炒币机器人成功建立！');
        setIsModalOpen(false);
        form.resetFields();
        setCreationMode('novice');
        fetchStrategies();
      }
    } catch (err) {
      console.error(err);
      message.error('创建策略失败');
    }
  };

  const handleToggle = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'running' ? 'idle' : 'running';
    try {
      const res = await request.post('/quant/strategy/toggle', {
        id,
        status: nextStatus
      });

      if (res && res.code === 200) {
        message.success(nextStatus === 'running' ? '策略已启动' : '策略已停止');
        fetchStrategies();
      }
    } catch (err) {
      console.error(err);
      message.error('切换策略状态失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await request.post('/quant/strategy/delete', { id });
      if (res && res.code === 200) {
        message.success('策略已成功删除');
        fetchStrategies();
      }
    } catch (err) {
      console.error(err);
      message.error('删除策略失败');
    }
  };

  const renderParametersForm = () => {
    switch (selectedType) {
      case 'ma_crossover':
        return (
          <>
            <Form.Item name="shortPeriod" label="短期均线周期 (Short SMA)" rules={[{ required: true, message: '请输入均线周期' }]}>
              <Input type="number" placeholder="例如: 5" />
            </Form.Item>
            <Form.Item name="longPeriod" label="长期均线周期 (Long SMA)" rules={[{ required: true, message: '请输入均线周期' }]}>
              <Input type="number" placeholder="例如: 20" />
            </Form.Item>
          </>
        );
      case 'grid':
        return (
          <>
            <Form.Item name="lowerPrice" label="网格区间下限价格 (USDT)" rules={[{ required: true, message: '请输入最低价格' }]}>
              <Input type="number" placeholder="例如: 60000" />
            </Form.Item>
            <Form.Item name="upperPrice" label="网格区间上限价格 (USDT)" rules={[{ required: true, message: '请输入最高价格' }]}>
              <Input type="number" placeholder="例如: 70000" />
            </Form.Item>
            <Form.Item name="gridCount" label="网格数量 (Grid count)" rules={[{ required: true, message: '请输入网格数量' }]}>
              <Input type="number" placeholder="区间划分为多少格，例如: 5" />
            </Form.Item>
          </>
        );
      case 'dual_thrust':
        return (
          <>
            <Form.Item name="period" label="参考周期 K线数 (Period)" rules={[{ required: true, message: '请输入参考K线数量' }]}>
              <Input type="number" placeholder="例如: 5" />
            </Form.Item>
            <Form.Item name="k1" label="上轨系数 (K1)" rules={[{ required: true, message: '请输入K1值' }]}>
              <Input type="number" step="0.1" placeholder="触发突破买入系数，例如: 0.5" />
            </Form.Item>
            <Form.Item name="k2" label="下轨系数 (K2)" rules={[{ required: true, message: '请输入K2值' }]}>
              <Input type="number" step="0.1" placeholder="触发突破卖出系数，例如: 0.5" />
            </Form.Item>
          </>
        );
      default:
        return null;
    }
  };

  const getStrategyName = (type: string) => {
    const types: Record<string, string> = {
      ma_crossover: '趋势大波段捕手 📈 (双均线交叉)',
      grid: '横盘震荡吸金器 📊 (网格交易)',
      dual_thrust: '爆发瞬间追击手 ⚡ (Dual Thrust突破)'
    };
    return types[type] || type;
  };

  return (
    <div className="quant-strategies">
      <div className="strategies-header">
        <Space size={12}>
          <SettingOutlined className="header-icon" />
          <div>
            <h2>🤖 智能量化托管投顾</h2>
            <p>在这里，您可以像选择理财性格一样轻松配置、启动和停止您的小机器人交易员</p>
          </div>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          新建量化小机器人
        </Button>
      </div>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        {strategies.map((strategy) => {
          const profit = parseFloat(strategy.totalProfit);
          const isRunning = strategy.status === 'running';

          return (
            <Col xs={24} md={12} xl={8} key={strategy.id}>
              <Badge.Ribbon
                text={isRunning ? '🤖 帮您盯盘中' : '💤 休息中'}
                color={isRunning ? 'green' : 'default'}
              >
                <Card
                  className={`strategy-card ${isRunning ? 'active' : ''}`}
                  title={<span className="card-title">{strategy.name}</span>}
                  actions={[
                    <Button
                      type="link"
                      key="toggle"
                      icon={isRunning ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                      onClick={() => handleToggle(strategy.id, strategy.status)}
                      style={{ color: isRunning ? '#ff4d4f' : '#52c41a' }}
                    >
                      {isRunning ? '命令机器人休息' : '唤醒机器人工作'}
                    </Button>,
                    <Popconfirm
                      title="确定开除此机器人吗？"
                      description="注销机器人将同步清除其对应的成交订单和运行日志。"
                      onConfirm={() => handleDelete(strategy.id)}
                      okText="确定"
                      cancelText="取消"
                      key="delete"
                    >
                      <Button type="link" danger icon={<DeleteOutlined />}>
                        注销机器人
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <div className="card-body">
                    <Row gutter={8} className="meta-row">
                      <Col span={8}>
                        <Text type="secondary">投资标的: </Text>
                        <Tag color="geekblue">{strategy.symbol}</Tag>
                      </Col>
                      <Col span={8}>
                        <Text type="secondary">核心性格: </Text>
                        <Tooltip title={getStrategyName(strategy.type)}>
                          <Tag color="cyan">{strategy.type === 'ma_crossover' ? '均线趋势' : strategy.type === 'grid' ? '网格震荡' : '瞬间突破'}</Tag>
                        </Tooltip>
                      </Col>
                      <Col span={8}>
                        <Text type="secondary">运行环境: </Text>
                        <Tag color={strategy.mode === 'live' ? 'volcano' : 'blue'}>
                          {strategy.mode === 'live' ? '实盘大盘' : '沙盒模拟'}
                        </Tag>
                      </Col>
                    </Row>

                    <Row gutter={8} style={{ marginTop: '16px' }}>
                      <Col span={12}>
                        <Statistic
                          title="交给机器人的本金"
                          value={parseFloat(strategy.initialCapital)}
                          precision={2}
                          prefix="$"
                          valueStyle={{ fontSize: '16px' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="机器人累计替您赚取"
                          value={profit}
                          precision={2}
                          prefix={profit >= 0 ? '+' : ''}
                          valueStyle={{ fontSize: '16px', color: profit >= 0 ? '#52c41a' : '#f5222d' }}
                          suffix="$"
                        />
                      </Col>
                    </Row>

                    <div className="parameters-preview" style={{ marginTop: '14px' }}>
                      <Title level={5} style={{ margin: '8px 0 6px 0', fontSize: '13px', color: '#8c8c8c' }}>
                        <SlidersOutlined /> 策略托管配置:
                      </Title>
                      {strategy.parameters?.riskPreference ? (
                        <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '12px' }}>
                            ✨ 智能托管模式：
                            {strategy.parameters.riskPreference === 'conservative' && '保守型 (稳字当头 🛡️)'}
                            {strategy.parameters.riskPreference === 'balanced' && '平衡型 (稳中求进 ⚖️)'}
                            {strategy.parameters.riskPreference === 'aggressive' && '进取型 (追求暴利 🚀)'}
                          </span>
                          <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '4px', fontFamily: 'monospace' }}>
                            {strategy.type === 'ma_crossover' && `均线参数: 快线${strategy.parameters.shortPeriod} / 慢线${strategy.parameters.longPeriod}`}
                            {strategy.type === 'grid' && `网格区间: $${strategy.parameters.lowerPrice} - $${strategy.parameters.upperPrice} (${strategy.parameters.gridCount}格)`}
                            {strategy.type === 'dual_thrust' && `突破系数: 周期${strategy.parameters.period} / K1:${strategy.parameters.k1} / K2:${strategy.parameters.k2}`}
                          </div>
                        </div>
                      ) : (
                        <pre className="param-code">
                          {JSON.stringify(strategy.parameters, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </Card>
              </Badge.Ribbon>
            </Col>
          );
        })}

        {strategies.length === 0 && (
          <Col span={24}>
            <Card style={{ textAlign: 'center', padding: '40px 0', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Paragraph type="secondary" style={{ fontSize: '16px' }}>
                目前没有处于工作状态的量化小机器人，点击右上角 “新建量化小机器人” 按钮立即启动第一个托管机器人吧！
              </Paragraph>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                立即创建小机器人
              </Button>
            </Card>
          </Col>
        )}
      </Row>

      {/* Create Strategy Modal */}
      <Modal
        title="🤖 召唤您的量化交易小机器人"
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setCreationMode('novice');
        }}
        onOk={() => form.submit()}
        okText="确认召唤小机器人"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            symbol: 'BTC/USDT',
            type: 'ma_crossover',
            initialCapital: 10000,
            mode: 'sandbox',
            riskPreference: 'balanced',
            shortPeriod: 5,
            longPeriod: 20,
            period: 5,
            k1: 0.5,
            k2: 0.5
          }}
          style={{ marginTop: '16px' }}
        >
          <Form.Item name="name" label="给您的小机器人起个名字" rules={[{ required: true, message: '请给您的策略实例起一个名字' }]}>
            <Input placeholder="例如: 黄金牛市一号波段捕手 / 横盘收割机二号" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="机器人的核心交易逻辑">
                <Select onChange={(val) => setSelectedType(val)}>
                  <Option value="ma_crossover">趋势大波段捕手 📈 (双均线交叉)</Option>
                  <Option value="grid">横盘震荡吸金器 📊 (网格交易)</Option>
                  <Option value="dual_thrust">爆发瞬间追击手 ⚡ (Dual Thrust突破)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="symbol" label="选择目标投资产品">
                <Select>
                  <Option value="BTC/USDT">比特币 (BTC/USDT)</Option>
                  <Option value="ETH/USDT">以太坊 (ETH/USDT)</Option>
                  <Option value="AAPL">苹果股票 (AAPL)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="initialCapital" label="交给机器人的托管本金 ($)" rules={[{ required: true, message: '请分配本金' }]}>
                <Input type="number" addonAfter="USDT" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mode" label="小机器人运行模式">
                <Select>
                  <Option value="sandbox">模拟沙盒演练 (Sandbox - 无风险)</Option>
                  <Option value="live">连接真实大盘 (Live-Trading - 真金白银)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', margin: '8px 0 16px 0' }}>
            <span style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>参数配置模式</span>
            <Radio.Group 
              value={creationMode} 
              onChange={(e) => setCreationMode(e.target.value)} 
              optionType="button" 
              buttonStyle="solid"
            >
              <Radio.Button value="novice">✨ 新手智能托管模式 (最省心)</Radio.Button>
              <Radio.Button value="expert">⚙️ 专家自定义模式 (全手动)</Radio.Button>
            </Radio.Group>
          </div>

          {creationMode === 'novice' ? (
            <Form.Item 
              name="riskPreference" 
              label="选择您的理财性格 (自动帮您适配最佳算法参数)"
              rules={[{ required: true }]}
            >
              <Radio.Group style={{ width: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Radio value="conservative" style={{ display: 'flex', alignItems: 'flex-start', background: 'rgba(82, 196, 26, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(82, 196, 26, 0.2)', width: '100%' }}>
                    <div style={{ marginLeft: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: '#52c41a' }}>保守型 🛡️ (稳字当头)</span>
                      <p style={{ margin: 0, fontSize: '11px', color: '#8c8c8c' }}>AI 自动配置大周期均线/多重防守网格。风险极低，赚取稳定的小收益，保护本金安全。</p>
                    </div>
                  </Radio>
                  <Radio value="balanced" style={{ display: 'flex', alignItems: 'flex-start', background: 'rgba(24, 144, 255, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(24, 144, 255, 0.2)', width: '100%' }}>
                    <div style={{ marginLeft: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: '#1890ff' }}>平衡型 ⚖️ (稳中求进)</span>
                      <p style={{ margin: 0, fontSize: '11px', color: '#8c8c8c' }}>AI 自动匹配中等周期均线或标准网格。平衡性极佳，回撤可控，合理获取市场利润。</p>
                    </div>
                  </Radio>
                  <Radio value="aggressive" style={{ display: 'flex', alignItems: 'flex-start', background: 'rgba(245, 34, 45, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(245, 34, 45, 0.2)', width: '100%' }}>
                    <div style={{ marginLeft: '8px' }}>
                      <span style={{ fontWeight: 'bold', color: '#f5222d' }}>进取型 🚀 (追求暴利)</span>
                      <p style={{ margin: 0, fontSize: '11px', color: '#8c8c8c' }}>AI 自动配置短线高灵敏均线或紧凑大突破模型。频繁套利，拥抱市场高波动，追求利润爆发。</p>
                    </div>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>
          ) : (
            <>
              <Title level={5} style={{ fontSize: '13px', margin: '8px 0 12px 0', color: '#8c8c8c' }}>
                专家级别专属数学参数配置:
              </Title>
              {renderParametersForm()}
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default QuantStrategies;
