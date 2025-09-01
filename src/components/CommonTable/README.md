# CommonTable 通用表格组件

这是一个基于 Ant Design Table 封装的通用表格组件，支持通过配置参数来快速渲染列表。

## 功能特性

- 🎯 **配置驱动**: 通过配置对象定义列和操作按钮
- 🎨 **灵活渲染**: 支持自定义列渲染函数
- 🔧 **内置功能**: 支持排序、分页、工具提示等
- 📱 **响应式**: 支持横向滚动和固定列
- 🎭 **操作按钮**: 灵活的操作按钮配置

## 基本用法

```tsx
import CommonTable from '../components/CommonTable';
import { TableConfig } from '../components/CommonTable/types';

const MyComponent = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);

  const tableConfig: TableConfig = {
    columns: [
      {
        key: 'id',
        title: 'ID',
        dataIndex: 'id',
        width: 80,
        sorter: true
      },
      {
        key: 'name',
        title: '名称',
        dataIndex: 'name',
        width: 200,
        ellipsis: true,
        tooltip: true
      }
    ],
    actions: [
      {
        key: 'edit',
        title: '编辑',
        icon: <EditOutlined />,
        onClick: (record) => console.log('编辑', record)
      },
      {
        key: 'delete',
        title: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: (record) => console.log('删除', record)
      }
    ]
  };

  return (
    <CommonTable
      data={data}
      total={total}
      config={tableConfig}
      onChange={(pagination) => {
        // 处理分页变化
      }}
    />
  );
};
```

## 配置说明

### TableConfig

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| columns | ColumnConfig[] | [] | 列配置数组 |
| actions | ActionConfig[] | [] | 操作按钮配置数组 |
| pagination | object | 默认分页配置 | 分页配置 |
| scroll | object | - | 滚动配置 |
| rowKey | string | 'id' | 行的唯一标识 |
| loading | boolean | false | 加载状态 |

### ColumnConfig

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| key | string | - | 列的唯一标识 |
| title | string | - | 列标题 |
| dataIndex | string | - | 数据字段名 |
| width | number | - | 列宽度 |
| fixed | 'left' \| 'right' | - | 固定列 |
| sorter | boolean \| function | false | 排序配置 |
| ellipsis | boolean | false | 超长省略 |
| tooltip | boolean \| TooltipProps | false | 工具提示 |
| render | function | - | 自定义渲染函数 |

### ActionConfig

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| key | string | - | 按钮的唯一标识 |
| title | string | - | 按钮标题（用于工具提示） |
| icon | ReactNode | - | 按钮图标 |
| type | 'primary' \| 'default' \| 'text' \| 'link' | 'text' | 按钮类型 |
| danger | boolean | false | 危险按钮样式 |
| disabled | function | - | 禁用条件函数 |
| visible | function | - | 显示条件函数 |
| onClick | function | - | 点击事件处理函数 |

## 高级用法

### 自定义列渲染

```tsx
const columns = [
  {
    key: 'status',
    title: '状态',
    dataIndex: 'status',
    render: (status) => (
      <Tag color={status === 'active' ? 'green' : 'red'}>
        {status === 'active' ? '激活' : '禁用'}
      </Tag>
    )
  }
];
```

### 条件显示操作按钮

```tsx
const actions = [
  {
    key: 'edit',
    title: '编辑',
    icon: <EditOutlined />,
    visible: (record) => record.status === 'active',
    onClick: (record) => handleEdit(record)
  },
  {
    key: 'delete',
    title: '删除',
    icon: <DeleteOutlined />,
    danger: true,
    disabled: (record) => record.status === 'protected',
    onClick: (record) => handleDelete(record)
  }
];
```

## 完整示例

参考 `src/components/CommonTable/config/ebookTableConfig.tsx` 文件，这是一个完整的电子书表格配置示例。
