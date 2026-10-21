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
  Popconfirm,
  message,
  Tabs,
  Typography,
  Alert,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  UploadOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import {
  getCorpusSources,
  createCorpusSource,
  updateCorpusSource,
  deleteCorpusSource,
  getCorpusWorks,
  importCorpusWork,
  deleteCorpusWork,
  CorpusSourceItem,
  CorpusWorkItem,
} from '../services/labApi';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const CorpusRegistry: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('sources');
  const [sources, setSources] = useState<CorpusSourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState<boolean>(false);
  const [works, setWorks] = useState<CorpusWorkItem[]>([]);
  const [worksLoading, setWorksLoading] = useState<boolean>(false);

  // 来源弹窗
  const [isSourceModalOpen, setIsSourceModalOpen] = useState<boolean>(false);
  const [editingSource, setEditingSource] = useState<CorpusSourceItem | null>(null);
  const [sourceForm] = Form.useForm();

  // 导入作品弹窗
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importForm] = Form.useForm();
  const [importLoading, setImportLoading] = useState<boolean>(false);

  const fetchSources = async () => {
    setSourcesLoading(true);
    try {
      const res = await getCorpusSources({ pageSize: 100 });
      if (res.code === 200) {
        setSources(res.data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSourcesLoading(false);
    }
  };

  const fetchWorks = async () => {
    setWorksLoading(true);
    try {
      const res = await getCorpusWorks({ pageSize: 100 });
      if (res.code === 200) {
        setWorks(res.data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWorksLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
    fetchWorks();
  }, []);

  const handleSaveSource = async () => {
    try {
      const values = await sourceForm.validateFields();
      if (editingSource) {
        await updateCorpusSource(editingSource.id, values);
        message.success('语料来源修改成功');
      } else {
        await createCorpusSource(values);
        message.success('语料来源登记成功');
      }
      setIsSourceModalOpen(false);
      sourceForm.resetFields();
      setEditingSource(null);
      fetchSources();
    } catch (e: any) {
      if (e.message) message.error(e.message);
    }
  };

  const handleDeleteSource = async (id: number) => {
    try {
      await deleteCorpusSource(id);
      message.success('来源及关联作品已删除');
      fetchSources();
      fetchWorks();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const handleImportWork = async () => {
    try {
      const values = await importForm.validateFields();
      setImportLoading(true);
      const res = await importCorpusWork(values);
      if (res.code === 200) {
        message.success(`成功入库解析 ${res.data?.totalChapters || 1} 个有效章节切片`);
        setIsImportModalOpen(false);
        importForm.resetFields();
        fetchWorks();
      }
    } catch (e: any) {
      message.error(e.message || '入库失败');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDeleteWork = async (id: number) => {
    try {
      await deleteCorpusWork(id);
      message.success('章节切片已移除');
      fetchWorks();
    } catch (e: any) {
      message.error(e.message || '移除失败');
    }
  };

  const sourceColumns = [
    {
      title: '来源名称',
      dataIndex: 'sourceName',
      key: 'sourceName',
      render: (name: string, record: CorpusSourceItem) => (
        <Space direction="vertical" size={2}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>ID: #{record.id}</Text>
        </Space>
      ),
    },
    {
      title: '版权授权状态 (法律门禁)',
      dataIndex: 'licenseType',
      key: 'licenseType',
      render: (licenseType: string) => {
        const licenseMap: any = {
          public_domain: <Tag color="success" icon={<CheckCircleOutlined />}>公有领域 (Public Domain)</Tag>,
          licensed: <Tag color="blue" icon={<SafetyCertificateOutlined />}>权利人合法授权 (Licensed)</Tag>,
          self_owned: <Tag color="purple">自有原创语料 (Self Owned)</Tag>,
          pending: <Tag color="error" icon={<WarningOutlined />}>授权待核查 (蒸馏物理硬拦截)</Tag>,
        };
        return licenseMap[licenseType] || <Tag>{licenseType}</Tag>;
      },
    },
    {
      title: '题材标签',
      dataIndex: 'genre',
      key: 'genre',
      render: (genre: string) => <Tag color="cyan">{genre}</Tag>,
    },
    {
      title: '用途声明',
      dataIndex: 'targetUse',
      key: 'targetUse',
      render: (use: string) => <Tag>{use}</Tag>,
    },
    {
      title: '凭证与备注',
      dataIndex: 'licenseProof',
      key: 'licenseProof',
      render: (proof: string) => (
        <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
          {proof || '暂无详细凭证'}
        </Paragraph>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: CorpusSourceItem) => (
        <Space direction="horizontal" size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              setEditingSource(record);
              sourceForm.setFieldsValue(record);
              setIsSourceModalOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该来源吗？"
            description="删除来源将级联清理其名下全部已入库作品与章节切片！"
            onConfirm={() => handleDeleteSource(record.id)}
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const workColumns = [
    {
      title: '作品与章节',
      key: 'title',
      render: (_: any, record: CorpusWorkItem) => (
        <div>
          <Text strong>《{record.title}》</Text>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            第 {record.chapterNumber} 章 · {record.chapterTitle} ({record.author || '佚名'})
          </div>
        </div>
      ),
    },
    {
      title: '所属来源',
      dataIndex: ['source', 'sourceName'],
      key: 'sourceName',
      render: (sourceName: string, record: CorpusWorkItem) => (
        <Tag color="blue">{sourceName || `来源ID: ${record.sourceId}`}</Tag>
      ),
    },
    {
      title: '字数',
      dataIndex: 'wordCount',
      key: 'wordCount',
      render: (count: number) => <span>{count?.toLocaleString()} 字</span>,
    },
    {
      title: '语料清洗指标',
      key: 'metrics',
      render: (_: any, record: CorpusWorkItem) => {
        const m = record.qualityMetrics;
        if (!m) return <Tag>未计算</Tag>;
        const ratio = m.dialogueRatio !== undefined ? (m.dialogueRatio * 100).toFixed(1) : '-';
        return (
          <Space direction="horizontal" size={8}>
            <Tooltip title="对话在全文中所占字符比例">
              <Tag color="geekblue">对白: {ratio}%</Tag>
            </Tooltip>
            <Tooltip title="标点符号连续断层健康评估 (0-100)">
              <Tag color={m.punctuationScore && m.punctuationScore >= 80 ? 'green' : 'orange'}>
                标点分: {m.punctuationScore ?? '-'}
              </Tag>
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'cleanStatus',
      key: 'cleanStatus',
      render: (status: string) => (
        status === 'cleaned' ? <Tag color="success">已清洗</Tag> : <Tag color="default">原始草稿</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: CorpusWorkItem) => (
        <Popconfirm
          title="确定移除该章节吗？"
          onConfirm={() => handleDeleteWork(record.id)}
          okText="移除"
          cancelText="取消"
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small">
            移除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Alert
        message="语料管理与合规审计安全机制"
        description="所有用于能力蒸馏与规则提炼的文本，必须具有明确的合法授权凭证（公有领域、权利人授权或自有）。状态为 pending（审核中/待定）的语料将被物理层拦截，严禁进入蒸馏大模型提示词流。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarExtraContent={
            <Space direction="horizontal">
              <Button icon={<ReloadOutlined />} onClick={() => { fetchSources(); fetchWorks(); }}>
                刷新
              </Button>
              {activeTab === 'sources' ? (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingSource(null);
                    sourceForm.resetFields();
                    setIsSourceModalOpen(true);
                  }}
                >
                  登记语料来源
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  onClick={() => {
                    importForm.resetFields();
                    setIsImportModalOpen(true);
                  }}
                >
                  导入语料作品切片
                </Button>
              )}
            </Space>
          }
          items={[
            {
              key: 'sources',
              label: `语料来源库 (${sources.length})`,
              children: (
                <Table
                  dataSource={sources}
                  columns={sourceColumns}
                  rowKey="id"
                  loading={sourcesLoading}
                  pagination={{ pageSize: 15 }}
                />
              ),
            },
            {
              key: 'works',
              label: `作品与章节切片 (${works.length})`,
              children: (
                <Table
                  dataSource={works}
                  columns={workColumns}
                  rowKey="id"
                  loading={worksLoading}
                  pagination={{ pageSize: 15 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 语料来源登记/修改弹窗 */}
      <Modal
        title={editingSource ? '修改语料来源' : '登记语料来源'}
        open={isSourceModalOpen}
        onOk={handleSaveSource}
        onCancel={() => setIsSourceModalOpen(false)}
        destroyOnClose
      >
        <Form form={sourceForm} layout="vertical" initialValues={{ licenseType: 'public_domain', targetUse: 'research', genre: '体制官场' }}>
          <Form.Item name="sourceName" label="来源全称" rules={[{ required: true, message: '请输入来源全称' }]}>
            <Input placeholder="例如：名家经典短篇选编 / 体制实务访谈录" />
          </Form.Item>
          <Form.Item name="genre" label="所属题材" rules={[{ required: true, message: '请选择题材' }]}>
            <Select>
              <Option value="体制官场">体制官场</Option>
              <Option value="都市职场">都市职场</Option>
              <Option value="社会现实">社会现实</Option>
              <Option value="悬疑刑侦">悬疑刑侦</Option>
              <Option value="科幻未来">科幻未来</Option>
              <Option value="历史演义">历史演义</Option>
            </Select>
          </Form.Item>
          <Form.Item name="licenseType" label="版权与授权类型" rules={[{ required: true, message: '请选择版权类型' }]}>
            <Select>
              <Option value="public_domain">公有领域 (著作权已过期，公版)</Option>
              <Option value="licensed">作者书面授权 (Licensed)</Option>
              <Option value="self_owned">自有版权/团队原创 (Self-owned)</Option>
              <Option value="pending">待审核 (未确认授权，将被蒸馏流水线硬性拦截)</Option>
            </Select>
          </Form.Item>
          <Form.Item name="targetUse" label="授权用途范围">
            <Select>
              <Option value="research">科研与笔法蒸馏 (Research)</Option>
              <Option value="training">微调与模型训练 (Training)</Option>
              <Option value="commercial">商业级内容生产 (Commercial)</Option>
            </Select>
          </Form.Item>
          <Form.Item name="licenseProof" label="版权凭证说明 / 法律背书文本">
            <TextArea rows={3} placeholder="详细记录授权人、授权协议编号、出版公版出处或免责声明" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 导入作品章节弹窗 */}
      <Modal
        title="导入作品并自动切片入库"
        open={isImportModalOpen}
        onOk={handleImportWork}
        confirmLoading={importLoading}
        onCancel={() => setIsImportModalOpen(false)}
        width={700}
        destroyOnClose
      >
        <Form form={importForm} layout="vertical">
          <Form.Item name="sourceId" label="归属语料来源" rules={[{ required: true, message: '请选择归属来源' }]}>
            <Select placeholder="选择已授权的语料来源">
              {sources.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.sourceName} ({s.genre} - {s.licenseType === 'pending' ? '⚠️待定拦截' : '合规'})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="title" label="作品名称" rules={[{ required: true, message: '请输入作品名称' }]}>
            <Input placeholder="如：省府办公大楼的三伏天" />
          </Form.Item>
          <Form.Item name="author" label="作者署名">
            <Input placeholder="作者名（若公版可填写原著作者）" />
          </Form.Item>
          <Form.Item
            name="rawText"
            label="小说正文内容 (支持整书自动识别“第X章”切片)"
            rules={[{ required: true, message: '请粘贴小说正文' }]}
          >
            <TextArea
              rows={10}
              placeholder="请粘贴一段或多章小说文本。系统将自动按‘第X章’切片，计算对白密度、标点健康度并计算唯一SHA-256防重..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
