import React from 'react';
import { Tag, Tooltip, Progress } from 'antd';
import { EyeOutlined, DeleteOutlined, BookOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { TableConfig } from '@components/CommonTable/types';

// 小说数据类型
export interface NovelDataType {
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

// 格式化时间显示
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 获取状态标签
const getStatusTag = (status: string) => {
  const statusMap: { [key: string]: { color: string; text: string } } = {
    'ongoing': { color: 'blue', text: '连载中' },
    'completed': { color: 'green', text: '已完结' },
    'paused': { color: 'orange', text: '暂停' },
    'dropped': { color: 'red', text: '弃坑' }
  };
  const statusInfo = statusMap[status] || { color: 'default', text: status };
  return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
};

// 获取爬取状态标签
const getCrawlStatusTag = (crawlStatus: string) => {
  const statusMap: { [key: string]: { color: string; text: string } } = {
    'idle': { color: 'default', text: '空闲' },
    'crawling': { color: 'processing', text: '爬取中' },
    'completed': { color: 'success', text: '已完成' },
    'error': { color: 'error', text: '错误' },
    'paused': { color: 'warning', text: '已暂停' }
  };
  const statusInfo = statusMap[crawlStatus] || { color: 'default', text: crawlStatus };
  return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
};

// 小说表格配置
export const createNovelTableConfig = (
  onViewChapters: (record: NovelDataType) => void,
  onStartCrawl: (record: NovelDataType) => void,
  onPauseCrawl: (record: NovelDataType) => void,
  onDelete: (record: NovelDataType) => void
): TableConfig => ({
  columns: [
    {
      key: 'id',
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      sorter: (a: NovelDataType, b: NovelDataType) => Number(a.id) - Number(b.id)
    },
    {
      key: 'title',
      title: '小说标题',
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
      tooltip: true,
      render: (title: string, record: NovelDataType) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500 }}>{title}</span>
        </div>
      )
    },
    {
      key: 'author',
      title: '作者',
      dataIndex: 'author',
      width: 120,
      ellipsis: true,
      tooltip: true
    },
    {
      key: 'category',
      title: '分类',
      dataIndex: 'category',
      width: 100,
      render: (category: string) => (
        <Tag color="purple">{category}</Tag>
      )
    },
    {
      key: 'status',
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status)
    },
    {
      key: 'progress',
      title: '爬取进度',
      dataIndex: 'crawledChapters',
      width: 150,
      render: (crawledChapters: number, record: NovelDataType) => {
        const percent = record.totalChapters > 0 
          ? Math.round((crawledChapters / record.totalChapters) * 100) 
          : 0;
        return (
          <div>
            <Progress 
              percent={percent} 
              size="small" 
              status={record.crawlStatus === 'error' ? 'exception' : 'active'}
            />
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {crawledChapters}/{record.totalChapters}
            </div>
          </div>
        );
      }
    },
    {
      key: 'crawlStatus',
      title: '爬取状态',
      dataIndex: 'crawlStatus',
      width: 100,
      render: (crawlStatus: string) => getCrawlStatusTag(crawlStatus)
    },
    {
      key: 'latestChapter',
      title: '最新章节',
      dataIndex: 'latestChapter',
      width: 150,
      ellipsis: true,
      tooltip: true
    },
    {
      key: 'viewCount',
      title: '阅读量',
      dataIndex: 'viewCount',
      width: 100,
      render: (count: number) => (
        <span style={{ color: count > 0 ? '#52c41a' : '#999' }}>
          {count.toLocaleString()}
        </span>
      ),
      sorter: (a: NovelDataType, b: NovelDataType) => a.viewCount - b.viewCount
    },
    {
      key: 'tags',
      title: '标签',
      dataIndex: 'tags',
      width: 120,
      render: (tags: string[]) => (
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
      )
    },
    {
      key: 'latestUpdateTime',
      title: '最后更新',
      dataIndex: 'latestUpdateTime',
      width: 150,
      render: (date: string) => (
        <Tooltip title={formatDate(date)}>
          <span style={{ fontSize: 12 }}>{formatDate(date)}</span>
        </Tooltip>
      )
    }
  ],
  actions: [
    {
      key: 'viewChapters',
      title: '查看章节',
      icon: <EyeOutlined />,
      onClick: onViewChapters
    },
    {
      key: 'startCrawl',
      title: '开始爬取',
      icon: <PlayCircleOutlined />,
      type: 'primary',
      visible: (record: NovelDataType) => record.crawlStatus !== 'crawling',
      onClick: onStartCrawl
    },
    {
      key: 'pauseCrawl',
      title: '暂停爬取',
      icon: <PauseCircleOutlined />,
      visible: (record: NovelDataType) => record.crawlStatus === 'crawling',
      onClick: onPauseCrawl
    },
    {
      key: 'delete',
      title: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: onDelete
    }
  ],
  pagination: {
    pageSize: 10,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
  },
  scroll: { x: 1200 },
  rowKey: 'id'
});
