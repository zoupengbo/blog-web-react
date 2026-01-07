import React, { useEffect, useState } from 'react';
import { Button, message, TablePaginationConfig, Card } from 'antd';
import { PlusOutlined, FolderOutlined } from '@ant-design/icons';
import CommonTable from '@components/CommonTable';
import { createCategoryTableConfig, CategoryDataType } from './config/categoryTableConfig';
import { getCategoryList, deleteCategory } from '@common/categoryApi';
import CategoryModal from './sections/CategoryModal';
import './index.scss';

const CategoryModule: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CategoryDataType[]>([]);
  const [editData, setEditData] = useState<any>(null);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchCategoryList = async (page: number = 0, pageSize: number = 10) => {
    if (loading) return; // 防止重复请求
    
    try {
      setLoading(true);
      const res = await getCategoryList(page, pageSize);
      setTotal(res.count as number);
      setData(res.data);
    } catch (error) {
      console.error('获取分类列表失败:', error);
      message.error('获取分类列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: CategoryDataType) => {
    try {
      const res = await deleteCategory(record.id);
      if (res.code === 200) {
        fetchCategoryList();
        message.success(res.msg);
      } else {
        message.error(res.msg || '删除失败');
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      message.error('删除分类失败');
    }
  };

  const pageChange = (pagination: TablePaginationConfig) => {
    const { current = 1, pageSize = 10 } = pagination;
    const offset = (current - 1) * pageSize;
    fetchCategoryList(offset, pageSize);
  };

  const addCategory = () => {
    setEditData(null);
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleSave = (msg: string) => {
    message.success(msg);
    fetchCategoryList();
  };

  const handleUpdate = (record: CategoryDataType) => {
    setEditData(record);
    setOpen(true);
  };

  const columns = createCategoryTableConfig(handleUpdate, handleDelete);
  
  const tableConfig = {
    columns: columns,
    rowKey: 'id',
    loading: loading
  };

  useEffect(() => {
    fetchCategoryList();
  }, []);

  return (
    <div className="category-management">
      <Card className="category-header">
        <div className="header-content">
          <div className="header-left">
            <FolderOutlined className="header-icon" />
            <div className="header-text">
              <h2>分类管理</h2>
              <p>管理文章分类，创建、编辑和删除分类</p>
            </div>
          </div>
          <div className="header-actions">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={addCategory}
              className="create-btn"
            >
              创建分类
            </Button>
          </div>
        </div>
      </Card>

      <Card className="category-table-card">
        <CommonTable
          data={data}
          total={total}
          config={tableConfig}
          onChange={pageChange}
        />
      </Card>

      <CategoryModal
        key={open.toString()}
        open={open}
        editData={editData}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};

export { CategoryModule };

