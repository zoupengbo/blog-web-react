import { Button, Space, Tag as AntTag, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

export interface TagDataType {
  id: number;
  name: string;
  color: string;
  description?: string;
  usageCount: number;
  sort: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const createTagTableConfig = (
  onEdit: (record: TagDataType) => void,
  onDelete: (record: TagDataType) => void
): ColumnsType<TagDataType> => {
  return [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      align: 'center',
    },
    {
      title: '标签名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string, record: TagDataType) => (
        <AntTag color={record.color}>{name}</AntTag>
      ),
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      width: 120,
      render: (color: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              backgroundColor: color,
              border: '1px solid #d9d9d9',
            }}
          />
          <span>{color}</span>
        </div>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
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
        return <AntTag color={statusInfo.color}>{statusInfo.text}</AntTag>;
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
      render: (_: any, record: TagDataType) => (
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
            title="确定要删除这个标签吗？"
            description={record.usageCount > 0 ? "该标签还在使用中，无法删除" : "删除后无法恢复"}
            onConfirm={() => onDelete(record)}
            okText="确定"
            cancelText="取消"
            disabled={record.usageCount > 0}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={record.usageCount > 0}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];
};

