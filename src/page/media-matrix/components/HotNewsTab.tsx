import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Radio,
  Tag,
  Space,
  Typography,
  message,
  Modal,
  Form,
  Select,
  Tooltip,
  Switch
} from 'antd';
import {
  SyncOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  FireOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { MediaMatrixApi } from '../services/mediaMatrixApi';
import { HotNewsItem, DraftArticleItem } from '../types';

const { Text, Paragraph } = Typography;

interface HotNewsTabProps {
  onArticleGenerated: (article: DraftArticleItem) => void;
}

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  weibo: { label: '微博热搜', color: '#ff8200' },
  baidu: { label: '百度热搜', color: '#2932e1' },
  zhihu: { label: '知乎热榜', color: '#0084ff' },
  toutiao: { label: '今日头条', color: '#f85959' }
};

export const HotNewsTab: React.FC<HotNewsTabProps> = ({ onArticleGenerated }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [data, setData] = useState<HotNewsItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [currentSource, setCurrentSource] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15 });

  // 生成模态框
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedHotNews, setSelectedHotNews] = useState<HotNewsItem | null>(null);
  const [generateForm] = Form.useForm();

  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(false);
  const [togglingSync, setTogglingSync] = useState<boolean>(false);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(60);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const loadData = async (
    source = currentSource,
    search = searchText,
    page = pagination.current,
    pageSize = pagination.pageSize
  ) => {
    setLoading(true);
    try {
      const res: any = await MediaMatrixApi.getHotNewsList({
        source,
        search,
        limit: pageSize,
        offset: (page - 1) * pageSize
      });
      if (res && res.data) {
        setData(res.data.items || []);
        setTotal(res.data.total || 0);
      }
    } catch (err: any) {
      message.error(err.message || '获取热点失败');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedulerStatus = async () => {
    try {
      const res: any = await MediaMatrixApi.getSchedulerStatus();
      if (res && res.data) {
        setAutoSyncEnabled(!!res.data.enabled);
        setIntervalMinutes(res.data.intervalMinutes || 60);
        setLastSyncTime(res.data.lastSyncTime || null);
      }
    } catch (e) {
      // 忽略初始化错误
    }
  };

  const handleToggleAutoSync = async (checked: boolean) => {
    setTogglingSync(true);
    try {
      const res: any = await MediaMatrixApi.toggleScheduler({
        enabled: checked,
        intervalMinutes
      });
      if (res && res.data) {
        setAutoSyncEnabled(res.data.enabled);
        message.success(res.msg || (checked ? '全网热搜定时同步已开启' : '全网热搜定时同步已关闭'));
      }
    } catch (err: any) {
      message.error(err.message || '切换自动同步失败');
    } finally {
      setTogglingSync(false);
    }
  };

  useEffect(() => {
    loadData();
    loadSchedulerStatus();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res: any = await MediaMatrixApi.refreshHotNews(currentSource === 'all' ? '' : currentSource);
      message.success(res?.msg || '热搜抓取已刷新');
      loadData(currentSource, searchText, 1, pagination.pageSize);
    } catch (err: any) {
      message.error(err.message || '刷新失败');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSourceChange = (e: any) => {
    const val = e.target.value;
    setCurrentSource(val);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadData(val, searchText, 1, pagination.pageSize);
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    loadData(currentSource, searchText, 1, pagination.pageSize);
  };

  const openGenerateModal = (item: HotNewsItem) => {
    setSelectedHotNews(item);
    generateForm.setFieldsValue({
      topic: item.title,
      digest: item.digest,
      stylePreset: 'viral',
      targetLength: 'long',
      customPrompt: ''
    });
    setModalVisible(true);
  };

  const handleDoGenerate = async () => {
    try {
      const values = await generateForm.validateFields();
      setGenerating(true);
      const res: any = await MediaMatrixApi.generateArticle({
        hotNewsId: selectedHotNews ? selectedHotNews.id : undefined,
        topic: values.topic,
        digest: values.digest,
        stylePreset: values.stylePreset,
        targetLength: values.targetLength,
        customPrompt: values.customPrompt
      });

      if (res && res.data) {
        message.success('AI 深度文章已生成！');
        setModalVisible(false);
        onArticleGenerated(res.data);
      }
    } catch (err: any) {
      message.error(err.message || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const columns = [
    {
      title: '排名/热度',
      dataIndex: 'hotIndex',
      key: 'hotIndex',
      width: 120,
      render: (text: string) => (
        <Tag color="volcano" icon={<FireOutlined />} style={{ fontWeight: 600 }}>
          {text || '火热'}
        </Tag>
      )
    },
    {
      title: '来源平台',
      dataIndex: 'source',
      key: 'source',
      width: 110,
      render: (src: string) => {
        const conf = SOURCE_CONFIG[src] || { label: src, color: 'blue' };
        return <Tag color={conf.color}>{conf.label}</Tag>;
      }
    },
    {
      title: '热点话题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: HotNewsItem) => (
        <div>
          <Space>
            <Text strong style={{ fontSize: 15 }}>{title}</Text>
            {record.url && (
              <Tooltip title="查看话题原始网页">
                <a href={record.url} target="_blank" rel="noopener noreferrer">
                  <LinkOutlined style={{ color: '#1890ff' }} />
                </a>
              </Tooltip>
            )}
          </Space>
          {record.digest && (
            <Paragraph
              ellipsis={{ rows: 2 }}
              style={{ color: '#666', fontSize: 13, marginBottom: 0, marginTop: 4 }}
            >
              {record.digest}
            </Paragraph>
          )}
        </div>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (cat: string) => <Tag>{cat || '综合'}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, record: HotNewsItem) => (
        <Button
          type="primary"
          size="middle"
          icon={<ThunderboltOutlined />}
          onClick={() => openGenerateModal(record)}
          style={{ background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)', border: 'none' }}
        >
          AI 深度写稿
        </Button>
      )
    }
  ];

  return (
    <div>
      <Card
        style={{ marginBottom: 16, borderRadius: 8 }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Space wrap size="middle">
            <Radio.Group
              value={currentSource}
              onChange={handleSourceChange}
              buttonStyle="solid"
            >
              <Radio.Button value="all">全部热搜</Radio.Button>
              <Radio.Button value="weibo">微博热搜</Radio.Button>
              <Radio.Button value="baidu">百度热搜</Radio.Button>
              <Radio.Button value="zhihu">知乎热榜</Radio.Button>
              <Radio.Button value="toutiao">今日头条</Radio.Button>
            </Radio.Group>

            <Input
              placeholder="搜索热点关键词..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 220 }}
              allowClear
            />
            <Button onClick={handleSearch}>搜索</Button>
          </Space>

          <Space size={16} wrap>
            <Tooltip
              title={
                autoSyncEnabled
                  ? `已开启后台自动同步（每 ${intervalMinutes} 分钟），${lastSyncTime ? `上次同步: ${lastSyncTime}` : '尚未执行首次同步'}`
                  : '开启后后台按固定周期自动抓取全网热搜；关闭后仅在手动点击「立即拉取」时同步，避免频繁后台抓取和刷屏日志。'
              }
            >
              <Space align="center" style={{ padding: '4px 8px', background: '#fafafa', borderRadius: 6, border: '1px solid #f0f0f0' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>定时自动同步：</Text>
                <Switch
                  checked={autoSyncEnabled}
                  loading={togglingSync}
                  onChange={handleToggleAutoSync}
                  checkedChildren="开"
                  unCheckedChildren="关"
                />
              </Space>
            </Tooltip>

            <Button
              type="primary"
              ghost
              icon={<SyncOutlined spin={refreshing} />}
              loading={refreshing}
              onClick={handleRefresh}
            >
              立即拉取最新全网热搜
            </Button>
          </Space>
        </div>
      </Card>

      <Card style={{ borderRadius: 8 }}>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '30', '50'],
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize });
              loadData(currentSource, searchText, page, pageSize);
            }
          }}
        />
      </Card>

      {/* AI 写稿参数配置弹窗 */}
      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#722ed1' }} />
            <span>AI 深度内容创作引擎</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={generating}
            onClick={handleDoGenerate}
            style={{ background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)', border: 'none' }}
          >
            立即创作并进入编辑器
          </Button>
        ]}
        width={650}
      >
        <Form form={generateForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="topic"
            label="热点核心选题"
            rules={[{ required: true, message: '请输入热点主题' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="digest" label="背景信息 / 核心脉络">
            <Input.TextArea rows={3} placeholder="提供热点背景信息，有助于AI更精准深入分析" />
          </Form.Item>

          <Form.Item
            name="stylePreset"
            label="文章调性与风格模版"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="viral">自媒体爆款（吸睛悬念、情绪共鸣、爆文结构）</Select.Option>
              <Select.Option value="depth">深度商业与专栏（事实剖析、行业脉络、客观理性）</Select.Option>
              <Select.Option value="tech">前沿科技探索（技术解读、落地应用、未来趋势）</Select.Option>
              <Select.Option value="casual">轻快漫话随笔（亲切幽默、金句频出、通俗易懂）</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="targetLength"
            label="文章目标篇幅与深度"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="long">🌟 深度长文巨制 (1800~2500字以上，含5大深度章节/多方交锋/底层逻辑/金句)</Select.Option>
              <Select.Option value="medium">📄 标准深度图文 (1200~1500字，结构完整、重点突出)</Select.Option>
              <Select.Option value="short">⚡ 精炼快报 (800~1000字，快讯概要、适合快速阅读)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="customPrompt" label="自定义创作提示 (可选)">
            <Input.TextArea rows={2} placeholder="如：重点关注年轻消费群体的看法、引用相关行业报告数据等..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
