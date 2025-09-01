import { ReactNode } from 'react';
import { TablePaginationConfig, TooltipProps } from 'antd';

// 基础数据类型
export interface BaseDataType {
  id: React.Key;
  [key: string]: any;
}

// 列配置类型
export interface ColumnConfig {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
  fixed?: 'left' | 'right';
  sorter?: boolean | ((a: any, b: any) => number);
  ellipsis?: boolean;
  render?: (value: any, record: any, index: number) => ReactNode;
  tooltip?: boolean | TooltipProps;
}

// 操作按钮配置
export interface ActionConfig {
  key: string;
  title: string;
  icon: ReactNode;
  type?: 'primary' | 'default' | 'text' | 'link';
  danger?: boolean;
  disabled?: (record: any) => boolean;
  visible?: (record: any) => boolean;
  onClick: (record: any) => void;
}

// 表格配置
export interface TableConfig {
  columns: ColumnConfig[];
  actions?: ActionConfig[];
  pagination?: {
    pageSize?: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    showTotal?: boolean | ((total: number, range: [number, number]) => string);
  };
  scroll?: {
    x?: number;
    y?: number;
  };
  rowKey?: string;
  loading?: boolean;
}

// 表格组件属性
export interface CommonTableProps {
  data: BaseDataType[];
  total: number;
  config: TableConfig;
  onChange?: (pagination: TablePaginationConfig) => void;
}
