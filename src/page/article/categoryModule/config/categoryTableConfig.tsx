import { Button, Space, Tag, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

export interface CategoryDataType {
  id: number;
  name: string;
  description?: string;
  articleCount: number;
  sort: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const createCategoryTableConfig = (
  onEdit: (record: CategoryDataType) => void,
  onDelete: (record: CategoryDataType) => void
): ColumnsType<CategoryDataType> => {
  return [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      align: 'center',
    },
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '文章数量',
      dataIndex: 'articleCount',
      key: 'articleCount',
      width: 100,
      align: 'center',
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (status: string) => {
        const statusMap: { [key: string]: { color: string; text: string } } = {
          'active': { color: 'green', text: '启用' },
          'inactive': { color: 'red', text: '禁用' },
        };
        const statusInfo = statusMap[status] || { color: 'gray', text: status };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      align: 'center',
      fixed: 'right',
      render: (_: any, record: CategoryDataType) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个分类吗？"
            description={record.articleCount > 0 ? "该分类下还有文章，无法删除" : "删除后无法恢复"}
            onConfirm={() => onDelete(record)}
            okText="确定"
            cancelText="取消"
            disabled={record.articleCount > 0}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record.articleCount > 0}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
};

