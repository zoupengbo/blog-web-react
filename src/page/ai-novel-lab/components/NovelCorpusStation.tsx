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
  Typography,
  Alert,
  Upload,
  Radio,
  Row,
  Col,
  Drawer,
  List,
  Avatar,
  Divider,
} from 'antd';
import {
  ReloadOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  InboxOutlined,
  BookOutlined,
  DeleteOutlined,
  EyeOutlined,
  GlobalOutlined,
  SearchOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  FireOutlined,
} from '@ant-design/icons';
import {
  getCorpusWorks,
  importTxtCorpusWork,
  deleteCorpusWork,
  seedBenchmarkCorpus,
  createDistillTask,
  searchOnlineNovels,
  diagnoseAndPlanTask,
  DiagnosisPlanItem,
  CorpusWorkItem,
} from '../services/labApi';
import { useTheme } from '../../../context/themeContext';

const { Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const GENRE_OPTIONS = [
  { value: '体制官场', label: '体制官场' },
  { value: '都市职场', label: '都市职场' },
  { value: '社会现实', label: '社会现实' },
  { value: '悬疑刑侦', label: '悬疑刑侦' },
  { value: '玄幻修真', label: '玄幻修真' },
  { value: '科幻未来', label: '科幻未来' },
];

const QUICK_PROBLEM_CHIPS = [
  { label: '体制对话', text: '主角在体制内对话过于直白生硬、像在念公文，缺少暗线机锋、含蓄推拉与潜台词试探' },
  { label: '因果动机', text: '配角动机单薄，反常举动或突然倒戈缺乏前置利益制衡与恩怨渊源，主角赢面显得机械降神' },
  { label: '白描去水', text: '场景描写流水账严重，缺乏动词主导的物理动作与空间站位，环境描写无法烘托人物心理' },
  { label: '公文合规', text: '办事流程欠严密，缺少真实的公文流转、程序留痕考量与各方权责推诿博弈细节' },
  { label: '去AI机械味', text: '过度使用抒情排比与作者上帝视角泄题，缺乏人类优秀作家冷峻克制的叙事留白' },
];

export const sanitizeGenre = (genre?: string, title?: string): string => {
  const g = (genre || '').trim();
  const t = (title || '').trim();
  if (/官场|体制|仕途|机关|政道|政界|选调|纪检|公务员|市委|省委/.test(g) ||
      (t && /官|体制|仕途|机关|政道|政界|选调|纪检|公务员|市委|省委|官神|官路|县委|书记|局长|市长/.test(t))) {
    return '体制官场';
  }
  if (/修真|修仙|仙侠|玄幻|洪荒|异界|奇幻/.test(g) || (t && /修真|修仙|仙侠|玄幻/.test(t))) {
    return '玄幻修真';
  }
  if (/历史|架空|权谋|朝堂|三国/.test(g) || (t && /历史|架空|权谋|大唐|大明/.test(t))) {
    return '历史架空';
  }
  if (/职场|都市|神医|日常|爽文|经商/.test(g) || (t && /职场|都市|商海|经商/.test(t))) {
    return '都市职场';
  }
  if (/笔趣|biquge|69书|shuba|起点|纵横|晋江|番茄|飞卢|看书|顶点|小说网|无弹窗|全网|未分类|未设置|未知|在线/.test(g) || !g) {
    return '体制官场';
  }
  return g;
};

export interface GroupedNovelItem {
  key: string;
  title: string;
  author: string;
  genre: string;
  totalChapters: number;
  totalWords: number;
  workIds: number[];
  chapters: CorpusWorkItem[];
  latestUpdate: string;
}

interface NovelCorpusStationProps {
  onGoToRules?: (genre?: string) => void;
}

export const NovelCorpusStation: React.FC<NovelCorpusStationProps> = ({ onGoToRules }) => {
  const { isDark } = useTheme();

  const themeStyles = {
    cardBg: isDark ? '#1e293b' : '#f8fafc',
    cardBorder: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    diagnosisBg: isDark ? 'rgba(22, 101, 52, 0.25)' : '#f0fdf4',
    diagnosisBorder: isDark ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid #bbf7d0',
    diagnosisTitle: isDark ? '#4ade80' : '#166534',
    diagnosisText: isDark ? '#bbf7d0' : '#14532d',
    selectedBookBg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
    selectedBookBorder: isDark ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #a7f3d0',
    listBg: isDark ? '#1e293b' : '#ffffff',
    listItemBg: isDark ? '#0f172a' : '#ffffff',
    listBorder: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
    metaText: isDark ? '#cbd5e1' : '#475569',
  };

  const [works, setWorks] = useState<CorpusWorkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // TXT 上传独立弹窗
  const [isTxtModalOpen, setIsTxtModalOpen] = useState<boolean>(false);
  const [txtForm] = Form.useForm();
  const [txtLoading, setTxtLoading] = useState<boolean>(false);
  const [txtFileMeta, setTxtFileMeta] = useState<{
    fileName: string;
    fileSize: string;
    charCount: number;
    chapterEstimate: number;
    preview: string;
  } | null>(null);

  // 查看章节抽屉
  const [viewNovel, setViewNovel] = useState<GroupedNovelItem | null>(null);
  const [seedLoading, setSeedLoading] = useState<boolean>(false);

  // ==================== AI 笔法自主诊断与两阶段提炼弹窗状态 ====================
  const [isDistillModalOpen, setIsDistillModalOpen] = useState<boolean>(false);
  const [distillPhase, setDistillPhase] = useState<1 | 2>(1);
  const [refSourceType, setRefSourceType] = useState<'existing' | 'online' | 'txt'>('existing');
  const [selectedNovel, setSelectedNovel] = useState<GroupedNovelItem | null>(null);
  const [userProblemText, setUserProblemText] = useState<string>('');
  const [analysisMode, setAnalysisMode] = useState<'targeted' | 'comprehensive'>('targeted');
  const [diagnosing, setDiagnosing] = useState<boolean>(false);
  const [diagnosisPlan, setDiagnosisPlan] = useState<DiagnosisPlanItem | null>(null);
  const [distillLoading, setDistillLoading] = useState<boolean>(false);

  // 全网搜索内嵌状态
  const [onlineSearchKw, setOnlineSearchKw] = useState<string>('');
  const [onlineResults, setOnlineResults] = useState<any[]>([]);
  const [onlineSearching, setOnlineSearching] = useState<boolean>(false);
  const [selectedOnlineBook, setSelectedOnlineBook] = useState<any | null>(null);

  const fetchWorks = async () => {
    setLoading(true);
    try {
      const res = await getCorpusWorks({ pageSize: 300 });
      if (res.code === 200) {
        setWorks(res.data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorks();
  }, []);

  // 按作品标题聚合小说
  const groupedNovels: GroupedNovelItem[] = React.useMemo(() => {
    const map = new Map<string, GroupedNovelItem>();
    for (const w of works) {
      const key = `${w.title}__${w.source?.genre || '体制官场'}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: w.title,
          author: w.author || '佚名',
          genre: w.source?.genre || '体制官场',
          totalChapters: 0,
          totalWords: 0,
          workIds: [],
          chapters: [],
          latestUpdate: w.created_at || '',
        });
      }
      const item = map.get(key)!;
      item.totalChapters += 1;
      item.totalWords += (w.wordCount || 0);
      item.workIds.push(w.id);
      item.chapters.push(w);
    }
    const list = Array.from(map.values());
    list.forEach((item) => {
      item.chapters.sort((a: CorpusWorkItem, b: CorpusWorkItem) => a.chapterNumber - b.chapterNumber);
    });
    return list;
  }, [works]);

  const handleSeedBenchmark = async () => {
    setSeedLoading(true);
    try {
      const res = await seedBenchmarkCorpus();
      if (res.code === 200) {
        message.success(res.message || '标杆示范语料初始化成功！');
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
      const res = await importTxtCorpusWork({
        title: values.title,
        author: values.author,
        genre: values.genre,
        rawText: values.rawText,
        sourceName: `${values.title}·语料库`,
      });

      if (res.code === 200) {
        message.success(res.message || `成功入库作品《${values.title}》！`);
        setIsTxtModalOpen(false);
        txtForm.resetFields();
        setTxtFileMeta(null);
        fetchWorks();
      }
    } catch (e: any) {
      message.error(e.message || 'TXT小说入库失败');
    } finally {
      setTxtLoading(false);
    }
  };

  const handleDeleteNovel = async (record: GroupedNovelItem) => {
    try {
      for (const id of record.workIds) {
        await deleteCorpusWork(id);
      }
      message.success(`已成功移除小说《${record.title}》全部切片`);
      fetchWorks();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  // ==================== 触发 AI 自主诊断与两阶段提炼 ====================
  const handleOpenDistill = (record?: GroupedNovelItem) => {
    setDistillPhase(1);
    setDiagnosisPlan(null);
    if (record) {
      setSelectedNovel(record);
      setRefSourceType('existing');
    } else if (!selectedNovel && groupedNovels.length > 0) {
      setSelectedNovel(groupedNovels[0]);
      setRefSourceType('existing');
    }
    setIsDistillModalOpen(true);
  };

  // 阶段 1 -> 阶段 2: 提交写作痛点并触发 AI 诊断与规划
  const handleDiagnoseAndPlan = async () => {
    let targetWorkTitle = '';
    let targetGenre = '体制官场';
    let targetWorkId: number | undefined;
    let targetNovelUrl: string | undefined;
    let customChapters: any[] | undefined;

    if (refSourceType === 'existing') {
      if (!selectedNovel) {
        message.warning('请先选择一部已入库的参考作品');
        return;
      }
      targetWorkTitle = selectedNovel.title;
      targetGenre = selectedNovel.genre;
      targetWorkId = selectedNovel.workIds[0];
    } else if (refSourceType === 'txt') {
      const txtVals = txtForm.getFieldsValue();
      if (!txtVals.rawText) {
        message.warning('请先上传或拖入 TXT 小说文件');
        return;
      }
      targetWorkTitle = txtVals.title || '上传文本参考小说';
      targetGenre = txtVals.genre || '体制官场';
      customChapters = [{ chapterNumber: 1, chapterTitle: '第1章', content: txtVals.rawText.slice(0, 3000) }];
    } else if (refSourceType === 'online') {
      if (!selectedOnlineBook) {
        message.warning('请先在全网搜索并选中一部参考小说');
        return;
      }
      targetWorkTitle = selectedOnlineBook.title;
      targetGenre = sanitizeGenre(selectedOnlineBook.genre, selectedOnlineBook.title);
      targetNovelUrl = selectedOnlineBook.url || selectedOnlineBook.sourceUrl;
    }

    if (!userProblemText.trim()) {
      message.warning('请简要描述你当前的写作瓶颈或想重点提升的笔法（可直接点击下方快捷标签）');
      return;
    }

    setDiagnosing(true);
    try {
      const res = await diagnoseAndPlanTask({
        workId: targetWorkId,
        workTitle: targetWorkTitle,
        genre: targetGenre,
        novelUrl: targetNovelUrl,
        customChapters,
        userProblem: userProblemText.trim(),
        analysisMode,
      });

      if (res.code === 200 && res.data) {
        setDiagnosisPlan(res.data);
        setDistillPhase(2);
        message.success('AI 自主诊断完成，请确认提炼方案！');
      } else {
        message.error(res.message || '诊断规划失败，请重试');
      }
    } catch (e: any) {
      message.error(e.message || 'AI 诊断异常');
    } finally {
      setDiagnosing(false);
    }
  };

  // 阶段 2: 用户确认提炼方案，正式创建并启动任务
  const handleExecuteDistillPlan = async () => {
    if (!diagnosisPlan) return;
    setDistillLoading(true);
    try {
      const cleanPlanGenre = sanitizeGenre(diagnosisPlan.genre, diagnosisPlan.workTitle);
      let finalWorkIds = selectedNovel?.workIds;
      let onlineNovelInfo: any = undefined;
      let selectedChapterUrls: string[] | undefined = undefined;

      if (refSourceType === 'txt') {
        const txtVals = txtForm.getFieldsValue();
        const importRes = await importTxtCorpusWork({
          title: txtVals.title || diagnosisPlan.workTitle,
          author: txtVals.author,
          genre: txtVals.genre || cleanPlanGenre,
          rawText: txtVals.rawText,
          sourceName: `${txtVals.title || diagnosisPlan.workTitle}·语料库`,
        });
        if (importRes.code === 200) {
          await fetchWorks();
        }
      } else if (refSourceType === 'online' && selectedOnlineBook) {
        onlineNovelInfo = {
          novelUrl: selectedOnlineBook.url || selectedOnlineBook.sourceUrl,
          title: selectedOnlineBook.title,
          author: selectedOnlineBook.author || '佚名',
          genre: cleanPlanGenre,
        };
        selectedChapterUrls = diagnosisPlan.selectedChapters.map(c => c.sourceUrl).filter(Boolean) as string[];
      }

      const res = await createDistillTask({
        taskName: `《${diagnosisPlan.workTitle}》[${diagnosisPlan.primaryCapabilities.join('+')}] 笔法提炼·定向攻坚`,
        genre: cleanPlanGenre,
        targetDimension: diagnosisPlan.primaryCapabilities[0] || 'dialogue',
        capabilities: diagnosisPlan.primaryCapabilities,
        workIds: finalWorkIds,
        sampleCount: diagnosisPlan.analysisBudget.chapterCount,
        requestedChapterCount: diagnosisPlan.analysisBudget.chapterCount,
        userProblem: diagnosisPlan.userProblem,
        analysisMode: diagnosisPlan.analysisMode,
        analysisPlan: diagnosisPlan,
        dynamicDimensions: diagnosisPlan.dynamicDimensions,
        selectedChapterNumbers: diagnosisPlan.selectedChapterNumbers,
        onlineNovelInfo,
        selectedChapterUrls,
      });

      if (res.code === 200) {
        message.success(`已启动针对“${diagnosisPlan.userProblem.slice(0, 15)}...”的 AI 笔法提炼流水线！`);
        setIsDistillModalOpen(false);
        fetchWorks();
        if (onGoToRules) {
          onGoToRules(cleanPlanGenre);
        }
      }
    } catch (e: any) {
      // 全局拦截
    } finally {
      setDistillLoading(false);
    }
  };

  const handleSearchOnlineBooks = async () => {
    if (!onlineSearchKw.trim()) {
      message.warning('请输入搜索书名或作者');
      return;
    }
    setOnlineSearching(true);
    try {
      const res = await searchOnlineNovels(onlineSearchKw.trim());
      if (res.code === 200) {
        const list = res.data?.searchResults || [];
        setOnlineResults(list);
        if (list.length === 0) {
          message.info('未在全网检索到相关小说，可更换关键词重试');
        }
      }
    } catch (e) {}
    finally {
      setOnlineSearching(false);
    }
  };

  const columns = [
    {
      title: '作品名称',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: GroupedNovelItem) => (
        <Space direction="vertical" size={2}>
          <Space>
            <BookOutlined style={{ color: '#0284c7' }} />
            <Text strong style={{ fontSize: 15 }}>{title}</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>作者: {record.author || '佚名'}</Text>
        </Space>
      ),
    },
    {
      title: '所属题材',
      dataIndex: 'genre',
      key: 'genre',
      render: (genre: string) => <Tag color="cyan">{genre}</Tag>,
    },
    {
      title: '章节体量',
      key: 'volume',
      render: (_: any, record: GroupedNovelItem) => (
        <Space>
          <Tag color="blue">{record.totalChapters} 个章节切片</Tag>
          <Text type="secondary">约 {(record.totalWords / 1000).toFixed(1)}k 字</Text>
        </Space>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: () => <Tag color="success">已就绪（可即时提炼）</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: GroupedNovelItem) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
            onClick={() => handleOpenDistill(record)}
          >
            一键提炼笔法
          </Button>
          <Button
            icon={<EyeOutlined />}
            onClick={() => setViewNovel(record)}
          >
            查看章节
          </Button>
          <Popconfirm
            title="确定移除该小说的所有切片吗？"
            description="移除后该作品的语料将不再参与蒸馏与规则提炼。"
            onConfirm={() => handleDeleteNovel(record)}
            okText="确定移除"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              移除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <BookOutlined style={{ color: '#0284c7' }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>小说语料书库</span>
            <Tag color="blue">{groupedNovels.length} 部作品</Tag>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchWorks}>
              刷新
            </Button>
            <Popconfirm
              title="初始化高质量标杆示范小说？"
              description="将自动就绪体制官场、都市职场与玄幻修真高质量示范小说章节，直接即可开箱提炼！"
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
                一键初始化标杆小说
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              onClick={() => {
                txtForm.resetFields();
                setTxtFileMeta(null);
                setIsTxtModalOpen(true);
              }}
            >
              上传 TXT 小说
            </Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
              onClick={() => handleOpenDistill()}
            >
              AI 笔法诊断与提炼
            </Button>
          </Space>
        }
      >
        <Alert
          message="AI 自主诊断与写作笔法提炼"
          description="无需人工猜测抓取多少章节或生硬选择单一固定维度。只需提供参考小说，描述你目前的写作瓶颈，AI 即可深度剖析病理、自主从范本文本中甄选实战教学章节、动态定制提炼维度，生成直击痛点的写手军规！"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          dataSource={groupedNovels}
          columns={columns}
          rowKey="key"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* TXT 独立上传入库弹窗 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#059669' }} />
            <span>上传 TXT 小说全自动切片入库</span>
          </Space>
        }
        open={isTxtModalOpen}
        onOk={handleImportTxtSubmit}
        confirmLoading={txtLoading}
        onCancel={() => {
          setIsTxtModalOpen(false);
          txtForm.resetFields();
          setTxtFileMeta(null);
        }}
        okText="确认切片入库"
        cancelText="取消"
        width={680}
        destroyOnClose
      >
        <Form form={txtForm} layout="vertical">
          <Form.Item label="选择或拖拽 TXT 文件" required>
            <Upload.Dragger
              accept=".txt"
              showUploadList={false}
              beforeUpload={handleTxtFileSelect}
              style={{ padding: '20px 0' }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#059669' }} />
              </p>
              <p className="ant-upload-text">点击或将本地小说 TXT 文件拖拽到此处</p>
              <p className="ant-upload-hint">支持各类标准长篇小说，系统将自动基于章节标记与段落自适应分章入库</p>
            </Upload.Dragger>
          </Form.Item>

          {txtFileMeta && (
            <Alert
              message={`已读取文件：${txtFileMeta.fileName} (${txtFileMeta.fileSize})`}
              description={
                <Space direction="vertical" size={2} style={{ marginTop: 4 }}>
                  <Text>预估有效字数: {txtFileMeta.charCount} 字 | 识别章节切片: 约 {txtFileMeta.chapterEstimate} 章</Text>
                  <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                    预览: {txtFileMeta.preview}
                  </Paragraph>
                </Space>
              }
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="title"
                label="作品书名"
                rules={[{ required: true, message: '请输入作品书名' }]}
              >
                <Input placeholder="例如：官神、执笔青云" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="author" label="作者（选填）">
                <Input placeholder="作者名" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="genre"
            label="所属题材类别"
            rules={[{ required: true, message: '请选择题材' }]}
            initialValue="体制官场"
          >
            <Select options={GENRE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ==================== AI 自主诊断与两阶段笔法提炼弹窗 ==================== */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#0284c7' }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              {distillPhase === 1 ? 'AI 写作痛点诊断与提炼规划' : '确认 AI 笔法提炼实战方案'}
            </span>
          </Space>
        }
        open={isDistillModalOpen}
        onCancel={() => {
          setIsDistillModalOpen(false);
          setDistillPhase(1);
        }}
        width={840}
        destroyOnClose
        footer={
          distillPhase === 1 ? (
            <Space>
              <Button onClick={() => setIsDistillModalOpen(false)}>取消</Button>
              <Button
                type="primary"
                icon={<RobotOutlined />}
                loading={diagnosing}
                style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                onClick={handleDiagnoseAndPlan}
              >
                AI 智能诊断并生成方案
              </Button>
            </Space>
          ) : (
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setDistillPhase(1)}>
                返回调整痛点与作品
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={distillLoading}
                style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                onClick={handleExecuteDistillPlan}
              >
                确认方案，启动笔法提炼
              </Button>
            </Space>
          )
        }
      >
        {distillPhase === 1 ? (
          <div>
            <Alert
              message="第一阶段：选择参考范本与自述当前创作痛点"
              description="请提供参考小说范本，并用自然语言描述你在写作中遇到的具体困境（如对话生硬、配角无动机、白描流水账等）。AI 将深度解构病理，自主在范本中挑选戏眼教学章节与定制提炼维度。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            {/* 参考作品来源切换 */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                📚 参考作品来源：
              </Text>
              <Radio.Group
                value={refSourceType}
                onChange={(e) => setRefSourceType(e.target.value)}
                buttonStyle="solid"
                style={{ width: '100%', marginBottom: 12 }}
              >
                <Radio.Button value="existing" style={{ width: '33.3%', textAlign: 'center' }}>
                  <BookOutlined /> 已入库作品 ({groupedNovels.length})
                </Radio.Button>
                <Radio.Button value="online" style={{ width: '33.3%', textAlign: 'center' }}>
                  <GlobalOutlined /> 全网搜索参考小说
                </Radio.Button>
                <Radio.Button value="txt" style={{ width: '33.3%', textAlign: 'center' }}>
                  <FileTextOutlined /> 上传本地 TXT 小说
                </Radio.Button>
              </Radio.Group>

              {/* 来源 A: 已入库书库选择 */}
              {refSourceType === 'existing' && (
                <div className="distill-source-box" style={{ background: themeStyles.cardBg, padding: '12px 16px', borderRadius: 8, border: themeStyles.cardBorder }}>
                  <Text strong style={{ display: 'block', marginBottom: 8, color: themeStyles.textPrimary }}>选择参考范本小说：</Text>
                  <Select
                    style={{ width: '100%' }}
                    value={selectedNovel?.key}
                    placeholder="请选择已入库的小说"
                    onChange={(val) => {
                      const found = groupedNovels.find(n => n.key === val);
                      if (found) setSelectedNovel(found);
                    }}
                  >
                    {groupedNovels.map(novel => (
                      <Option key={novel.key} value={novel.key}>
                        <Space>
                          <Text strong>《{novel.title}》</Text>
                          <Tag color="cyan">{novel.genre}</Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>作者: {novel.author} · 已入库 {novel.totalChapters} 章</Text>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </div>
              )}

              {/* 来源 B: 全网小说搜索 */}
              {refSourceType === 'online' && (
                <div className="distill-source-box" style={{ background: themeStyles.cardBg, padding: '12px 16px', borderRadius: 8, border: themeStyles.cardBorder }}>
                  <Text strong style={{ display: 'block', marginBottom: 8, color: themeStyles.textPrimary }}>全网搜索参考作品：</Text>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="输入参考小说书名或作者（如：官神、侯卫东官场笔记、大医凌然...）"
                      value={onlineSearchKw}
                      onChange={(e) => setOnlineSearchKw(e.target.value)}
                      onPressEnter={handleSearchOnlineBooks}
                      allowClear
                    />
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      loading={onlineSearching}
                      onClick={handleSearchOnlineBooks}
                      style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                    >
                      搜索全网
                    </Button>
                  </Space.Compact>

                  {selectedOnlineBook && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: themeStyles.selectedBookBg, border: themeStyles.selectedBookBorder, borderRadius: 6 }}>
                      <Space>
                        <BookOutlined style={{ color: '#059669', fontSize: 16 }} />
                        <span style={{ fontWeight: 600, color: themeStyles.textPrimary }}>已选参考小说：</span>
                        <span style={{ fontWeight: 600, color: '#059669', fontSize: 15 }}>《{selectedOnlineBook.title}》</span>
                        <span style={{ color: themeStyles.textSecondary, fontSize: 12 }}>作者: {selectedOnlineBook.author || '佚名'}</span>
                        <Tag color="cyan">{sanitizeGenre(selectedOnlineBook.genre, selectedOnlineBook.title)}</Tag>
                      </Space>
                    </div>
                  )}

                  {onlineResults.length > 0 && !selectedOnlineBook && (
                    <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 12, border: themeStyles.cardBorder, borderRadius: 6, background: themeStyles.listBg }}>
                      <List
                        size="small"
                        dataSource={onlineResults.slice(0, 8)}
                        renderItem={(item) => (
                          <List.Item
                            style={{ cursor: 'pointer', padding: '8px 12px' }}
                            onClick={() => setSelectedOnlineBook(item)}
                          >
                            <Space style={{ flex: 1 }}>
                              <Text strong>《{item.title}》</Text>
                              <Text type="secondary">{item.author}</Text>
                              <Tag color="purple">{sanitizeGenre(item.genre, item.title)}</Tag>
                            </Space>
                            <Button size="small" type="primary" ghost>选择该书</Button>
                          </List.Item>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 来源 C: 本地 TXT 上传 */}
              {refSourceType === 'txt' && (
                <div className="distill-source-box" style={{ background: themeStyles.cardBg, padding: '12px 16px', borderRadius: 8, border: themeStyles.cardBorder }}>
                  <Upload.Dragger
                    accept=".txt"
                    showUploadList={false}
                    beforeUpload={handleTxtFileSelect}
                    style={{ padding: '12px 0' }}
                  >
                    <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#059669' }} /></p>
                    <p className="ant-upload-text">点击或拖拽本地参考小说 TXT 文件至此处</p>
                  </Upload.Dragger>
                  {txtFileMeta && (
                    <Alert
                      type="success"
                      showIcon
                      style={{ marginTop: 10 }}
                      message={`已就绪: 《${txtFileMeta.fileName}》 (${txtFileMeta.fileSize}, 约 ${txtFileMeta.charCount} 字)`}
                    />
                  )}
                </div>
              )}
            </div>

            {/* 写作痛点描述 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text strong style={{ fontSize: 14, color: themeStyles.textPrimary }}>
                  📝 描述你当前的写作瓶颈或想重点攻克的技巧：
                </Text>
                <span style={{ fontSize: 12, color: themeStyles.textSecondary }}>
                  AI 将根据你描述的痛点在参考书中定向精准选章
                </span>
              </div>
              <TextArea
                rows={4}
                placeholder="详细描述你在小说创作中遇到的瓶颈。例如：主角在体制内对话太生硬、像在背文件，没有暗线机锋与潜台词试探；或者配角总是突兀送小抄送人头，因果动机不足；或者场景白描流水账严重..."
                value={userProblemText}
                onChange={(e) => setUserProblemText(e.target.value)}
                maxLength={500}
                showCount
              />
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 12, color: themeStyles.textSecondary }}>💡 快捷痛点预设:</span>
                {QUICK_PROBLEM_CHIPS.map((chip, idx) => (
                  <Tag
                    key={idx}
                    color="blue"
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => {
                      setUserProblemText((prev) => (prev ? `${prev}；${chip.text}` : chip.text));
                    }}
                  >
                    {chip.label}
                  </Tag>
                ))}
              </div>
            </div>

            {/* 分析模式 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8, color: themeStyles.textPrimary }}>🎯 分析模式：</Text>
              <Radio.Group
                value={analysisMode}
                onChange={(e) => setAnalysisMode(e.target.value)}
              >
                <Radio value="targeted">
                  <Space direction="vertical" size={2}>
                    <Text strong>针对性提升 (推荐)</Text>
                    <span style={{ fontSize: 12, color: themeStyles.textSecondary }}>
                      聚焦当前自述痛点，AI 自主诊断核心成因，精选 3~8 个高张力教学章节定向攻坚
                    </span>
                  </Space>
                </Radio>
                <Radio value="comprehensive" style={{ marginTop: 10 }}>
                  <Space direction="vertical" size={2}>
                    <Text strong>全面能力分析</Text>
                    <span style={{ fontSize: 12, color: themeStyles.textSecondary }}>
                      综合解构参考作品，覆盖对话、白描、因果、暗线制度多维系统性规约
                    </span>
                  </Space>
                </Radio>
              </Radio.Group>
            </div>
          </div>
        ) : (
          /* ==================== 第二阶段：方案确认与执行 ==================== */
          diagnosisPlan && (
            <div>
              <Alert
                message={`第二阶段：方案确认 · 参考范本《${diagnosisPlan.workTitle}》（${sanitizeGenre(diagnosisPlan.genre, diagnosisPlan.workTitle)}）`}
                description="AI 已完成病理诊断，并从目录中精准锁定教学戏眼章节与定制维度。请查阅下方方案，确认无误后点击下方按钮启动提炼。"
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />

              {/* AI 病理诊断卡片 */}
              <div
                className="distill-diagnosis-card"
                style={{
                  background: themeStyles.diagnosisBg,
                  border: themeStyles.diagnosisBorder,
                  borderRadius: 8,
                  padding: '12px 16px',
                  marginBottom: 16,
                }}
              >
                <Space align="center" style={{ marginBottom: 6 }}>
                  <RobotOutlined style={{ color: themeStyles.diagnosisTitle, fontSize: 16 }} />
                  <span style={{ fontWeight: 600, color: themeStyles.diagnosisTitle, fontSize: 14 }}>
                    AI 写作瓶颈病理诊断与破局策略
                  </span>
                </Space>
                <Paragraph style={{ margin: 0, color: themeStyles.diagnosisText, fontSize: 13, lineHeight: '1.6' }}>
                  {diagnosisPlan.problemDiagnosis}
                </Paragraph>
              </div>

              {/* 动态分析维度 */}
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 8, color: themeStyles.textPrimary }}>
                  🎯 动态分析维度 ({diagnosisPlan.dynamicDimensions.length} 项)：
                </Text>
                <Row gutter={[12, 12]}>
                  {diagnosisPlan.dynamicDimensions.map((dim, idx) => (
                    <Col span={12} key={idx}>
                      <div
                        className="distill-dimension-card"
                        style={{
                          padding: '10px 14px',
                          background: themeStyles.cardBg,
                          border: themeStyles.cardBorder,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: themeStyles.textPrimary }}>{dim.name}</span>
                          <Tag color="cyan">{dim.primaryCapability}</Tag>
                        </div>
                        <span style={{ fontSize: 12, color: themeStyles.textSecondary, lineHeight: 1.5, display: 'block' }}>
                          {dim.focus}
                        </span>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>

              {/* AI 精选教学章节 */}
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 8, color: themeStyles.textPrimary }}>
                  📚 AI 精选实战教学章节 ({diagnosisPlan.selectedChapters.length} 章)：
                </Text>
                <List
                  size="small"
                  bordered
                  className="distill-chapters-list"
                  style={{
                    background: themeStyles.listBg,
                    border: themeStyles.cardBorder,
                    maxHeight: 220,
                    overflowY: 'auto',
                    borderRadius: 8,
                  }}
                  dataSource={diagnosisPlan.selectedChapters}
                  renderItem={(item) => (
                    <List.Item style={{ background: themeStyles.listItemBg, borderBottom: themeStyles.cardBorder }}>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Space>
                            <Tag color="blue">第 {item.chapterNumber} 章</Tag>
                            <span style={{ fontWeight: 600, color: themeStyles.textPrimary }}>{item.chapterTitle}</span>
                          </Space>
                        </div>
                        <div style={{ fontSize: 12, color: themeStyles.metaText, marginBottom: 2 }}>
                          <span style={{ color: '#0284c7', fontWeight: 600 }}>[甄选依据] </span>{item.reason}
                        </div>
                        <div style={{ fontSize: 12, color: themeStyles.metaText }}>
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>[预期收益] </span>{item.expectedValue}
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </div>

              {/* 预算与质检说明 */}
              <div
                className="distill-budget-bar"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: themeStyles.cardBg,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: themeStyles.cardBorder,
                  color: themeStyles.textPrimary,
                }}
              >
                <Space size="middle">
                  <span>📖 分析章节: <b>{diagnosisPlan.analysisBudget.chapterCount}</b> 章</span>
                  <span>🧩 预计段落切片: <b>{diagnosisPlan.analysisBudget.estimatedSliceCount}</b> 个</span>
                  <span>⚡ 预估 Token: <b>~{diagnosisPlan.analysisBudget.estimatedTokens}</b></span>
                </Space>
                <span style={{ fontSize: 12, color: themeStyles.textSecondary }}>
                  💡 {diagnosisPlan.uncertaintyNote || '自动执行原文证据回溯与冲突质检'}
                </span>
              </div>
            </div>
          )
        )}
      </Modal>

      {/* 查看章节详情抽屉 */}
      <Drawer
        title={`《${viewNovel?.title}》章节切片清单`}
        open={!!viewNovel}
        onClose={() => setViewNovel(null)}
        width={560}
      >
        {viewNovel && (
          <List
            dataSource={viewNovel.chapters}
            renderItem={(chap) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color="blue">第 {chap.chapterNumber} 章</Tag>
                      <Text strong>{chap.chapterTitle || chap.title}</Text>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={2}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        字数: {chap.wordCount} 字 | 对白比例: {((chap.qualityMetrics?.dialogueRatio || 0) * 100).toFixed(0)}%
                      </Text>
                      <Paragraph ellipsis={{ rows: 2 }} style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                        {chap.content ? chap.content.slice(0, 120) + '...' : '暂无内容'}
                      </Paragraph>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </div>
  );
};
