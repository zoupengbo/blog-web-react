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
  Tabs,
  Spin,
  Avatar,
  Checkbox,
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
  CloudDownloadOutlined,
  RobotOutlined,
  UnorderedListOutlined,
  StarOutlined,
} from '@ant-design/icons';
import {
  getCorpusWorks,
  importTxtCorpusWork,
  deleteCorpusWork,
  seedBenchmarkCorpus,
  createDistillTask,
  searchOnlineNovels,
  importOnlineNovel,
  getOnlineNovelChapters,
  aiSelectChapters,
  CorpusWorkItem,
} from '../services/labApi';
import { StorageUtil } from '../../entertainment/ebookReader/utils/storage';

const { Text, Paragraph } = Typography;
const { Option } = Select;

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
  const [works, setWorks] = useState<CorpusWorkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // TXT 上传弹窗
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

  // 一键提炼弹窗
  const [isDistillModalOpen, setIsDistillModalOpen] = useState<boolean>(false);
  const [selectedNovel, setSelectedNovel] = useState<GroupedNovelItem | null>(null);
  const [distillForm] = Form.useForm();
  const [distillLoading, setDistillLoading] = useState<boolean>(false);

  // 查看章节抽屉
  const [viewNovel, setViewNovel] = useState<GroupedNovelItem | null>(null);
  const [seedLoading, setSeedLoading] = useState<boolean>(false);

  // 全网在线小说检索与采编弹窗
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState<boolean>(false);
  const [onlineSearchKeyword, setOnlineSearchKeyword] = useState<string>('');
  const [onlineSearchResults, setOnlineSearchResults] = useState<any[]>([]);
  const [onlineSearchLoading, setOnlineSearchLoading] = useState<boolean>(false);
  const [onlineImportLoadingUrl, setOnlineImportLoadingUrl] = useState<string | null>(null);
  const [onlineGenreMap, setOnlineGenreMap] = useState<Record<string, string>>({});
  const [onlineChapterCountMap, setOnlineChapterCountMap] = useState<Record<string, number>>({});
  const [onlineModeMap, setOnlineModeMap] = useState<Record<string, 'ai_climax' | 'true_opening'>>({});
  const [bookshelfBooks, setBookshelfBooks] = useState<any[]>([]);

  // 章节目录挑选与 AI 戏眼推荐 Drawer 状态
  const [isPickerDrawerOpen, setIsPickerDrawerOpen] = useState<boolean>(false);
  const [pickerBook, setPickerBook] = useState<any>(null);
  const [pickerChapters, setPickerChapters] = useState<Array<{ title: string; sourceUrl: string; chapterNumber: number }>>([]);
  const [pickerLoading, setPickerLoading] = useState<boolean>(false);
  const [selectedChapterUrls, setSelectedChapterUrls] = useState<string[]>([]);
  const [aiClimaxUrls, setAiClimaxUrls] = useState<string[]>([]);
  const [aiPickingLoading, setAiPickingLoading] = useState<boolean>(false);
  const [aiSelectionRationale, setAiSelectionRationale] = useState<string>('');
  const [pickerImportLoading, setPickerImportLoading] = useState<boolean>(false);
  const [chapterSearchKw, setChapterSearchKw] = useState<string>('');

  const openOnlineModal = () => {
    try {
      const shelf = StorageUtil.getBookshelf() || [];
      setBookshelfBooks(shelf);
    } catch (e) {
      console.warn('获取阅读器书架失败:', e);
    }
    setIsOnlineModalOpen(true);
  };

  const handleSearchOnline = async (kw?: string) => {
    const keyword = (kw !== undefined ? kw : onlineSearchKeyword).trim();
    if (!keyword) {
      message.warning('请输入搜索书名或作者关键词');
      return;
    }
    setOnlineSearchLoading(true);
    try {
      const res = await searchOnlineNovels(keyword);
      if (res.code === 200) {
        const results = res.data?.searchResults || [];
        setOnlineSearchResults(results);
        if (results.length === 0) {
          message.info('未在全网检索到相关小说，可更换关键词重试');
        }
      }
    } catch (e: any) {
      // 全局拦截
    } finally {
      setOnlineSearchLoading(false);
    }
  };

  const handleImportOnlineBook = async (bookItem: any) => {
    const bookUrl = bookItem.url || bookItem.sourceUrl;
    if (!bookUrl) {
      message.error('该书籍缺少在线网络链接，无法抓取');
      return;
    }
    setOnlineImportLoadingUrl(bookUrl);
    try {
      const genre = onlineGenreMap[bookUrl] || '体制官场';
      const count = onlineChapterCountMap[bookUrl] || 3;
      const mode = onlineModeMap[bookUrl] || 'ai_climax';

      const res = await importOnlineNovel({
        novelUrl: bookUrl,
        title: bookItem.title,
        author: bookItem.author,
        genre,
        chapterCount: count,
        mode,
      });

      if (res.code === 200) {
        message.success(res.message || `成功入库《${bookItem.title}》！`);
        fetchWorks();
      }
    } catch (e: any) {
      // 全局拦截
    } finally {
      setOnlineImportLoadingUrl(null);
    }
  };

  const handleOpenPicker = async (bookItem: any) => {
    const bookUrl = bookItem.url || bookItem.sourceUrl;
    if (!bookUrl) {
      message.error('该书籍缺少在线网络链接');
      return;
    }
    setPickerBook(bookItem);
    setIsPickerDrawerOpen(true);
    setPickerLoading(true);
    setSelectedChapterUrls([]);
    setAiClimaxUrls([]);
    setAiSelectionRationale('');
    setChapterSearchKw('');

    try {
      const res = await getOnlineNovelChapters(bookUrl);
      if (res.code === 200) {
        const chaps = res.data?.chapters || [];
        setPickerChapters(chaps);
        if (chaps.length > 0) {
          setSelectedChapterUrls(chaps.slice(0, 3).map(c => c.sourceUrl));
        }
      }
    } catch (e: any) {
      message.error(e.message || '获取章节目录失败');
    } finally {
      setPickerLoading(false);
    }
  };

  const handleAiPickInDrawer = async (count = 3) => {
    if (!pickerBook || pickerChapters.length === 0) return;
    const bookUrl = pickerBook.url || pickerBook.sourceUrl;
    const genre = onlineGenreMap[bookUrl] || '体制官场';
    setAiPickingLoading(true);
    try {
      const res = await aiSelectChapters({
        title: pickerBook.title,
        genre,
        chapters: pickerChapters,
        novelUrl: bookUrl,
        count,
        mode: 'ai_climax',
      });
      if (res.code === 200 && res.data?.selectedChapters) {
        const urls = res.data.selectedChapters.map(c => c.sourceUrl);
        setSelectedChapterUrls(urls);
        setAiClimaxUrls(urls);
        setAiSelectionRationale(res.data.rationale || '');
        message.success(`AI 已精准甄选出 ${urls.length} 个高潮博弈戏眼章！`);
      }
    } catch (e: any) {
      message.error(e.message || 'AI 甄选章节失败');
    } finally {
      setAiPickingLoading(false);
    }
  };

  const handleSelectOpeningInDrawer = (count = 3) => {
    const urls = pickerChapters.slice(0, count).map(c => c.sourceUrl);
    setSelectedChapterUrls(urls);
    setAiSelectionRationale(`已勾选《${pickerBook?.title}》黄金开篇前 ${urls.length} 章`);
  };

  const handleToggleSelectChapter = (url: string) => {
    setSelectedChapterUrls(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const handleConfirmPickerImport = async () => {
    if (!pickerBook) return;
    const bookUrl = pickerBook.url || pickerBook.sourceUrl;
    if (selectedChapterUrls.length === 0) {
      message.warning('请至少勾选一个章节');
      return;
    }
    setPickerImportLoading(true);
    try {
      const genre = onlineGenreMap[bookUrl] || '体制官场';
      const res = await importOnlineNovel({
        novelUrl: bookUrl,
        title: pickerBook.title,
        author: pickerBook.author,
        genre,
        mode: 'manual',
        selectedChapterUrls,
      });
      if (res.code === 200) {
        message.success(res.message || '章节切片入库成功！');
        setIsPickerDrawerOpen(false);
        fetchWorks();
      }
    } catch (e: any) {
      message.error(e.message || '导入章节切片失败');
    } finally {
      setPickerImportLoading(false);
    }
  };

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
    // 章节排序
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

  const handleOpenDistill = (record: GroupedNovelItem) => {
    setSelectedNovel(record);
    distillForm.setFieldsValue({
      dimension: 'dialogue',
      sampleCount: Math.min(record.chapters.length, 5),
    });
    setIsDistillModalOpen(true);
  };

  const handleStartDistill = async () => {
    if (!selectedNovel) return;
    try {
      const values = await distillForm.validateFields();
      setDistillLoading(true);

      const res = await createDistillTask({
        taskName: `${selectedNovel.title} [${values.dimension}] 笔法提炼`,
        genre: selectedNovel.genre,
        targetDimension: values.dimension,
        workIds: selectedNovel.workIds.slice(0, values.sampleCount || 5),
        sampleCount: values.sampleCount || 5,
      });

      if (res.code === 200) {
        message.success('已启动 AI 深度蒸馏任务！正文生成与因果动机模型提炼中...');
        setIsDistillModalOpen(false);
        if (onGoToRules) {
          onGoToRules(selectedNovel.genre);
        }
      }
    } catch (e: any) {
      // 错误已由 request 拦截
    } finally {
      setDistillLoading(false);
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
            title={`确定移除小说《${record.title}》吗？`}
            description="将同时删除该书已切片的所有章节语料记录。"
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
              icon={<GlobalOutlined />}
              style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
              onClick={openOnlineModal}
            >
              全网搜书采编
            </Button>
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
          </Space>
        }
      >
        <Alert
          message="极简模式：免复杂授权审核，拖入小说直接提炼"
          description="将你喜欢的优秀同类型小说 TXT 拖入此处，系统自动解析章节并就绪。点击【一键提炼笔法】，AI 即可自动逆向拆解人类作者的精妙对话潜台词与深层因果动机！"
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

      {/* TXT 上传弹窗 */}
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
          setTxtFileMeta(null);
        }}
        width={680}
        destroyOnClose
        okText="立即解析并加入书库"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <Upload.Dragger
            accept=".txt,.md"
            showUploadList={false}
            beforeUpload={handleTxtFileSelect}
            style={{ padding: '20px 0', background: '#f8fafc', border: '1px dashed #cbd5e1' }}
          >
            <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
              <InboxOutlined style={{ color: '#059669', fontSize: 36 }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 15, fontWeight: 500 }}>
              点击或将 .txt 小说文件拖拽到此区域
            </p>
            <p className="ant-upload-hint" style={{ color: '#64748b' }}>
              支持整本长篇或多章文本，浏览器毫秒级读取，自动按“第X章”切片
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
                <Input placeholder="自动提取文件名，可修改" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="author" label="作者署名（可选）">
                <Input placeholder="默认：佚名" />
              </Form.Item>
            </Col>
          </Row>

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
        </Form>
      </Modal>

      {/* 一键提炼弹窗 */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#0284c7' }} />
            <span>从《{selectedNovel?.title}》提炼写作笔法</span>
          </Space>
        }
        open={isDistillModalOpen}
        onOk={handleStartDistill}
        confirmLoading={distillLoading}
        onCancel={() => setIsDistillModalOpen(false)}
        okText="开始提炼"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={distillForm} layout="vertical" initialValues={{ dimension: 'dialogue', sampleCount: 3 }}>
          <Form.Item label="作品与题材">
            <Input value={`${selectedNovel?.title} (${selectedNovel?.genre}) · 共 ${selectedNovel?.totalChapters} 章`} disabled />
          </Form.Item>

          <Form.Item name="dimension" label="提炼重点维度" rules={[{ required: true }]}>
            <Radio.Group style={{ width: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio value="dialogue">
                  <Text strong>对话机锋与潜台词点透</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginLeft: 24 }}>
                    重点逆向破解上位者含蓄施压、下位者程序留痕与逢三必解的说话玄机
                  </Text>
                </Radio>
                <Radio value="scene">
                  <Text strong>场景白描与客观事实推演</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginLeft: 24 }}>
                    动词主导、砍掉流水账形容词，讲究空间站位与物理事务动作
                  </Text>
                </Radio>
                <Radio value="pacing">
                  <Text strong>因果动机与留白克制</Text>
                  <Text type="secondary" style={{ display: 'block', fontSize: 12, marginLeft: 24 }}>
                    凡反常举动必交代前置恩怨与利益诱因，杜绝突兀送小抄与机械降神
                  </Text>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="sampleCount" label="参与采样的章节切片数">
            <Select>
              <Option value={1}>精选 1 章切片进行极速提炼</Option>
              <Option value={2}>精选 2 章切片进行对比提炼</Option>
              <Option value={3}>精选 3 章切片深度交叉提炼 (推荐)</Option>
              <Option value={5}>精选 5 章多样本全方位提炼</Option>
            </Select>
          </Form.Item>
        </Form>
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

      {/* 全网搜书采编与阅读器书架导入弹窗 */}
      <Modal
        title={
          <Space>
            <GlobalOutlined style={{ color: '#7c3aed' }} />
            <span>全网搜书采编与阅读器书架引入</span>
          </Space>
        }
        open={isOnlineModalOpen}
        onCancel={() => setIsOnlineModalOpen(false)}
        footer={null}
        width={780}
        destroyOnClose
      >
        <Tabs
          defaultActiveKey="search"
          items={[
            {
              key: 'search',
              label: (
                <Space>
                  <SearchOutlined />
                  <span>全网搜书采编</span>
                </Space>
              ),
              children: (
                <div>
                  <Alert
                    message="即搜即采：一键将全网精品同类小说切片纳入语料库"
                    description="输入书名或作者进行全网搜索，选中作品后后台将直接抓取前 3~5 章高质量正文切片入库，免手动下载与繁琐复制。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                    <Input
                      placeholder="输入书名或作者，如：侯卫东官场笔记、大医凌然、宿命之环..."
                      value={onlineSearchKeyword}
                      onChange={(e) => setOnlineSearchKeyword(e.target.value)}
                      onPressEnter={() => handleSearchOnline()}
                      allowClear
                    />
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      onClick={() => handleSearchOnline()}
                      loading={onlineSearchLoading}
                      style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
                    >
                      搜索全网
                    </Button>
                  </Space.Compact>

                  <List
                    loading={onlineSearchLoading}
                    dataSource={onlineSearchResults}
                    locale={{ emptyText: '输入关键词搜索全网小说' }}
                    renderItem={(item: any) => {
                      const bookUrl = item.url || item.sourceUrl;
                      const isImporting = onlineImportLoadingUrl === bookUrl;
                      const selectedGenre = onlineGenreMap[bookUrl] || '体制官场';
                      const selectedCount = onlineChapterCountMap[bookUrl] || 3;

                      return (
                        <List.Item
                          actions={[
                            <Space key="action">
                              <Select
                                size="small"
                                style={{ width: 105 }}
                                value={selectedGenre}
                                onChange={(val) =>
                                  setOnlineGenreMap((prev) => ({ ...prev, [bookUrl]: val }))
                                }
                              >
                                <Option value="体制官场">体制官场</Option>
                                <Option value="都市职场">都市职场</Option>
                                <Option value="社会现实">社会现实</Option>
                                <Option value="悬疑刑侦">悬疑刑侦</Option>
                                <Option value="玄幻修真">玄幻修真</Option>
                                <Option value="科幻未来">科幻未来</Option>
                              </Select>
                              <Select
                                size="small"
                                style={{ width: 135 }}
                                value={onlineModeMap[bookUrl] || 'ai_climax'}
                                onChange={(val) =>
                                  setOnlineModeMap((prev) => ({ ...prev, [bookUrl]: val }))
                                }
                              >
                                <Option value="ai_climax">🤖 AI甄选戏眼</Option>
                                <Option value="true_opening">📖 黄金正文开篇</Option>
                              </Select>
                              <Select
                                size="small"
                                style={{ width: 90 }}
                                value={selectedCount}
                                onChange={(val) =>
                                  setOnlineChapterCountMap((prev) => ({ ...prev, [bookUrl]: val }))
                                }
                              >
                                <Option value={1}>采编 1 章</Option>
                                <Option value={3}>采编 3 章</Option>
                                <Option value={5}>采编 5 章</Option>
                              </Select>
                              <Button
                                size="small"
                                icon={<UnorderedListOutlined />}
                                onClick={() => handleOpenPicker(item)}
                              >
                                挑选目录
                              </Button>
                              <Button
                                type="primary"
                                size="small"
                                icon={<CloudDownloadOutlined />}
                                loading={isImporting}
                                onClick={() => handleImportOnlineBook(item)}
                                style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                              >
                                快速采编
                              </Button>
                            </Space>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              item.cover ? (
                                <img
                                  src={item.cover}
                                  alt="cover"
                                  style={{ width: 44, height: 58, objectFit: 'cover', borderRadius: 4 }}
                                />
                              ) : (
                                <Avatar shape="square" size={48} style={{ backgroundColor: '#8b5cf6' }}>
                                  {item.title ? item.title.slice(0, 2) : '书'}
                                </Avatar>
                              )
                            }
                            title={
                              <Space>
                                <Text strong style={{ fontSize: 14 }}>{item.title}</Text>
                                {item.author && <Tag color="default">{item.author}</Tag>}
                              </Space>
                            }
                            description={
                              <Space direction="vertical" size={2}>
                                {item.latestChapter && (
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    最新: {item.latestChapter}
                                  </Text>
                                )}
                                {item.intro && (
                                  <Paragraph ellipsis={{ rows: 2 }} style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                                    {item.intro}
                                  </Paragraph>
                                )}
                              </Space>
                            }
                          />
                        </List.Item>
                      );
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'shelf',
              label: (
                <Space>
                  <BookOutlined />
                  <span>我的阅读书架 ({bookshelfBooks.length})</span>
                </Space>
              ),
              children: (
                <div>
                  <Alert
                    message="我的阅读书架直通车"
                    description="你在系统内置【电子书阅读器】中收藏的书架小说，均可一键转为语料库切片，用于逆向提炼写作笔法。"
                    type="success"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <List
                    dataSource={bookshelfBooks}
                    locale={{ emptyText: '当前阅读器书架暂无书籍，可先在阅读器中添加书籍或使用“全网搜书采编”' }}
                    renderItem={(item: any) => {
                      const bookUrl = item.url || item.sourceUrl || item.id;
                      const isImporting = onlineImportLoadingUrl === bookUrl;
                      const selectedGenre = onlineGenreMap[bookUrl] || '体制官场';
                      const selectedCount = onlineChapterCountMap[bookUrl] || 3;

                      return (
                        <List.Item
                          actions={[
                            <Space key="action">
                              <Select
                                size="small"
                                style={{ width: 105 }}
                                value={selectedGenre}
                                onChange={(val) =>
                                  setOnlineGenreMap((prev) => ({ ...prev, [bookUrl]: val }))
                                }
                              >
                                <Option value="体制官场">体制官场</Option>
                                <Option value="都市职场">都市职场</Option>
                                <Option value="社会现实">社会现实</Option>
                                <Option value="悬疑刑侦">悬疑刑侦</Option>
                                <Option value="玄幻修真">玄幻修真</Option>
                                <Option value="科幻未来">科幻未来</Option>
                              </Select>
                              <Select
                                size="small"
                                style={{ width: 135 }}
                                value={onlineModeMap[bookUrl] || 'ai_climax'}
                                onChange={(val) =>
                                  setOnlineModeMap((prev) => ({ ...prev, [bookUrl]: val }))
                                }
                              >
                                <Option value="ai_climax">🤖 AI甄选戏眼</Option>
                                <Option value="true_opening">📖 黄金正文开篇</Option>
                              </Select>
                              <Select
                                size="small"
                                style={{ width: 90 }}
                                value={selectedCount}
                                onChange={(val) =>
                                  setOnlineChapterCountMap((prev) => ({ ...prev, [bookUrl]: val }))
                                }
                              >
                                <Option value={1}>采编 1 章</Option>
                                <Option value={3}>采编 3 章</Option>
                                <Option value={5}>采编 5 章</Option>
                              </Select>
                              <Button
                                size="small"
                                icon={<UnorderedListOutlined />}
                                onClick={() => handleOpenPicker(item)}
                              >
                                挑选目录
                              </Button>
                              <Button
                                type="primary"
                                size="small"
                                icon={<CloudDownloadOutlined />}
                                loading={isImporting}
                                onClick={() => handleImportOnlineBook(item)}
                                style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                              >
                                导入语料库
                              </Button>
                            </Space>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              item.cover ? (
                                <img
                                  src={item.cover}
                                  alt="cover"
                                  style={{ width: 44, height: 58, objectFit: 'cover', borderRadius: 4 }}
                                />
                              ) : (
                                <Avatar shape="square" size={48} style={{ backgroundColor: '#059669' }}>
                                  {item.title ? item.title.slice(0, 2) : '书'}
                                </Avatar>
                              )
                            }
                            title={
                              <Space>
                                <Text strong style={{ fontSize: 14 }}>{item.title}</Text>
                                {item.author && <Tag color="default">{item.author}</Tag>}
                              </Space>
                            }
                            description={
                              <Space direction="vertical" size={2}>
                                {item.lastReadChapter && (
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    读至: {item.lastReadChapter}
                                  </Text>
                                )}
                              </Space>
                            }
                          />
                        </List.Item>
                      );
                    }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Modal>

      {/* 章节目录挑选与 AI 戏眼推荐 Drawer */}
      <Drawer
        title={
          <Space>
            <UnorderedListOutlined style={{ color: '#7c3aed' }} />
            <span>《{pickerBook?.title || '作品'}》章节目录挑选与 AI 戏眼甄选</span>
            {pickerChapters.length > 0 && <Tag color="purple">共 {pickerChapters.length} 正文章节</Tag>}
          </Space>
        }
        width={720}
        open={isPickerDrawerOpen}
        onClose={() => setIsPickerDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setIsPickerDrawerOpen(false)}>取消</Button>
            <Button
              type="primary"
              loading={pickerImportLoading}
              disabled={selectedChapterUrls.length === 0}
              onClick={handleConfirmPickerImport}
              style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
            >
              确认采编所选 ({selectedChapterUrls.length}) 章入库
            </Button>
          </Space>
        }
      >
        <Spin spinning={pickerLoading}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Alert
              message="AI 章节甄选与自由切片工具"
              description="可直接点击下方【🤖 AI 甄选戏眼】，系统将自动通读并理解全部章节标题语义，挑选最具冲突博弈与叙事深度的戏眼章；也可手动勾选任意章节切片入库。"
              type="info"
              showIcon
            />

            <Space wrap>
              <Button
                type="primary"
                icon={<RobotOutlined />}
                loading={aiPickingLoading}
                onClick={() => handleAiPickInDrawer(3)}
                style={{ backgroundColor: '#7c3aed', borderColor: '#7c3aed' }}
              >
                🤖 AI 甄选 3 个高潮戏眼章
              </Button>
              <Button
                icon={<RobotOutlined />}
                loading={aiPickingLoading}
                onClick={() => handleAiPickInDrawer(5)}
              >
                AI 甄选 5 个戏眼章
              </Button>
              <Button onClick={() => handleSelectOpeningInDrawer(3)}>
                📖 勾选开篇前 3 章
              </Button>
              <Button onClick={() => handleSelectOpeningInDrawer(5)}>
                开篇前 5 章
              </Button>
              <Button onClick={() => setSelectedChapterUrls([])}>
                清空选择
              </Button>
            </Space>

            {aiSelectionRationale && (
              <Alert
                message="🧠 AI 责编推荐点评"
                description={aiSelectionRationale}
                type="success"
                showIcon
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Input.Search
                placeholder="在目录中搜索章节关键词，如：常委、交锋、查封..."
                style={{ width: 280 }}
                value={chapterSearchKw}
                onChange={e => setChapterSearchKw(e.target.value)}
                allowClear
              />
              <Text type="secondary">
                已选中 <Text strong style={{ color: '#0284c7' }}>{selectedChapterUrls.length}</Text> 章（建议 3~5 章以保证蒸馏速度与精度）
              </Text>
            </div>

            <div style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
              <List
                size="small"
                dataSource={pickerChapters.filter(c => !chapterSearchKw || c.title.toLowerCase().includes(chapterSearchKw.toLowerCase()))}
                renderItem={(chap) => {
                  const isChecked = selectedChapterUrls.includes(chap.sourceUrl);
                  const isAiPick = aiClimaxUrls.includes(chap.sourceUrl);
                  return (
                    <List.Item
                      key={chap.sourceUrl}
                      style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        backgroundColor: isChecked ? '#f0f9ff' : 'transparent',
                        borderRadius: 4,
                        marginBottom: 4,
                      }}
                      onClick={() => handleToggleSelectChapter(chap.sourceUrl)}
                    >
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          <Checkbox checked={isChecked} />
                          <Text strong={isChecked}>{chap.title}</Text>
                        </Space>
                        <Space>
                          {isAiPick && (
                            <Tag color="purple" icon={<StarOutlined />}>
                              🌟 AI推荐戏眼
                            </Tag>
                          )}
                          <Text type="secondary" style={{ fontSize: 12 }}>第 {chap.chapterNumber} 节</Text>
                        </Space>
                      </Space>
                    </List.Item>
                  );
                }}
              />
            </div>
          </div>
        </Spin>
      </Drawer>
    </div>
  );
};
