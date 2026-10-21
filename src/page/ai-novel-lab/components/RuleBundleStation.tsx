import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Switch,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Drawer,
  Typography,
  Alert,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  DownloadOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  BookOutlined,
} from '@ant-design/icons';
import {
  getRuleBundles,
  compileRuleBundle,
  activateRuleBundle,
  deactivateRuleBundle,
  exportRuleBundle,
  RuleBundleItem,
} from '../services/labApi';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const RuleBundleStation: React.FC = () => {
  const [bundles, setBundles] = useState<RuleBundleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 编译弹窗
  const [isCompileModalOpen, setIsCompileModalOpen] = useState<boolean>(false);
  const [compileForm] = Form.useForm();
  const [compileLoading, setCompileLoading] = useState<boolean>(false);

  // 预览/导出抽屉
  const [selectedBundle, setSelectedBundle] = useState<RuleBundleItem | null>(null);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'markdown' | 'json'>('markdown');
  const [exportContent, setExportContent] = useState<string>('');

  const fetchBundles = async () => {
    setLoading(true);
    try {
      const res = await getRuleBundles({ pageSize: 50 });
      if (res.code === 200) {
        setBundles(res.data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBundles();
  }, []);

  const handleCompile = async () => {
    try {
      const values = await compileForm.validateFields();
      setCompileLoading(true);
      const res = await compileRuleBundle(values);
      if (res.code === 200) {
        message.success(`规则包 [${res.data.bundleName}] 编译成功，包含 ${res.data.ruleCount} 条实证规约`);
        setIsCompileModalOpen(false);
        compileForm.resetFields();
        fetchBundles();
      }
    } catch (e: any) {
      message.error(e.message || '编译失败');
    } finally {
      setCompileLoading(false);
    }
  };

  const handleToggleActive = async (bundle: RuleBundleItem, checked: boolean) => {
    try {
      if (checked) {
        await activateRuleBundle(bundle.id);
        message.success(`规则包 [${bundle.bundleName}] 已激活，已安全生效于 ${bundle.genre} 题材小说写作`);
      } else {
        await deactivateRuleBundle(bundle.id);
        message.info(`规则包 [${bundle.bundleName}] 已下线`);
      }
      fetchBundles();
    } catch (e: any) {
      message.error(e.message || '操作失败');
    }
  };

  const handleOpenDrawer = async (bundle: RuleBundleItem) => {
    setSelectedBundle(bundle);
    setIsViewDrawerOpen(true);
    setExportFormat('markdown');
    setExportContent(bundle.bundleContent || '');
  };

  const handleSwitchExportFormat = async (format: 'markdown' | 'json') => {
    if (!selectedBundle) return;
    setExportFormat(format);
    try {
      const res = await exportRuleBundle(selectedBundle.id, format);
      if (res.code === 200) {
        if (typeof res.data === 'string') {
          setExportContent(res.data);
        } else {
          setExportContent(JSON.stringify(res.data, null, 2));
        }
      }
    } catch (e: any) {
      message.error(e.message || '导出转换失败');
    }
  };

  const columns = [
    {
      title: '规则包名称',
      key: 'bundleName',
      render: (_: any, record: RuleBundleItem) => (
        <div>
          <Text strong>{record.bundleName}</Text>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            ID: #{record.id} · {record.description || '无附加描述'}
          </div>
        </div>
      ),
    },
    {
      title: '所属题材',
      dataIndex: 'genre',
      key: 'genre',
      render: (genre: string) => <Tag color="blue">{genre}</Tag>,
    },
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
      render: (ver: string) => <Tag color="purple">{ver}</Tag>,
    },
    {
      title: '编译规约数',
      dataIndex: 'ruleCount',
      key: 'ruleCount',
      render: (count: number) => <span><b>{count}</b> 条实证规约</span>,
    },
    {
      title: '运行时激活状态',
      key: 'isActive',
      render: (_: any, record: RuleBundleItem) => (
        <Space direction="horizontal" size={8}>
          <Switch
            checked={record.isActive}
            onChange={(checked) => handleToggleActive(record, checked)}
          />
          {record.isActive ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>生产在线生效</Tag>
          ) : (
            <Tag color="default">离线归档</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t: string) => <span style={{ fontSize: 12 }}>{t ? new Date(t).toLocaleString() : '-'}</span>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: RuleBundleItem) => (
        <Space direction="horizontal" size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleOpenDrawer(record)}
          >
            查看与导出
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Alert
        message="小说写作运行时与规则包解耦机制"
        description="所有经大模型提炼与责编审核通过的规则，必须通过此处的【规则包编译器】编译定型为版本化规则包后，方可激活注入小说正文撰写流程（proseWriter）。支持同题材多版本对照与秒级无缝回滚。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card
        title="写作能力规则包发布工作台"
        extra={
          <Space direction="horizontal">
            <Button icon={<ReloadOutlined />} onClick={fetchBundles} loading={loading}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                compileForm.resetFields();
                setIsCompileModalOpen(true);
              }}
            >
              编译新规则包 (Bundle Compiler)
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={bundles}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      {/* 规则包编译 Modal */}
      <Modal
        title="编译发布写作能力规则包"
        open={isCompileModalOpen}
        onOk={handleCompile}
        confirmLoading={compileLoading}
        onCancel={() => setIsCompileModalOpen(false)}
        width={650}
        destroyOnClose
      >
        <Form
          form={compileForm}
          layout="vertical"
          initialValues={{
            genre: '体制官场',
            minConfidence: 0.8,
            includeDimensions: ['dialogue', 'pacing', 'subtext', 'scene', 'style'],
          }}
        >
          <Form.Item name="genre" label="编译目标题材" rules={[{ required: true }]}>
            <Select>
              <Option value="体制官场">体制官场</Option>
              <Option value="都市职场">都市职场</Option>
              <Option value="社会现实">社会现实</Option>
              <Option value="悬疑刑侦">悬疑刑侦</Option>
              <Option value="科幻未来">科幻未来</Option>
              <Option value="历史演义">历史演义</Option>
            </Select>
          </Form.Item>

          <Form.Item name="bundleName" label="规则包名称 (选填，自动命名)">
            <Input placeholder="如：体制官场因果动机与反套路强化包" />
          </Form.Item>

          <Form.Item name="version" label="版本号 (留空自动基于已有版本递增，如 v1.0.1)">
            <Input placeholder="例如：v1.1.0" />
          </Form.Item>

          <Form.Item name="includeDimensions" label="包含能力维度">
            <Select mode="multiple">
              <Option value="dialogue">一、对话潜台词与机锋</Option>
              <Option value="pacing">二、叙事留白与节奏</Option>
              <Option value="subtext">三、因果动机与心理</Option>
              <Option value="scene">四、场景白描与制度</Option>
              <Option value="style">五、语言风格与去AI味</Option>
              <Option value="general">六、综合叙事实战军规</Option>
            </Select>
          </Form.Item>

          <Form.Item name="minConfidence" label="最低置信度阈值 (0.5 - 1.0)">
            <InputNumber min={0.5} max={1.0} step={0.05} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="description" label="发版说明 / 变更日志">
            <TextArea rows={2} placeholder="记录本次规则包编译优化的重点笔法与清退套路..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 规则包预览与导出抽屉 */}
      <Drawer
        title={`规则包详情与结构化导出 - ${selectedBundle?.bundleName || ''}`}
        placement="right"
        width={700}
        open={isViewDrawerOpen}
        onClose={() => setIsViewDrawerOpen(false)}
      >
        {selectedBundle && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Space direction="horizontal">
                <Button
                  type={exportFormat === 'markdown' ? 'primary' : 'default'}
                  onClick={() => handleSwitchExportFormat('markdown')}
                >
                  Prompt Markdown
                </Button>
                <Button
                  type={exportFormat === 'json' ? 'primary' : 'default'}
                  onClick={() => handleSwitchExportFormat('json')}
                >
                  JSON 元数据
                </Button>
              </Space>

              <Button
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(exportContent);
                  message.success('已复制到剪贴板');
                }}
              >
                一键复制全文
              </Button>
            </div>

            <TextArea
              value={exportContent}
              rows={24}
              readOnly
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                backgroundColor: '#f8fafc',
                lineHeight: 1.6,
              }}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
};
