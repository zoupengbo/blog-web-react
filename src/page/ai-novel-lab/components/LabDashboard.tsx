import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Tag, Table, Button, Progress, Space, Alert, Typography } from 'antd';
import {
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  BookOutlined,
  ArrowRightOutlined,
  ReloadOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { getLabOverview, LabOverviewData } from '../services/labApi';

const { Text } = Typography;

interface LabDashboardProps {
  onNavigateTab: (tabKey: string) => void;
  onOpenNewTask: () => void;
}

export const LabDashboard: React.FC<LabDashboardProps> = ({ onNavigateTab, onOpenNewTask }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [overview, setOverview] = useState<LabOverviewData | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await getLabOverview();
      if (res.code === 200) {
        setOverview(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const taskColumns = [
    {
      title: '任务名称',
      dataIndex: 'taskName',
      key: 'taskName',
      render: (name: string, record: any) => (
        <Space direction="vertical" size={2}>
          <Text strong>{name}</Text>
          <Space size={4}>
            <Tag color="blue">{record.genre}</Tag>
            <Tag color="cyan">{record.targetDimension}</Tag>
          </Space>
        </Space>
      ),
    },
    {
      title: '当前进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number, record: any) => {
        let status: any = 'active';
        if (record.status === 'completed') status = 'success';
        if (record.status === 'partial_success') status = 'normal';
        if (record.status === 'failed') status = 'exception';
        return (
          <div style={{ width: 140 }}>
            <Progress percent={progress} size="small" status={status} />
            <span style={{ fontSize: 12, color: '#64748b' }}>阶段: {record.currentStage}</span>
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const map: any = {
          pending: <Tag color="default">排队中</Tag>,
          running: <Tag color="processing">正在蒸馏</Tag>,
          completed: <Tag color="success">全量完成</Tag>,
          partial_success: <Tag color="orange">部分完成</Tag>,
          failed: <Tag color="error">异常终止</Tag>,
          cancelled: <Tag color="warning">已取消</Tag>,
        };
        return map[status] || <Tag>{status}</Tag>;
      },
    },
    {
      title: '产出指标',
      key: 'metrics',
      render: (_: any, record: any) => (
        <Space size={8}>
          <span style={{ fontSize: 12 }}>提炼: <b>{record.extractedRulesCount || 0}</b></span>
          <span style={{ fontSize: 12, color: '#16a34a' }}>实证: <b>{record.verifiedRulesCount || 0}</b></span>
          {(record.conflictCount || 0) > 0 && (
            <span style={{ fontSize: 12, color: '#dc2626' }}>冲突: <b>{record.conflictCount}</b></span>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Button type="link" size="small" onClick={() => onNavigateTab('tasks')}>
          查看详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable onClick={() => onNavigateTab('corpus')}>
            <div className="stat-header">
              <span>语料合规来源</span>
              <SafetyCertificateOutlined style={{ color: '#16a34a', fontSize: 18 }} />
            </div>
            <div className="stat-value">
              {overview?.corpus.legalSources || 0}
              <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 'normal' }}>
                {' '}/ {overview?.corpus.totalSources || 0} 来源
              </span>
            </div>
            <div className="stat-footer">
              <span>入库作品 {overview?.corpus.totalWorks || 0} 部</span>
              <span>{(Number(overview?.corpus.totalWords || 0) / 10000).toFixed(1)} 万字</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable onClick={() => onNavigateTab('tasks')}>
            <div className="stat-header">
              <span>能力蒸馏任务</span>
              <ThunderboltOutlined style={{ color: '#0284c7', fontSize: 18 }} />
            </div>
            <div className="stat-value">
              {overview?.tasks.completedTasks || 0}
              <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 'normal' }}>
                {' '}/ {overview?.tasks.totalTasks || 0} 批次
              </span>
            </div>
            <div className="stat-footer">
              <span>异步闭环编排</span>
              <span style={{ color: '#0284c7' }}>点击直达看板</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable onClick={() => onNavigateTab('rules')}>
            <div className="stat-header">
              <span>提炼写作规则</span>
              <CheckCircleOutlined style={{ color: '#8b5cf6', fontSize: 18 }} />
            </div>
            <div className="stat-value">
              {overview?.rules.verifiedRules || 0}
              <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 'normal' }}>
                {' '}/ {overview?.rules.totalRules || 0} 条实证
              </span>
            </div>
            <div className="stat-footer">
              <span>
                {(overview?.rules.conflictRules || 0) > 0 ? (
                  <Tag color="error" icon={<WarningOutlined />}>
                    {overview?.rules.conflictRules} 处冲突待裁决
                  </Tag>
                ) : (
                  <span style={{ color: '#16a34a' }}>无语义冲突</span>
                )}
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable onClick={() => onNavigateTab('bundles')}>
            <div className="stat-header">
              <span>运行时生效包</span>
              <BookOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
            </div>
            <div className="stat-value">
              {overview?.bundles.activeBundles || 0}
              <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 'normal' }}>
                {' '}/ {overview?.bundles.totalBundles || 0} 个激活
              </span>
            </div>
            <div className="stat-footer">
              <span>已注入 proseWriter</span>
              <span style={{ color: '#16a34a' }}>安全只读生效</span>
            </div>
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              title="最近蒸馏流水线任务"
              extra={
                <Space>
                  <Button icon={<ReloadOutlined />} size="small" onClick={fetchOverview} loading={loading}>
                    刷新
                  </Button>
                  <Button type="primary" size="small" icon={<ThunderboltOutlined />} onClick={onOpenNewTask}>
                    发起新蒸馏
                  </Button>
                </Space>
              }
            >
              <Table
                dataSource={overview?.tasks.recentTasks || []}
                columns={taskColumns}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              title="当前活跃写作能力规则包"
              extra={
                <Button type="link" size="small" onClick={() => onNavigateTab('bundles')}>
                  规则包工作台 <ArrowRightOutlined />
                </Button>
              }
            >
              {(overview?.bundles.recentBundles || []).length === 0 ? (
                <Alert
                  type="info"
                  showIcon
                  message="暂无已编译规则包"
                  description="在能力蒸馏并通过审核后，可在规则包工作台编译发布针对特定题材的专享能力增强层。"
                />
              ) : (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  {(overview?.bundles.recentBundles || []).map((b) => (
                    <Card key={b.id} size="small" style={{ borderLeft: b.isActive ? '4px solid #16a34a' : '4px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{b.bundleName}</Text>
                        {b.isActive ? <Tag color="success">当前激活</Tag> : <Tag>未激活</Tag>}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        题材: <b>{b.genre}</b> | 版本: <b>{b.version}</b> | 规则数: <b>{b.ruleCount}</b>
                      </div>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};
