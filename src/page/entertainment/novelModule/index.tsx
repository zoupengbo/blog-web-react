import React, { useEffect, useState } from "react";
import { 
  Space, 
  Table, 
  Button, 
  message, 
  TablePaginationConfig, 
  Input, 
  Tag, 
  Tooltip, 
  Modal, 
  Form,
  Select,
  Card,
  Progress,
  Popconfirm
} from "antd";
import { 
  SearchOutlined, 
  DownloadOutlined, 
  EyeOutlined, 
  DeleteOutlined,
  BookOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from "@ant-design/icons";

import httpService from "../../../common/request";
import ChapterModal from "./components/ChapterModal";
import "./index.scss";

const { Column } = Table;
const { Search } = Input;
const { Option } = Select;

// 小说数据类型
interface NovelType {
  id: React.Key;
  title: string;
  author: string;
  description: string;
  category: string;
  coverImage: string;
  status: string;
  latestChapter: string;
  latestUpdateTime: string;
  totalChapters: number;
  crawledChapters: number;
  crawlStatus: string;
  sourceUrl: string;
  sourceId: string;
  tags: string[];
  viewCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
}

// 搜索结果类型
interface SearchResult {
  title: string;
  url: string;
  sourceId: string;
}

const NovelModule: React.FC = () => {
  const [data, setData] = useState<NovelType[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchModalVisible, setSearchModalVisible] = useState<boolean>(false);
  const [crawlModalVisible, setCrawlModalVisible] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedNovel, setSelectedNovel] = useState<any>(null);
  const [chapterModalVisible, setChapterModalVisible] = useState<boolean>(false);
  const [selectedNovelForChapter, setSelectedNovelForChapter] = useState<NovelType | null>(null);
  const [form] = Form.useForm();

  // 获取小说列表
  const getNovelList = async (page: number = 0, pageSize: number = 10, filters?: any) => {
    setLoading(true);
    try {
      const params: any = {
        offset: page,
        limit: pageSize,
      };
      
      if (filters?.category) params.category = filters.category;
      if (filters?.status) params.status = filters.status;
      if (filters?.crawlStatus) params.crawlStatus = filters.crawlStatus;

      const res = await httpService("/novel/list", { params });
      setTotal(res.count as number);
      setData(res.data);
    } catch (error) {
      console.error('获取小说列表失败:', error);
      message.error('获取小说列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 搜索小说
  const searchNovel = async (keyword: string) => {
    if (!keyword.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    setLoading(true);
    try {
      const res = await httpService.post("/novel/search", {
        keyword: keyword.trim()
      });
      
      if (res.code === 200) {
        setSearchResults(res.data.searchResults || []);
        setSelectedNovel(res.data.novelDetail);
        setSearchModalVisible(true);
      } else {
        message.error(res.msg || '搜索失败');
      }
    } catch (error) {
      console.error('搜索小说失败:', error);
      message.error('搜索小说失败');
    } finally {
      setLoading(false);
    }
  };

  // 开始爬取小说
  const startCrawl = async (values: any) => {
    setLoading(true);
    try {
      const res = await httpService.post("/novel/crawl", {
        keyword: values.keyword || selectedNovel?.title,
        novelUrl: values.novelUrl || selectedNovel?.sourceUrl,
        maxChapters: values.maxChapters || 100
      });
      
      if (res.code === 200) {
        message.success(res.msg);
        setCrawlModalVisible(false);
        setSearchModalVisible(false);
        form.resetFields();
        getNovelList(); // 刷新列表
      } else {
        message.error(res.msg || '开始爬取失败');
      }
    } catch (error) {
      console.error('开始爬取失败:', error);
      message.error('开始爬取失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除小说
  const deleteNovel = async (novel: NovelType) => {
    try {
      const res = await httpService.post("/novel/delete", {
        id: novel.id
      });
      
      if (res.code === 200) {
        message.success('删除成功');
        getNovelList();
      } else {
        message.error(res.msg || '删除失败');
      }
    } catch (error) {
      console.error('删除小说失败:', error);
      message.error('删除小说失败');
    }
  };

  // 查看章节列表
  const viewChapters = (novel: NovelType) => {
    setSelectedNovelForChapter(novel);
    setChapterModalVisible(true);
  };

  // 分页变化
  const pageChange = (pagination: TablePaginationConfig) => {
    const { current = 1, pageSize = 10 } = pagination;
    const offset = (current - 1) * pageSize;
    getNovelList(offset, pageSize);
  };

  // 获取爬取状态标签
  const getCrawlStatusTag = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      'pending': { color: 'default', text: '待爬取' },
      'crawling': { color: 'processing', text: '爬取中' },
      'completed': { color: 'success', text: '已完成' },
      'failed': { color: 'error', text: '失败' }
    };
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  // 获取小说状态标签
  const getNovelStatusTag = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      '连载中': { color: 'blue', text: '连载中' },
      '已完结': { color: 'green', text: '已完结' },
      '暂停': { color: 'orange', text: '暂停' }
    };
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  useEffect(() => {
    getNovelList();
  }, []);

  return (
    <div className="novel-module">
      {/* 操作区域 */}
      <Card className="operation-card">
        <div className="operation-header">
          <div className="header-left">
            <BookOutlined className="header-icon" />
            <div className="header-text">
              <h2>小说爬虫管理</h2>
              <p>搜索并爬取小说内容，管理小说库</p>
            </div>
          </div>
          <div className="header-actions">
            <Search
              placeholder="输入小说名称搜索"
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              onSearch={searchNovel}
              loading={loading}
              style={{ width: 300, marginRight: 16 }}
            />
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={() => setCrawlModalVisible(true)}
            >
              手动爬取
            </Button>
          </div>
        </div>
      </Card>

      {/* 小说列表 */}
      <Card className="table-card">
        <Table
          dataSource={data}
          loading={loading}
          pagination={{
            pageSize: 10,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          onChange={pageChange}
          rowKey="id"
          scroll={{ x: 1400 }}
        >
          <Column
            width={80}
            title="ID"
            dataIndex="id"
            key="id"
            sorter={(a: NovelType, b: NovelType) => Number(a.id) - Number(b.id)}
          />
          <Column
            width={200}
            title="小说名称"
            dataIndex="title"
            key="title"
            ellipsis={{ showTitle: false }}
            render={(title: string, record: NovelType) => (
              <Tooltip placement="topLeft" title={title}>
                <div className="novel-title">
                  <BookOutlined className="book-icon" />
                  <span>{title}</span>
                </div>
              </Tooltip>
            )}
          />
          <Column
            width={120}
            title="作者"
            dataIndex="author"
            key="author"
            ellipsis={{ showTitle: false }}
            render={(author: string) => (
              <Tooltip placement="topLeft" title={author}>
                {author}
              </Tooltip>
            )}
          />
          <Column
            width={80}
            title="分类"
            dataIndex="category"
            key="category"
            render={(category: string) => (
              <Tag color="purple">{category}</Tag>
            )}
          />
          <Column
            width={100}
            title="状态"
            dataIndex="status"
            key="status"
            render={(status: string) => getNovelStatusTag(status)}
          />
          <Column
            width={100}
            title="爬取状态"
            dataIndex="crawlStatus"
            key="crawlStatus"
            render={(status: string) => getCrawlStatusTag(status)}
          />
          <Column
            width={120}
            title="章节进度"
            key="progress"
            render={(_: any, record: NovelType) => (
              <div>
                <Progress
                  percent={record.totalChapters > 0 ? Math.round((record.crawledChapters / record.totalChapters) * 100) : 0}
                  size="small"
                  status={record.crawlStatus === 'failed' ? 'exception' : 'normal'}
                />
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  {record.crawledChapters}/{record.totalChapters}
                </div>
              </div>
            )}
          />
          <Column
            width={100}
            title="阅读量"
            dataIndex="viewCount"
            key="viewCount"
            render={(count: number) => (
              <span style={{ color: count > 0 ? '#52c41a' : '#999' }}>
                {count.toLocaleString()}
              </span>
            )}
            sorter={(a: NovelType, b: NovelType) => a.viewCount - b.viewCount}
          />
          <Column
            width={120}
            title="标签"
            dataIndex="tags"
            key="tags"
            render={(tags: string[]) => (
              <div>
                {tags.slice(0, 2).map((tag, index) => (
                  <Tag key={index} style={{ marginBottom: 2, fontSize: '11px' }}>
                    {tag}
                  </Tag>
                ))}
                {tags.length > 2 && (
                  <Tooltip title={tags.slice(2).join(', ')}>
                    <Tag style={{ marginBottom: 2, fontSize: '11px' }}>
                      +{tags.length - 2}
                    </Tag>
                  </Tooltip>
                )}
              </div>
            )}
          />
          <Column
            title="操作"
            key="action"
            width={150}
            fixed="right"
            render={(_: any, record: NovelType) => (
              <Space size="small">
                <Tooltip title="查看章节">
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    size="small"
                    onClick={() => viewChapters(record)}
                  />
                </Tooltip>
                {record.sourceUrl && (
                  <Tooltip title="访问原站">
                    <Button
                      type="text"
                      icon={<DownloadOutlined />}
                      size="small"
                      onClick={() => window.open(record.sourceUrl, '_blank')}
                    />
                  </Tooltip>
                )}
                <Tooltip title="删除">
                  <Popconfirm
                    title="确认删除"
                    description="确定要删除这部小说吗？此操作不可恢复。"
                    onConfirm={() => deleteNovel(record)}
                    okText="确认"
                    cancelText="取消"
                  >
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      size="small"
                      danger
                    />
                  </Popconfirm>
                </Tooltip>
              </Space>
            )}
          />
        </Table>
      </Card>

      {/* 搜索结果模态框 */}
      <Modal
        title="搜索结果"
        open={searchModalVisible}
        onCancel={() => setSearchModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setSearchModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="crawl"
            type="primary"
            onClick={() => {
              setSearchModalVisible(false);
              setCrawlModalVisible(true);
            }}
            disabled={!selectedNovel}
          >
            开始爬取
          </Button>
        ]}
        width={800}
      >
        {selectedNovel && (
          <div className="novel-detail">
            <h3>{selectedNovel.title}</h3>
            <p><strong>作者：</strong>{selectedNovel.author}</p>
            <p><strong>分类：</strong>{selectedNovel.category}</p>
            <p><strong>总章节：</strong>{selectedNovel.totalChapters}</p>
            <p><strong>简介：</strong>{selectedNovel.description}</p>
            <p><strong>来源：</strong><a href={selectedNovel.sourceUrl} target="_blank" rel="noopener noreferrer">{selectedNovel.sourceUrl}</a></p>
          </div>
        )}
      </Modal>

      {/* 手动爬取模态框 */}
      <Modal
        title="手动爬取小说"
        open={crawlModalVisible}
        onCancel={() => setCrawlModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={startCrawl}
          initialValues={{
            maxChapters: 100
          }}
        >
          <Form.Item
            label="搜索关键词"
            name="keyword"
            rules={[{ required: true, message: '请输入搜索关键词' }]}
          >
            <Input placeholder="请输入小说名称" />
          </Form.Item>
          
          <Form.Item
            label="或直接输入小说URL"
            name="novelUrl"
          >
            <Input placeholder="https://www.example.com/book/novel/" />
          </Form.Item>

          <Form.Item
            label="最大爬取章节数"
            name="maxChapters"
            rules={[{ required: true, message: '请输入最大爬取章节数' }]}
          >
            <Input type="number" placeholder="100" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button onClick={() => setCrawlModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                开始爬取
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 章节模态框 */}
      <ChapterModal
        open={chapterModalVisible}
        novelId={selectedNovelForChapter?.id as number}
        novelTitle={selectedNovelForChapter?.title || ''}
        onClose={() => {
          setChapterModalVisible(false);
          setSelectedNovelForChapter(null);
        }}
      />
    </div>
  );
};

export { NovelModule };
