import React, { useEffect, useState } from "react";
import { Space, Table, Button, message, TablePaginationConfig, Card, Tag, Tooltip, Popconfirm } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined } from "@ant-design/icons";

import { getArticleList, deleteArticle } from "../../../common/articleApi";
import "./index.scss";
import AddArticleModal from "./sections/addArticleModal";
import ArticlePreviewModal from "./components/ArticlePreviewModal";

const { Column } = Table;

interface DataType {
  author: string;
  category: string;
  id: React.Key;
  status: string;
  title: string;
  updatedAt: string;
  content?: string;
  summary?: string;
  tags?: string[];
  createdAt?: string;
}

const ArticleEdit: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DataType[]>([]);
  const [editData, setEditData] = useState<any>(null);
  const [total, setTotal] = useState<number>(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const fetchArticleList = async (page: number = 0, pageSize: number = 10) => {
    try {
      const res = await getArticleList(page, pageSize);
      setTotal(res.count as number);
      setData(res.data);
    } catch (error) {
      console.error('获取文章列表失败:', error);
    }
  };

  const handleDelete = async (data: DataType) => {
    try {
      const res = await deleteArticle(data.id);
      if (res.code === 200) {
        fetchArticleList();
        message.success(res.msg);
      }
    } catch (error) {
      console.error('删除文章失败:', error);
    }
  };

  // pageChange
  const pageChange = (pagination: TablePaginationConfig) => {
    const { current = 1, pageSize = 10 } = pagination;
    const offset = (current - 1) * pageSize;
    fetchArticleList(offset, pageSize);
  };

  // 显示新建弹窗
  const addArticle = () => {
    setEditData(null); // 清空编辑数据
    setOpen(true);
  };
  // 关闭新建弹窗
  const handleCanCel = () => {
    setOpen(false);
  };
  // 保存新建文章
  const handleSave = (msg: String) => {
    message.success(msg);
    fetchArticleList();
  };
  // 编辑文章
  const handleUpdate = (data: DataType) => {
    setEditData(data);
    setOpen(true);
  };

  // 预览文章
  const handlePreview = (data: DataType) => {
    // 直接使用当前数据进行预览
    // 如果没有内容，显示提示信息
    const previewData = {
      ...data,
      content: data.content || '<p>暂无内容，请编辑文章添加内容。</p>',
      summary: data.summary || '暂无摘要',
      tags: data.tags || [],
    };

    setPreviewData(previewData);
    setPreviewOpen(true);
  };

  // 关闭预览
  const handlePreviewClose = () => {
    setPreviewOpen(false);
    setPreviewData(null);
  };
  useEffect(() => {
    // 在组件挂载后执行的逻辑
    fetchArticleList();
  }, []); // 空数组表示仅在组件挂载时执行一次˝
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

  return (
    <div className="article-management">
      <Card className="article-header">
        <div className="header-content">
          <div className="header-left">
            <FileTextOutlined className="header-icon" />
            <div className="header-text">
              <h2>文章管理</h2>
              <p>管理您的博客文章，创建、编辑和发布内容</p>
            </div>
          </div>
          <div className="header-actions">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={addArticle}
              className="create-btn"
            >
              创建文章
            </Button>
          </div>
        </div>
      </Card>

      <Card className="article-table-card">
        <Table
          dataSource={data}
          pagination={{
            pageSize: 10,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          onChange={pageChange}
          rowKey="id"
          className="article-table"
        >
          <Column
            title="标题"
            dataIndex="title"
            key="title"
            render={(title: string) => (
              <div className="article-title">
                <FileTextOutlined className="title-icon" />
                <span className="title-text">{title}</span>
              </div>
            )}
          />
          <Column
            title="作者"
            dataIndex="author"
            key="author"
            render={(author: string) => (
              <Tag color="blue">{author}</Tag>
            )}
          />
          <Column
            title="分类"
            dataIndex="category"
            key="category"
            render={(category: string) => (
              <Tag color="purple">{category || '未分类'}</Tag>
            )}
          />
          <Column
            title="状态"
            dataIndex="status"
            key="status"
            render={(status: string) => getStatusTag(status)}
          />
          <Column
            title="更新时间"
            dataIndex="updatedAt"
            key="updatedAt"
            render={(date: string) => (
              <Tooltip title={formatDate(date)}>
                <span className="update-time">{formatDate(date)}</span>
              </Tooltip>
            )}
          />
          <Column
            title="操作"
            key="action"
            width={180}
            render={(_: any, record: DataType) => (
              <Space size="small">
                <Tooltip title="预览">
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    size="small"
                    onClick={() => handlePreview(record)}
                    className="action-btn preview-btn"
                  />
                </Tooltip>
                <Tooltip title="编辑">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => handleUpdate(record)}
                    className="action-btn edit-btn"
                  />
                </Tooltip>
                <Tooltip title="删除">
                  <Popconfirm
                    title="确认删除"
                    description="确定要删除这篇文章吗？此操作不可恢复。"
                    onConfirm={() => handleDelete(record)}
                    okText="确认"
                    cancelText="取消"
                  >
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      size="small"
                      danger
                      className="action-btn delete-btn"
                    />
                  </Popconfirm>
                </Tooltip>
              </Space>
            )}
          />
        </Table>
      </Card>

      <AddArticleModal
        key={open.toString()}
        open={open}
        editData={editData}
        onSave={handleSave}
        onCancel={handleCanCel}
      />

      <ArticlePreviewModal
        open={previewOpen}
        articleData={previewData}
        onClose={handlePreviewClose}
      />
    </div>
  );
};

export { ArticleEdit };
