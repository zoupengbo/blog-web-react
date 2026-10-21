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
  Upload,
  Radio,
  Divider,
  Row,
  Col,
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
  ThunderboltOutlined,
  FileTextOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import {
  getCorpusSources,
  createCorpusSource,
  updateCorpusSource,
  deleteCorpusSource,
  verifyCorpusSource,
  seedBenchmarkCorpus,
  getCorpusWorks,
  importCorpusWork,
  importTxtCorpusWork,
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

  // TXT 小说上传弹窗
  const [isTxtModalOpen, setIsTxtModalOpen] = useState<boolean>(false);
  const [txtForm] = Form.useForm();
  const [txtLoading, setTxtLoading] = useState<boolean>(false);
  const [txtSourceMode, setTxtSourceMode] = useState<'auto' | 'existing'>('auto');
  const [txtFileMeta, setTxtFileMeta] = useState<{
    fileName: string;
    fileSize: string;
    charCount: number;
    chapterEstimate: number;
    preview: string;
  } | null>(null);
  const [seedLoading, setSeedLoading] = useState<boolean>(false);

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
        message.success('语料来源登记成功（默认进入待审核状态）');
      }
      setIsSourceModalOpen(false);
      sourceForm.resetFields();
      setEditingSource(null);
      fetchSources();
    } catch (e: any) {
      // 业务错误已被 request.ts 全局拦截弹窗，此处保持表单打开状态供用户修改
    }
  };

  const handleVerifySource = async (id: number, isApproved: boolean) => {
    try {
      await verifyCorpusSource(id, {
        isApproved,
        verificationNotes: isApproved ? '人工核准授权合规通过' : '人工撤销授权',
      });
      message.success(isApproved ? '来源授权核准通过' : '来源授权已撤销');
      fetchSources();
    } catch (e: any) {
      // 统一由全局拦截弹窗
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

  const handleSeedBenchmark = async () => {
    setSeedLoading(true);
    try {
      const res = await seedBenchmarkCorpus();
      if (res.code === 200) {
        message.success(res.message || '标杆示范语料初始化成功！');
        fetchSources();
        fetchWorks();
      }
    } catch (e: any) {
      message.error(e.message || '初始化标杆语料失败');
    } finally {
      setSeedLoading(false);
    }
  };

  const handleTxtFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      if (!content.trim()) {
        message.error('文件内容为空');
        return;
      }
      const defaultTitle = file.name.replace(/\.[^/.]+$/, '');
      const chapterMatches = content.match(/^\s*(?:第\s*[0-9一二三四五六七八九十百千两]+\s*[章卷回节篇话]|Chapter\s*\d+|楔子|序章)/gim) || [];
      const charCount = content.replace(/\s+/g, '').length;
      const estChapters = chapterMatches.length > 0 ? chapterMatches.length : (charCount > 5000 ? Math.ceil(charCount / 3500) : 1);

      setTxtFileMeta({
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(1) + ' KB',
        charCount,
        chapterEstimate: estChapters,
        preview: content.slice(0, 300) + (content.length > 300 ? '...' : ''),
      });

      txtForm.setFieldsValue({
        title: defaultTitle,
        rawText: content,
        author: '',
        genre: '体制官场',
      });
      message.success(`成功读取《${file.name}》，检测到约 ${charCount} 字、${estChapters} 个章节切片`);
    };
    reader.onerror = () => {
      message.error('读取 TXT 文件失败，请检查文件编码');
    };
    reader.readAsText(file, 'utf-8');
    return false;
  };

  const handleImportTxtSubmit = async () => {
    try {
      const values = await txtForm.validateFields();
      if (!values.rawText) {
        message.error('请先选择或拖拽上传 TXT 小说文件');
        return;
      }
      setTxtLoading(true);
      const payload: any = {
        title: values.title,
        author: values.author,
        genre: values.genre,
        rawText: values.rawText,
      };
      if (txtSourceMode === 'existing' && values.sourceId) {
        payload.sourceId = values.sourceId;
      } else {
        payload.sourceName = `${values.title}·个人语料库`;
      }

      const res = await importTxtCorpusWork(payload);
      if (res.code === 200) {
        message.success(res.message || `成功入库作品《${values.title}》！`);
        setIsTxtModalOpen(false);
        txtForm.resetFields();
        setTxtFileMeta(null);
        fetchWorks();
        fetchSources();
      }
    } catch (e: any) {
      message.error(e.message || 'TXT小说入库失败');
    } finally {
      setTxtLoading(false);
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
      title: '审核状态',
      key: 'status',
      render: (_: any, record: CorpusSourceItem) => {
        if (record.status === 'active') {
          return (
            <Tooltip title={record.verificationNotes ? `核验意见: ${record.verificationNotes}` : '已核准授权入库'}>
              <Tag color="success">已核准授权</Tag>
            </Tooltip>
          );
        }
        if (record.status === 'pending_verification') {
          return <Tag color="warning">待授权核验</Tag>;
        }
        if (record.status === 'revoked') {
          return (
            <Tooltip title={record.verificationNotes || '已撤销授权'}>
              <Tag color="error">已撤销授权</Tag>
            </Tooltip>
          );
        }
        return <Tag>{record.status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: CorpusSourceItem) => (
        <Space direction="horizontal" size="small">
          {record.status !== 'active' ? (
            <Popconfirm
              title="确定审核通过并授权激活该来源吗？"
              description="审核通过后，该来源名下的切片语料将允许被蒸馏流水线调用采样。"
              onConfirm={() => handleVerifySource(record.id, true)}
              okText="核准通过"
              cancelText="取消"
            >
              <Button type="text" style={{ color: '#16a34a' }} size="small" icon={<CheckCircleOutlined />}>
                核准通过
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="确定撤销该来源授权吗？"
              description="撤销后，该来源名下的语料切片将立即被蒸馏流水线物理阻断！"
              onConfirm={() => handleVerifySource(record.id, false)}
              okText="确认撤销"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger size="small">
                撤销授权
              </Button>
            </Popconfirm>
          )}
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
              <Popconfirm
                title="一键初始化标杆示范语料库？"
                description="将自动创建并激活体制官场、都市职场、玄幻修真三大高质量标杆语料库及示范章节，可直接开启蒸馏！"
                onConfirm={handleSeedBenchmark}
                okText="立即初始化"
                cancelText="取消"
              >
                <Button
                  type="dashed"
                  icon={<ThunderboltOutlined style={{ color: '#f59e0b' }} />}
                  loading={seedLoading}
                  style={{ borderColor: '#f59e0b', color: '#b45309' }}
                >
                  一键初始化标杆语料
                </Button>
              </Popconfirm>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                onClick={() => {
                  txtForm.resetFields();
                  setTxtFileMeta(null);
                  setTxtSourceMode('auto');
                  setIsTxtModalOpen(true);
                }}
              >
                上传 TXT 小说
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
                  icon={<UploadOutlined />}
                  onClick={() => {
                    importForm.resetFields();
                    setIsImportModalOpen(true);
                  }}
                >
                  粘贴导入章节
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

      {/* TXT 小说文件快速上传入库弹窗 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#059669' }} />
            <span>上传 TXT 小说自动入库与切片</span>
          </Space>
        }
        open={isTxtModalOpen}
        onOk={handleImportTxtSubmit}
        confirmLoading={txtLoading}
        onCancel={() => {
          setIsTxtModalOpen(false);
          setTxtFileMeta(null);
        }}
        width={720}
        destroyOnClose
        okText="立即解析并入库"
        cancelText="取消"
      >
        <Alert
          message="免手动审核·个人自用小说极速入库"
          description="支持直接拖拽本地 .txt 小说文件。系统使用浏览器前端毫秒级读取，自动提取作品名、按“第X章”智能切片入库并自动激活，可直接开启笔法蒸馏！"
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <div style={{ marginBottom: 16 }}>
          <Upload.Dragger
            accept=".txt,.md"
            showUploadList={false}
            beforeUpload={handleTxtFileSelect}
            style={{ padding: '16px 0', background: '#f8fafc', border: '1px dashed #cbd5e1' }}
          >
            <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
              <InboxOutlined style={{ color: '#059669', fontSize: 36 }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 15, fontWeight: 500 }}>
              点击或将 .txt 小说文件拖拽到此区域
            </p>
            <p className="ant-upload-hint" style={{ color: '#64748b' }}>
              支持全本小说或多章文本，客户端秒级解析，无上传大小限制
            </p>
          </Upload.Dragger>
        </div>

        {txtFileMeta && (
          <Card
            size="small"
            style={{ marginBottom: 16, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}
          >
            <Space size="middle" wrap>
              <Tag color="success">已加载: {txtFileMeta.fileName}</Tag>
              <Text type="secondary">大小: {txtFileMeta.fileSize}</Text>
              <Text type="secondary">总字数: {txtFileMeta.charCount} 字</Text>
              <Tag color="blue">预估章节: 约 {txtFileMeta.chapterEstimate} 章</Tag>
            </Space>
            {txtFileMeta.preview && (
              <Paragraph
                ellipsis={{ rows: 2 }}
                style={{ marginTop: 8, fontSize: 12, color: '#475569', marginBottom: 0 }}
              >
                文本前瞻: {txtFileMeta.preview}
              </Paragraph>
            )}
          </Card>
        )}

        <Form form={txtForm} layout="vertical">
          <Form.Item name="rawText" hidden>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="title"
                label="作品名称"
                rules={[{ required: true, message: '请输入作品名称' }]}
              >
                <Input placeholder="自动提取自文件名，可自定义修改" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="author" label="作者署名（可选）">
                <Input placeholder="默认：佚名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="genre"
                label="所属题材类别"
                rules={[{ required: true, message: '请选择题材' }]}
                initialValue="体制官场"
              >
                <Select>
                  <Option value="体制官场">体制官场</Option>
                  <Option value="都市职场">都市职场</Option>
                  <Option value="社会现实">社会现实</Option>
                  <Option value="悬疑刑侦">悬疑刑侦</Option>
                  <Option value="玄幻修真">玄幻修真</Option>
                  <Option value="科幻未来">科幻未来</Option>
                  <Option value="历史演义">历史演义</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="语料来源归属">
                <Radio.Group
                  value={txtSourceMode}
                  onChange={(e) => setTxtSourceMode(e.target.value)}
                >
                  <Radio value="auto">自动创建并激活（推荐）</Radio>
                  <Radio value="existing">归属已有来源</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          {txtSourceMode === 'existing' && (
            <Form.Item
              name="sourceId"
              label="选择已有语料来源"
              rules={[{ required: true, message: '请选择归属来源' }]}
            >
              <Select placeholder="选择要追加归属的语料来源">
                {sources.map((s) => (
                  <Option key={s.id} value={s.id}>
                    {s.sourceName} ({s.genre} - {s.status === 'active' ? '已激活' : '待审核'})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};
