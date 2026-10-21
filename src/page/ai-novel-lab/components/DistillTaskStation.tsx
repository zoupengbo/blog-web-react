import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Progress,
  Drawer,
  Timeline,
  Typography,
  Alert,
  message,
  Popconfirm,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  RedoOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  getDistillTasks,
  createDistillTask,
  getDistillTaskDetail,
  retryDistillTask,
  cancelDistillTask,
  DistillTaskItem,
} from '../services/labApi';

const { Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface DistillTaskStationProps {
  isCreateModalOpen: boolean;
  onCloseCreateModal: () => void;
  onNavigateTab: (tabKey: string) => void;
}

export const DistillTaskStation: React.FC<DistillTaskStationProps> = ({
  isCreateModalOpen,
  onCloseCreateModal,
  onNavigateTab,
}) => {
  const [tasks, setTasks] = useState<DistillTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [createForm] = Form.useForm();
  const [createLoading, setCreateLoading] = useState<boolean>(false);

  // 日志查看抽屉
  const [selectedTask, setSelectedTask] = useState<DistillTaskItem | null>(null);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState<boolean>(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await getDistillTasks({ pageSize: 50 });
      if (res.code === 200) {
        setTasks(res.data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const timer = setInterval(() => {
      // 轮询未完成任务
      fetchTasks();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateTask = async () => {
    try {
      const values = await createForm.validateFields();
      setCreateLoading(true);
      const res = await createDistillTask(values);
      if (res && res.code === 200) {
        message.success('蒸馏任务已创建并启动异步流水线');
        onCloseCreateModal();
        createForm.resetFields();
        fetchTasks();
      }
    } catch (e: any) {
      // 统一由全局 request.ts 拦截器弹出错误通知，此处保持弹窗开启以便用户修改入参
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRetry = async (taskId: number) => {
    try {
      await retryDistillTask(taskId);
      message.success('任务已重新排队执行');
      fetchTasks();
    } catch (e: any) {
      message.error(e.message || '重试失败');
    }
  };

  const handleCancel = async (taskId: number) => {
    try {
      await cancelDistillTask(taskId);
      message.success('任务已取消');
      fetchTasks();
    } catch (e: any) {
      message.error(e.message || '取消失败');
    }
  };

  const showTaskLogs = async (taskId: number) => {
    try {
      const res = await getDistillTaskDetail(taskId);
      if (res.code === 200) {
        setSelectedTask(res.data);
        setIsLogDrawerOpen(true);
      }
    } catch (e: any) {
      message.error(e.message || '获取任务详情失败');
    }
  };

  const columns = [
    {
      title: '任务名称与ID',
      key: 'taskName',
      render: (_: any, record: DistillTaskItem) => (
        <div>
          <Text strong>{record.taskName}</Text>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            ID: #{record.id} · 创建于 {record.created_at ? new Date(record.created_at).toLocaleString() : '-'}
          </div>
        </div>
      ),
    },
    {
      title: '目标题材与维度',
      key: 'genre',
      render: (_: any, record: DistillTaskItem) => (
        <Space direction="horizontal" size={4}>
          <Tag color="blue">{record.genre}</Tag>
          <Tag color="cyan">{record.targetDimension}</Tag>
        </Space>
      ),
    },
    {
      title: '执行阶段与进度',
      key: 'progress',
      render: (_: any, record: DistillTaskItem) => {
        let status: any = 'active';
        if (record.status === 'completed') status = 'success';
        if (record.status === 'failed') status = 'exception';

        const stageDescMap: any = {
          init: '初始化准备',
          sampling: '抽取合规高分样本',
          extracting: '大模型提炼核心笔法',
          evaluating: '原文证据质检与冲突筛查',
          finalized: '闭环收敛完成',
          failed: '任务失败',
          cancelled: '用户取消',
        };

        return (
          <div style={{ width: 170 }}>
            <Progress percent={record.progress} size="small" status={status} />
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              阶段: <b>{stageDescMap[record.currentStage] || record.currentStage}</b>
            </div>
          </div>
        );
      },
    },
    {
      title: '分析章节与切片',
      key: 'chapterSliceMetrics',
      render: (_: any, record: DistillTaskItem) => {
        const req = record.resultSummary?.requestedChapterCount ?? record.sampleCount;
        const actChap = record.resultSummary?.actualChapterCount ?? '-';
        const actSlice = record.resultSummary?.actualSliceCount ?? '-';
        return (
          <div>
            <div style={{ fontSize: 13 }}>
              分析: <b>{actChap}</b> / <b>{req}</b> 章
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              切片: <b>{actSlice}</b> 个段落切片
            </div>
          </div>
        );
      },
    },
    {
      title: '规则产出与实证',
      key: 'rulesOutput',
      render: (_: any, record: DistillTaskItem) => (
        <Space direction="horizontal" size={8}>
          <span>提炼: <b>{record.resultSummary?.deduplicatedRuleCount ?? record.extractedRulesCount ?? 0}</b></span>
          <span style={{ color: '#16a34a' }}>实证: <b>{record.resultSummary?.verifiedRuleCount ?? record.verifiedRulesCount ?? 0}</b></span>
          {((record.resultSummary?.conflictRuleCount ?? record.conflictCount ?? 0) > 0) && (
            <span style={{ color: '#dc2626' }}>冲突: <b>{record.resultSummary?.conflictRuleCount ?? record.conflictCount}</b></span>
          )}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const map: any = {
          pending: <Tag icon={<ClockCircleOutlined />}>等待中</Tag>,
          running: <Tag icon={<SyncOutlined spin />} color="processing">流水线执行中</Tag>,
          completed: <Tag icon={<CheckCircleOutlined />} color="success">成功完成</Tag>,
          failed: <Tag icon={<CloseCircleOutlined />} color="error">执行失败</Tag>,
          cancelled: <Tag color="warning">已取消</Tag>,
        };
        return map[status] || <Tag>{status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DistillTaskItem) => (
        <Space direction="horizontal" size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => showTaskLogs(record.id)}
          >
            日志
          </Button>

          {record.status === 'completed' && (
            <Button
              type="link"
              size="small"
              onClick={() => onNavigateTab('rules')}
            >
              去审核规则
            </Button>
          )}

          {record.status === 'failed' && (
            <Button
              type="text"
              icon={<RedoOutlined />}
              size="small"
              onClick={() => handleRetry(record.id)}
            >
              重试
            </Button>
          )}

          {(record.status === 'running' || record.status === 'pending') && (
            <Popconfirm
              title="确定取消该任务吗？"
              onConfirm={() => handleCancel(record.id)}
            >
              <Button type="text" danger icon={<StopOutlined />} size="small">
                中断
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="小说写作能力蒸馏任务编排流水线"
        extra={
          <Space direction="horizontal">
            <Button icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={tasks}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      {/* 创建蒸馏任务 Modal */}
      <Modal
        title="启动小说写作能力蒸馏任务"
        open={isCreateModalOpen}
        onOk={handleCreateTask}
        confirmLoading={createLoading}
        onCancel={onCloseCreateModal}
        width={650}
        destroyOnClose
      >
        <Alert
          message="自动化四元组笔法蒸馏规范"
          description="系统将基于授权语料样本，驱动 Gemini 深度推演「适用场景模式、核心叙事军规、破除AI套路、真人典范正例与原文证据切片」，并执行双向反查质检。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{
            genre: '体制官场',
            targetDimension: 'dialogue',
            sampleCount: 10,
          }}
        >
          <Form.Item name="taskName" label="任务名称 (选填，自动基于题材与维度命名)">
            <Input placeholder="例如：体制官场对白机锋与公文质询蒸馏" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="genre" label="蒸馏目标题材" rules={[{ required: true, message: '请选择题材' }]}>
                <Select>
                  <Option value="体制官场">体制官场</Option>
                  <Option value="都市职场">都市职场</Option>
                  <Option value="社会现实">社会现实</Option>
                  <Option value="悬疑刑侦">悬疑刑侦</Option>
                  <Option value="科幻未来">科幻未来</Option>
                  <Option value="历史演义">历史演义</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetDimension" label="蒸馏能力维度" rules={[{ required: true, message: '请选择维度' }]}>
                <Select>
                  <Option value="dialogue">一、对话潜台词与机锋交互</Option>
                  <Option value="pacing">二、叙事留白与节奏克制</Option>
                  <Option value="subtext">三、因果动机与心理暗线</Option>
                  <Option value="scene">四、场景白描与官场制度推演</Option>
                  <Option value="style">五、语言风格与去AI机械味</Option>
                  <Option value="general">六、综合叙事实战军规</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="sampleCount"
            label="参与分析的章节数"
            extra="💡 说明：章节数不等于切片数。系统将按自然段落智能切分为多段文本切片深入分析。"
            rules={[{ required: true, message: '请选择章节数' }]}
          >
            <Select>
              <Option value={3}>3 章 · 快速测试 (极速验证笔法)</Option>
              <Option value={5}>5 章 · 小样本分析 (兼顾速度与基础规律)</Option>
              <Option value={10}>10 章 · 标准蒸馏 (推荐，充分交叉印证)</Option>
              <Option value={20}>20 章 · 深度蒸馏 (全景覆盖长线伏笔)</Option>
              <Option value={30}>30 章 · 大样本蒸馏 (最大上限，严密去AI味)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="extractionPromptOverride" label="高级提炼指令覆写 (选填)">
            <TextArea
              rows={3}
              placeholder="留空则使用系统默认的去AI味蒸馏指令。可补充特定关注点，如‘重点提炼如何避免叙述者抢话替读者下结论’..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 实时任务日志抽屉 */}
      <Drawer
        title={`蒸馏流水线详情与执行日志 - #${selectedTask?.id || ''}`}
        placement="right"
        width={620}
        open={isLogDrawerOpen}
        onClose={() => setIsLogDrawerOpen(false)}
      >
        {selectedTask && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text strong style={{ fontSize: 15 }}>{selectedTask.taskName}</Text>
                <Tag color="blue">{selectedTask.genre}</Tag>
              </div>
              <Progress percent={selectedTask.progress} size="small" />
              <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                <span>状态: <b>{selectedTask.status}</b> · 阶段: <b>{selectedTask.currentStage}</b></span>
                <span>总耗时: {selectedTask.executionTimeMs ? `${(selectedTask.executionTimeMs / 1000).toFixed(1)} 秒` : '运行中...'}</span>
              </div>
            </Card>

            {/* 四项核心统计指标看板 */}
            <Card size="small" title="分析指标与质检全链路看板" style={{ marginBottom: 16, background: '#f8fafc' }}>
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>请求章节 / 实际匹配</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                      {selectedTask.resultSummary?.requestedChapterCount ?? selectedTask.sampleCount} 章 / {selectedTask.resultSummary?.actualChapterCount ?? selectedTask.sampleCount} 章
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>切片总数 / 送模切片</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                      {selectedTask.resultSummary?.actualSliceCount ?? '-'} 个 / {selectedTask.resultSummary?.analyzedSliceCount ?? '-'} 个
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>候选提取 / 归纳去重</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0284c7', marginTop: 2 }}>
                      {selectedTask.resultSummary?.candidateRuleCount ?? selectedTask.extractedRulesCount ?? 0} 条 / {selectedTask.resultSummary?.deduplicatedRuleCount ?? selectedTask.extractedRulesCount ?? 0} 条
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>实证通过 / 语义冲突</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>
                      {selectedTask.resultSummary?.verifiedRuleCount ?? selectedTask.verifiedRulesCount ?? 0} 条 / <span style={{ color: (selectedTask.resultSummary?.conflictRuleCount ?? selectedTask.conflictCount ?? 0) > 0 ? '#dc2626' : '#64748b' }}>{selectedTask.resultSummary?.conflictRuleCount ?? selectedTask.conflictCount ?? 0} 处</span>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>

            <Text strong style={{ display: 'block', marginBottom: 12 }}>流水线阶段推进记录：</Text>
            <div className="task-log-viewer">
              {(selectedTask.logs || []).map((l, idx) => (
                <div key={idx} className="log-line">
                  <span className="log-time">[{l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : ''}]</span>
                  <span className="log-stage">&lt;{l.stage}&gt;</span>
                  <span>{l.message}</span>
                </div>
              ))}
            </div>

            {selectedTask.status === 'completed' && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={() => {
                    setIsLogDrawerOpen(false);
                    onNavigateTab('rules');
                  }}
                >
                  查看本次产出的 {selectedTask.resultSummary?.deduplicatedRuleCount ?? selectedTask.extractedRulesCount} 条规则
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
