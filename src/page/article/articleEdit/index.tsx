import React, { useEffect, useState } from "react";
import { Button, message, TablePaginationConfig, Card, Popconfirm } from "antd";
import { PlusOutlined, FileTextOutlined } from "@ant-design/icons";
import CommonTable from "@components/CommonTable";
import { createArticleTableConfig, ArticleDataType } from "./config/articleTableConfig";
import { getArticleList, deleteArticle } from "@common/articleApi";
import "./index.scss";
import AddArticleModal from "./sections/addArticleModal";
import ArticlePreviewModal from "./components/ArticlePreviewModal";

// 使用从配置文件导入的类型
type DataType = ArticleDataType;

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

  const handleDelete = async (record: DataType) => {
    try {
      const res = await deleteArticle(record.id);
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
  const handleUpdate = (record: DataType) => {
    setEditData(record);
    setOpen(true);
  };

  // 预览文章
  const handlePreview = (record: DataType) => {
    // 直接使用当前数据进行预览
    // 如果没有内容，显示提示信息
    const previewData = {
      ...record,
      content: record.content || '<p>暂无内容，请编辑文章添加内容。</p>',
      summary: record.summary || '暂无摘要',
      tags: record.tags || [],
    };

    setPreviewData(previewData);
    setPreviewOpen(true);
  };

  // 关闭预览
  const handlePreviewClose = () => {
    setPreviewOpen(false);
    setPreviewData(null);
  };
  // 创建表格配置
  const tableConfig = createArticleTableConfig(handleUpdate, handleDelete, handlePreview);

  useEffect(() => {
    // 在组件挂载后执行的逻辑
    fetchArticleList();
  }, []); // 空数组表示仅在组件挂载时执行一次

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
        <CommonTable
          data={data}
          total={total}
          config={tableConfig}
          onChange={pageChange}
        />
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
