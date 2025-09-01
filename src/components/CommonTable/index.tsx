import React from 'react';
import { Table, Space, Button, Tooltip } from 'antd';
import { CommonTableProps, ActionConfig } from './types';
import './index.scss';

const { Column } = Table;

const CommonTable: React.FC<CommonTableProps> = ({
  data,
  total,
  config,
  onChange
}) => {
  const {
    columns,
    actions,
    pagination = {},
    scroll,
    rowKey = 'id',
    loading = false
  } = config;

  // 默认分页配置
  const defaultPagination = {
    pageSize: 10,
    total: total,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) => 
      `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
    ...pagination
  };

  // 渲染操作列
  const renderActions = (_: any, record: any) => (
    <Space size="small">
      {actions?.map((action: ActionConfig) => {
        // 检查按钮是否可见
        const isVisible = action.visible ? action.visible(record) : true;
        if (!isVisible) return null;

        // 检查按钮是否禁用
        const isDisabled = action.disabled ? action.disabled(record) : false;

        return (
          <Tooltip key={action.key} title={action.title}>
            <Button
              type={action.type || 'text'}
              icon={action.icon}
              size="small"
              danger={action.danger}
              disabled={isDisabled}
              onClick={() => action.onClick(record)}
            />
          </Tooltip>
        );
      })}
    </Space>
  );

  // 渲染列
  const renderColumn = (column: any) => {
    const {
      key,
      title,
      dataIndex,
      width,
      fixed,
      sorter,
      ellipsis,
      render,
      tooltip
    } = column;

    // 默认渲染函数（支持 tooltip）
    const defaultRender = tooltip ? (value: any) => {
      if (tooltip === true) {
        return (
          <Tooltip placement="topLeft" title={value}>
            {value}
          </Tooltip>
        );
      } else if (typeof tooltip === 'object') {
        return (
          <Tooltip {...tooltip} title={value}>
            {value}
          </Tooltip>
        );
      }
      return value;
    } : undefined;

    return (
      <Column
        key={key}
        title={title}
        dataIndex={dataIndex}
        width={width}
        fixed={fixed}
        sorter={sorter}
        ellipsis={ellipsis ? { showTitle: false } : false}
        render={render || defaultRender}
      />
    );
  };

  return (
    <div className="common-table">
      <Table
        dataSource={data}
        pagination={defaultPagination}
        onChange={onChange}
        rowKey={rowKey}
        scroll={scroll}
        loading={loading}
      >
        {/* 渲染数据列 */}
        {columns.map(renderColumn)}
        
        {/* 渲染操作列 */}
        {actions && actions.length > 0 && (
          <Column
            title="操作"
            key="action"
            width={120}
            fixed="right"
            render={renderActions}
          />
        )}
      </Table>
    </div>
  );
};

export default CommonTable;
