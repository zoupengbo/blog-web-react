import React from 'react';
import { Tag, Rate, Tooltip } from 'antd';
import { DownloadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { TableConfig } from '@components/CommonTable/types';

// 电子书数据类型
export interface EbookDataType {
  id: React.Key;
  title: string;
  author: string;
  description: string;
  category: string;
  coverImage: string;
  downloadUrl: string;
  format: string;
  fileSize: string;
  publishYear: number | null;
  language: string;
  rating: string;
  downloadCount: number;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

// 电子书表格配置
export const createEbookTableConfig = (
  onDelete: (record: EbookDataType) => void,
  onView?: (record: EbookDataType) => void
): TableConfig => ({
  columns: [
    {
      key: 'id',
      title: 'ID',
      dataIndex: 'id',
      width: 80,
      sorter: (a: EbookDataType, b: EbookDataType) => Number(a.id) - Number(b.id)
    },
    {
      key: 'title',
      title: '书名',
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
      tooltip: true,
      render: (title: string) => (
        <span style={{ fontWeight: 500, color: '#1890ff' }}>{title}</span>
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
      width: 80,
      render: (category: string) => (
        <Tag color={category === '技术' ? 'blue' : category === '文学' ? 'green' : 'orange'}>
          {category}
        </Tag>
      )
    },
    {
      key: 'format',
      title: '格式',
      dataIndex: 'format',
      width: 80,
      render: (format: string) => (
        <Tag color={format === 'PDF' ? 'red' : format === 'EPUB' ? 'purple' : 'default'}>
          {format}
        </Tag>
      )
    },
    {
      key: 'fileSize',
      title: '大小',
      dataIndex: 'fileSize',
      width: 80,
      render: (size: string) => `${size}MB`,
      sorter: (a: EbookDataType, b: EbookDataType) => parseFloat(a.fileSize) - parseFloat(b.fileSize)
    },
    {
      key: 'language',
      title: '语言',
      dataIndex: 'language',
      width: 80,
      render: (language: string) => (
        <Tag color={language === '中文' ? 'gold' : 'cyan'}>
          {language}
        </Tag>
      )
    },
    {
      key: 'rating',
      title: '评分',
      dataIndex: 'rating',
      width: 100,
      render: (rating: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Rate disabled defaultValue={parseFloat(rating)} allowHalf />
          <span style={{ fontSize: 12, color: '#666' }}>({rating})</span>
        </div>
      ),
      sorter: (a: EbookDataType, b: EbookDataType) => parseFloat(a.rating) - parseFloat(b.rating)
    },
    {
      key: 'downloadCount',
      title: '下载量',
      dataIndex: 'downloadCount',
      width: 100,
      render: (count: number) => (
        <span style={{ color: count > 0 ? '#52c41a' : '#999' }}>
          {count}
        </span>
      ),
      sorter: (a: EbookDataType, b: EbookDataType) => a.downloadCount - b.downloadCount
    },
    {
      key: 'tags',
      title: '标签',
      dataIndex: 'tags',
      width: 120,
      render: (tags: string[]) => (
        <div>
          {tags.slice(0, 2).map((tag, index) => (
            <Tag key={index} style={{ marginBottom: 2, fontSize: '12px' }}>
              {tag}
            </Tag>
          ))}
          {tags.length > 2 && (
            <Tooltip title={tags.slice(2).join(', ')}>
              <Tag style={{ marginBottom: 2, fontSize: '12px' }}>
                +{tags.length - 2}
              </Tag>
            </Tooltip>
          )}
        </div>
      )
    }
  ],
  actions: [
    {
      key: 'download',
      title: '下载',
      icon: <DownloadOutlined />,
      visible: (record: EbookDataType) => !!record.downloadUrl,
      onClick: (record: EbookDataType) => window.open(record.downloadUrl, '_blank')
    },
    {
      key: 'view',
      title: '查看详情',
      icon: <EyeOutlined />,
      onClick: (record: EbookDataType) => {
        if (onView) {
          onView(record);
        } else {
          console.log('查看详情', record);
        }
      }
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
