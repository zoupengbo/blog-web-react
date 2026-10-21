import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
  message,
  Typography,
  Alert,
  Switch,
  Row,
  Col,
  Tooltip,
  Divider,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  StopOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FireOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  getDistillRules,
  reviewDistillRule,
  batchReviewDistillRules,
  DistillRuleItem,
} from '../services/labApi';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface WritingRulesStationProps {
  initialGenre?: string;
}

export const WritingRulesStation: React.FC<WritingRulesStationProps> = ({ initialGenre }) => {
  const [rules, setRules] = useState<DistillRuleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 筛选状态
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre || 'all');
  const [selectedDimension, setSelectedDimension] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'draft'>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 编辑规则弹窗
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<DistillRuleItem | null>(null);
  const [editForm] = Form.useForm();
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const params: any = { pageSize: 200 };
      if (selectedGenre !== 'all') params.genre = selectedGenre;
      if (selectedDimension !== 'all') params.dimension = selectedDimension;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchKeyword.trim()) params.keyword = searchKeyword.trim();

      const res = await getDistillRules(params);
      if (res.code === 200) {
        setRules(res.data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [selectedGenre, selectedDimension, statusFilter]);

  const handleToggleActive = async (ruleId: number, active: boolean) => {
    try {
      const newStatus = active ? 'verified' : 'draft';
      const res = await reviewDistillRule(ruleId, {
        status: newStatus,
        auditNotes: active ? '用户自用写作启用' : '用户暂停使用',
      });
      if (res.code === 200) {
        message.success(`规则已${active ? '启用，小说正文写作将自动加载！' : '停用'}`);
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, status: newStatus } : r))
        );
      }
    } catch (e: any) {
      // 全局拦截
    }
  };

  const handleBatchToggle = async (targetStatus: 'verified' | 'draft') => {
    const targetRules = rules.filter((r) => r.status !== targetStatus);
    if (targetRules.length === 0) {
      message.info(`当前展示的规则均已是${targetStatus === 'verified' ? '启用' : '停用'}状态`);
      return;
    }
    try {
      const res = await batchReviewDistillRules({
        ruleIds: targetRules.map((r) => r.id),
        status: targetStatus,
        auditNotes: `批量${targetStatus === 'verified' ? '启用' : '停用'}`,
      });
      if (res.code === 200) {
        message.success(`已批量${targetStatus === 'verified' ? '启用' : '停用'} ${targetRules.length} 条规则`);
        fetchRules();
      }
    } catch (e: any) {
      // 错误已由 request 拦截
    }
  };

  const handleOpenEdit = (rule: DistillRuleItem | null) => {
    setEditingRule(rule);
    if (rule) {
      editForm.setFieldsValue({
        ruleName: rule.ruleName,
        genre: rule.genre,
        targetDimension: rule.targetDimension,
        conditionPattern: rule.conditionPattern,
        ruleText: rule.ruleText,
        antiAiPattern: rule.antiAiPattern,
        positiveExemplar: rule.positiveExemplar,
        negativeExemplar: rule.negativeExemplar,
      });
    } else {
      editForm.resetFields();
      editForm.setFieldsValue({
        genre: selectedGenre !== 'all' ? selectedGenre : '体制官场',
        targetDimension: 'dialogue',
      });
    }
    setIsEditModalOpen(true);
  };

  const handleSaveRule = async () => {
    try {
      const values = await editForm.validateFields();
      setSaveLoading(true);
      if (editingRule) {
        await reviewDistillRule(editingRule.id, values);
        message.success('规则修改已保存');
      } else {
        await reviewDistillRule(0, { ...values, status: 'verified' });
        message.success('新规则已录入并默认生效');
      }
      setIsEditModalOpen(false);
      fetchRules();
    } catch (e: any) {
      // 统一拦截
    } finally {
      setSaveLoading(false);
    }
  };

  const activeCount = rules.filter((r) => r.status === 'verified').length;

  return (
    <div>
      <Card
        title={
          <Space>
            <FireOutlined style={{ color: '#ea580c' }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>写作笔法与因果规约库</span>
            <Tag color="success">当前生效: {activeCount} 条</Tag>
            <Tag color="default">总库藏: {rules.length} 条</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchRules}>
              刷新
            </Button>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={() => handleBatchToggle('verified')}
            >
              一键启用当前全部
            </Button>
            <Button
              icon={<StopOutlined />}
              onClick={() => handleBatchToggle('draft')}
            >
              一键停用当前全部
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
              onClick={() => handleOpenEdit(null)}
            >
              录入自定笔法
            </Button>
          </Space>
        }
      >
        <Alert
          message="正文写作自动注入体系"
          description="无需手动编译或打包发版！凡是开关显示为【已启用】的笔法规约，均会在小说正文生成时由动词白描写手 (ProseWriter) 自动读取并严格遵循。绿色代表人类作家克制示范，红色代表典型 AI 油腻避坑。"
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 筛选栏 */}
        <div style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Space>
            <Text type="secondary">题材:</Text>
            <Select
              value={selectedGenre}
              onChange={setSelectedGenre}
              style={{ width: 140 }}
            >
              <Option value="all">全部题材</Option>
              <Option value="体制官场">体制官场</Option>
              <Option value="都市职场">都市职场</Option>
              <Option value="社会现实">社会现实</Option>
              <Option value="悬疑刑侦">悬疑刑侦</Option>
              <Option value="玄幻修真">玄幻修真</Option>
            </Select>
          </Space>

          <Space>
            <Text type="secondary">维度:</Text>
            <Select
              value={selectedDimension}
              onChange={setSelectedDimension}
              style={{ width: 160 }}
            >
              <Option value="all">全部写作维度</Option>
              <Option value="dialogue">对话与潜台词机锋</Option>
              <Option value="scene">场景白描与程序推演</Option>
              <Option value="pacing">因果动机与留白克制</Option>
              <Option value="subtext">心理暗线与利益权衡</Option>
              <Option value="style">语言去AI机械味</Option>
            </Select>
          </Space>

          <Space>
            <Text type="secondary">状态:</Text>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
            >
              <Option value="all">全部状态</Option>
              <Option value="verified">仅看已启用</Option>
              <Option value="draft">仅看已停用</Option>
            </Select>
          </Space>

          <Input.Search
            placeholder="搜索笔法关键字/规约/避坑..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onSearch={fetchRules}
            style={{ width: 240 }}
            allowClear
          />
        </div>

        {/* 规则卡片流 */}
        {rules.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <InfoCircleOutlined style={{ fontSize: 36, marginBottom: 8, display: 'block' }} />
            暂未提炼或检索到符合条件的写作笔法，请前往【语料小说】选择作品点击【一键提炼笔法】！
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {rules.map((rule) => {
            const isVerified = rule.status === 'verified';
            return (
              <Card
                key={rule.id}
                size="small"
                style={{
                  borderLeft: isVerified ? '4px solid #16a34a' : '4px solid #cbd5e1',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Space align="center" wrap>
                    <Text strong style={{ fontSize: 16 }}>
                      {rule.ruleName}
                    </Text>
                    <Tag color="cyan">{rule.genre}</Tag>
                    <Tag color="blue">{rule.targetDimension}</Tag>
                    {rule.confidenceScore && (
                      <Tag color="purple">置信度: {(Number(rule.confidenceScore) * 100).toFixed(0)}%</Tag>
                    )}
                  </Space>
                  <Space>
                    <Tooltip title={isVerified ? '当前正在生效，正文生成将严格注入此规约' : '已暂停，点击开启即可生效'}>
                      <Switch
                        checkedChildren="已启用"
                        unCheckedChildren="已停用"
                        checked={isVerified}
                        onChange={(checked) => handleToggleActive(rule.id, checked)}
                      />
                    </Tooltip>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => handleOpenEdit(rule)}
                    >
                      编辑
                    </Button>
                  </Space>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 13, marginRight: 8 }}>适用情境:</Text>
                  <Text style={{ fontSize: 13, color: '#334155' }}>{rule.conditionPattern || '通用场景'}</Text>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 13, marginRight: 8 }}>核心规约:</Text>
                  <Text style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{rule.ruleText}</Text>
                </div>

                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px' }}>
                      <Text strong style={{ color: '#166534', fontSize: 12, display: 'block', marginBottom: 4 }}>
                        真人名家克制示范 (Positive Exemplar)
                      </Text>
                      <Paragraph style={{ margin: 0, fontSize: 12, color: '#14532d' }}>
                        {rule.positiveExemplar || '未指定示范语句'}
                      </Paragraph>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px' }}>
                      <Text strong style={{ color: '#991b1b', fontSize: 12, display: 'block', marginBottom: 4 }}>
                        AI 烂套路避坑规约 (Anti-AI Rule)
                      </Text>
                      <Paragraph style={{ margin: 0, fontSize: 12, color: '#7f1d1d' }}>
                        {rule.antiAiPattern || rule.negativeExemplar || '避免假大空煽情或作者视角提前泄题'}
                      </Paragraph>
                    </div>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </div>
      </Card>

      {/* 规则编辑弹窗 */}
      <Modal
        title={editingRule ? '编辑写作笔法规约' : '新增自定写作笔法'}
        open={isEditModalOpen}
        onOk={handleSaveRule}
        confirmLoading={saveLoading}
        onCancel={() => setIsEditModalOpen(false)}
        width={680}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="ruleName" label="笔法规则名称" rules={[{ required: true, message: '请输入规则名称' }]}>
                <Input placeholder="例如：异常线索多维交叉核验律" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="genre" label="适用题材" rules={[{ required: true }]}>
                <Select>
                  <Option value="体制官场">体制官场</Option>
                  <Option value="都市职场">都市职场</Option>
                  <Option value="社会现实">社会现实</Option>
                  <Option value="悬疑刑侦">悬疑刑侦</Option>
                  <Option value="玄幻修真">玄幻修真</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="targetDimension" label="写作维度">
                <Select>
                  <Option value="dialogue">对话机锋与潜台词</Option>
                  <Option value="scene">场景白描与制度推演</Option>
                  <Option value="pacing">因果动机与留白克制</Option>
                  <Option value="subtext">心理暗线与利益博弈</Option>
                  <Option value="style">语言去AI化</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="conditionPattern" label="触发场景/前置条件">
                <Input placeholder="例如：面对上位者私下含蓄施压或核账时" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="ruleText" label="深层叙事规约（核心法则）" rules={[{ required: true, message: '请输入规约正文' }]}>
            <TextArea rows={3} placeholder="详细解释为什么这样写高级，人物行为动机与现实因果逻辑..." />
          </Form.Item>

          <Form.Item name="positiveExemplar" label="真人名家克制示范正例">
            <TextArea rows={2} placeholder="优秀范例文句或经典对白片段" />
          </Form.Item>

          <Form.Item name="antiAiPattern" label="AI 常见套路与破局避坑点">
            <TextArea rows={2} placeholder="大模型在此场景最容易犯的假大空套路及规避指令" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
