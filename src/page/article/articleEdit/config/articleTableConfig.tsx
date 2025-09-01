import React from 'react';
import { Tag, Tooltip, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import { TableConfig } from '@components/CommonTable/types';

// 文章数据类型
export interface ArticleDataType {
  id: React.Key;
  author: string;
  category: string;
  status: string;
  title: string;
  updatedAt: string;
  content?: string;
  summary?: string;
  tags?: string[];
  createdAt?: string;
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
    'published': { color: 'green', text: '已发布' },
    'draft': { color: 'orange', text: '草稿' },
    'archived': { color: 'gray', text: '已归档' }
  };
  const statusInfo = statusMap[status] || { color: 'blue', text: status };
  return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
};

// 文章表格配置
export const createArticleTableConfig = (
  onEdit: (record: ArticleDataType) => void,
  onDelete: (record: ArticleDataType) => void,
  onPreview: (record: ArticleDataType) => void
): TableConfig => ({
  columns: [
    {
      key: 'title',
      title: '标题',
      dataIndex: 'title',
      width: 300,
      ellipsis: true,
      render: (title: string) => (
        <div className="article-title">
          <FileTextOutlined className="title-icon" />
          <span className="title-text">{title}</span>
        </div>
      )
    },
    {
      key: 'author',
      title: '作者',
      dataIndex: 'author',
      width: 120,
      render: (author: string) => (
        <Tag color="blue">{author}</Tag>
      )
    },
    {
      key: 'category',
      title: '分类',
      dataIndex: 'category',
      width: 120,
      render: (category: string) => (
        <Tag color="purple">{category || '未分类'}</Tag>
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
      key: 'updatedAt',
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 180,
      render: (date: string) => (
        <Tooltip title={formatDate(date)}>
          <span className="update-time">{formatDate(date)}</span>
        </Tooltip>
      )
    }
  ],
  actions: [
    {
      key: 'preview',
      title: '预览',
      icon: <EyeOutlined />,
      onClick: onPreview
    },
    {
      key: 'edit',
      title: '编辑',
      icon: <EditOutlined />,
      onClick: onEdit
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
  rowKey: 'id'
});