import React, { useEffect, useState } from 'react';
import { Button, message, TablePaginationConfig, Card } from 'antd';
import { PlusOutlined, TagOutlined } from '@ant-design/icons';
import CommonTable from '@components/CommonTable';
import { createTagTableConfig, TagDataType } from './config/tagTableConfig';
import { getTagList, deleteTag } from '@common/tagApi';
import TagModal from './sections/TagModal';
import './index.scss';

const TagModule: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TagDataType[]>([]);
  const [editData, setEditData] = useState<any>(null);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchTagList = async (page: number = 0, pageSize: number = 10) => {
    if (loading) return; // 防止重复请求
    
    try {
      setLoading(true);
      const res = await getTagList(page, pageSize);
      setTotal(res.count as number);
      setData(res.data);
    } catch (error) {
      console.error('获取标签列表失败:', error);
      message.error('获取标签列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: TagDataType) => {
    try {
      const res = await deleteTag(record.id);
      if (res.code === 200) {
        fetchTagList();
        message.success(res.msg);
      } else {
        message.error(res.msg || '删除失败');
      }
    } catch (error) {
      console.error('删除标签失败:', error);
      message.error('删除标签失败');
    }
  };

  const pageChange = (pagination: TablePaginationConfig) => {
    const { current = 1, pageSize = 10 } = pagination;
    const offset = (current - 1) * pageSize;
    fetchTagList(offset, pageSize);
  };

  const addTag = () => {
    setEditData(null);
    setOpen(true);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const handleSave = (msg: string) => {
    message.success(msg);
    fetchTagList();
  };

  const handleUpdate = (record: TagDataType) => {
    setEditData(record);
    setOpen(true);
  };

  const columns = createTagTableConfig(handleUpdate, handleDelete);
  
  const tableConfig = {
    columns: columns,
    rowKey: 'id',
    loading: loading
  };

  useEffect(() => {
    fetchTagList();
  }, []);

  return (
    <div className="tag-management">
      <Card className="tag-header">
        <div className="header-content">
          <div className="header-left">
            <TagOutlined className="header-icon" />
            <div className="header-text">
              <h2>标签管理</h2>
              <p>管理文章标签，创建、编辑和删除标签</p>
            </div>
          </div>
          <div className="header-actions">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={addTag}
              className="create-btn"
            >
              创建标签
            </Button>
          </div>
        </div>
      </Card>

      <Card className="tag-table-card">
        <CommonTable
          data={data}
          total={total}
          config={tableConfig}
          onChange={pageChange}
        />
      </Card>

      <TagModal
        key={open.toString()}
        open={open}
        editData={editData}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
};

export { TagModule };

