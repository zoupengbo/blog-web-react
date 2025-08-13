import React from 'react';
import { Modal, Tag, Divider, Typography } from 'antd';
import { EyeOutlined, CalendarOutlined, UserOutlined, TagOutlined, FolderOutlined } from '@ant-design/icons';
import './ArticlePreviewModal.scss';

const { Title, Paragraph, Text } = Typography;

interface ArticlePreviewData {
  id?: React.Key;
  title: string;
  content: string;
  author: string;
  category?: string;
  status?: string;
  tags?: string[];
  summary?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface ArticlePreviewModalProps {
  open: boolean;
  articleData: ArticlePreviewData | null;
  onClose: () => void;
}

const ArticlePreviewModal: React.FC<ArticlePreviewModalProps> = ({
  open,
  articleData,
  onClose,
}) => {
  if (!articleData) return null;

  // 格式化时间显示
  const formatDate = (dateString?: string) => {
    if (!dateString) return '未知时间';
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取状态标签
  const getStatusTag = (status?: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      'published': { color: 'green', text: '已发布' },
      'draft': { color: 'orange', text: '草稿' },
      'archived': { color: 'gray', text: '已归档' }
    };
    const statusInfo = statusMap[status || 'draft'] || { color: 'blue', text: status || '草稿' };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  return (
    <Modal
      title={
        <div className="preview-modal-title">
          <EyeOutlined className="title-icon" />
          <span>文章预览</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      className="article-preview-modal"
    >
      <div className="preview-content">
        {/* 文章头部信息 */}
        <div className="article-header">
          <Title level={1} className="article-title">
            {articleData.title}
          </Title>
          
          <div className="article-meta">
            <div className="meta-item">
              <UserOutlined className="meta-icon" />
              <Text type="secondary">作者：{articleData.author}</Text>
            </div>
            
            {articleData.category && (
              <div className="meta-item">
                <FolderOutlined className="meta-icon" />
                <Text type="secondary">分类：</Text>
                <Tag color="purple">{articleData.category}</Tag>
              </div>
            )}
            
            <div className="meta-item">
              <CalendarOutlined className="meta-icon" />
              <Text type="secondary">
                更新时间：{formatDate(articleData.updatedAt)}
              </Text>
            </div>
            
            <div className="meta-item">
              <Text type="secondary">状态：</Text>
              {getStatusTag(articleData.status)}
            </div>
          </div>

          {/* 标签 */}
          {articleData.tags && articleData.tags.length > 0 && (
            <div className="article-tags">
              <TagOutlined className="tags-icon" />
              <Text type="secondary">标签：</Text>
              {articleData.tags.map((tag, index) => (
                <Tag key={index} color="blue">
                  {tag}
                </Tag>
              ))}
            </div>
          )}

          {/* 摘要 */}
          {articleData.summary && (
            <div className="article-summary">
              <Text type="secondary" className="summary-label">摘要：</Text>
              <Paragraph className="summary-content">
                {articleData.summary}
              </Paragraph>
            </div>
          )}
        </div>

        <Divider />

        {/* 文章内容 */}
        <div className="article-body">
          <div 
            className="content-html"
            dangerouslySetInnerHTML={{ __html: articleData.content }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ArticlePreviewModal;
