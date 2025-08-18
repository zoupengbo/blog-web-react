import React, { useEffect, useState } from "react";
import { Space, Table, Button, message, TablePaginationConfig, Input, Tag, Rate, Tooltip } from "antd";
import { DownloadOutlined, EyeOutlined, DeleteOutlined } from "@ant-design/icons";

import httpService from "../../../common/request";
import "./index.scss";

const { Column } = Table;

interface DataType {
  id: React.Key;
  title: string;
  author: string;
  description: string;
  category: string;
  coverImage: string;
  downloadUrl: string;
  format: string;
  fileSize: string;
  publishYear: number | null;
  language: string;
  rating: string;
  downloadCount: number;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

const EbookModule: React.FC = () => {
  const [data, setData] = useState<DataType[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>("");

  const getEbookList = (page: number = 0, pageSize: number = 10) => {
    httpService("/ebookList", {
      params: {
        offset: page,
        limit: pageSize,
      },
    }).then((res) => {
      setTotal(res.count as number);
      setData(res.data);
    });
  };

  const handleDelete = (data: DataType) => {
    httpService
      .post("/deleteEbook", {
        id: data.id,
      })
      .then((res) => {
        if (res.code === 200) {
          getEbookList();
          message.success(res.msg);
        }
      });
  };

  // pageChange
  const pageChange = (pagination: TablePaginationConfig) => {
    const { current = 1, pageSize = 10 } = pagination;
    const offset = (current - 1) * pageSize;
    getEbookList(offset, pageSize);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleButtonClick = () => {
    // 按钮点击的逻辑，请求reptile接口，参数len
    console.log("Input Value:", inputValue);
    httpService("/reptileEbook", {
      params: {
        len: inputValue,
      },
    }).then((res) => {
      if (res.code === 200) {
        getEbookList();
        message.success(res.msg);
      }
    });
  };

  useEffect(() => {
    // 在组件挂载后执行的逻辑
    getEbookList();
  }, []); // 空数组表示仅在组件挂载时执行一次

  return (
    <>
      <div className="btn-container">
        <Input
          placeholder="输入内容"
          value={inputValue}
          onChange={handleInputChange}
          style={{ width: 200, marginRight: 16 }}
        />
        <Button type="primary" onClick={handleButtonClick}>
          开始爬虫
        </Button>
      </div>
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
        scroll={{ x: 1200 }}
      >
        <Column
          width={80}
          title="ID"
          dataIndex="id"
          key="id"
          sorter={(a: DataType, b: DataType) => Number(a.id) - Number(b.id)}
        />
        <Column
          width={200}
          title="书名"
          dataIndex="title"
          key="title"
          ellipsis={{ showTitle: false }}
          render={(title: string) => (
            <Tooltip placement="topLeft" title={title}>
              <span style={{ fontWeight: 500, color: '#1890ff' }}>{title}</span>
            </Tooltip>
          )}
        />
        <Column
          width={120}
          title="作者"
          dataIndex="author"
          key="author"
          ellipsis={{ showTitle: false }}
          render={(author: string) => (
            <Tooltip placement="topLeft" title={author}>
              {author}
            </Tooltip>
          )}
        />
        <Column
          width={80}
          title="分类"
          dataIndex="category"
          key="category"
          render={(category: string) => (
            <Tag color={category === '技术' ? 'blue' : category === '文学' ? 'green' : 'orange'}>
              {category}
            </Tag>
          )}
        />
        <Column
          width={80}
          title="格式"
          dataIndex="format"
          key="format"
          render={(format: string) => (
            <Tag color={format === 'PDF' ? 'red' : format === 'EPUB' ? 'purple' : 'default'}>
              {format}
            </Tag>
          )}
        />
        <Column
          width={80}
          title="大小"
          dataIndex="fileSize"
          key="fileSize"
          render={(size: string) => `${size}MB`}
          sorter={(a: DataType, b: DataType) => parseFloat(a.fileSize) - parseFloat(b.fileSize)}
        />
        <Column
          width={80}
          title="语言"
          dataIndex="language"
          key="language"
          render={(language: string) => (
            <Tag color={language === '中文' ? 'gold' : 'cyan'}>
              {language}
            </Tag>
          )}
        />
        <Column
          width={100}
          title="评分"
          dataIndex="rating"
          key="rating"
          render={(rating: string) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Rate disabled defaultValue={parseFloat(rating)} allowHalf />
              <span style={{ fontSize: 12, color: '#666' }}>({rating})</span>
            </div>
          )}
          sorter={(a: DataType, b: DataType) => parseFloat(a.rating) - parseFloat(b.rating)}
        />
        <Column
          width={100}
          title="下载量"
          dataIndex="downloadCount"
          key="downloadCount"
          render={(count: number) => (
            <span style={{ color: count > 0 ? '#52c41a' : '#999' }}>
              {count}
            </span>
          )}
          sorter={(a: DataType, b: DataType) => a.downloadCount - b.downloadCount}
        />
        <Column
          width={120}
          title="标签"
          dataIndex="tags"
          key="tags"
          render={(tags: string[]) => (
            <div>
              {tags.slice(0, 2).map((tag, index) => (
                <Tag key={index} style={{ marginBottom: 2, fontSize: '12px' }}>
                  {tag}
                </Tag>
              ))}
              {tags.length > 2 && (
                <Tooltip title={tags.slice(2).join(', ')}>
                  <Tag style={{ marginBottom: 2, fontSize: '12px' }}>
                    +{tags.length - 2}
                  </Tag>
                </Tooltip>
              )}
            </div>
          )}
        />
        <Column
          title="操作"
          key="action"
          width={120}
          fixed="right"
          render={(_: any, record: DataType) => (
            <Space size="small">
              {record.downloadUrl && (
                <Tooltip title="下载">
                  <Button
                    type="text"
                    icon={<DownloadOutlined />}
                    size="small"
                    onClick={() => window.open(record.downloadUrl, '_blank')}
                  />
                </Tooltip>
              )}
              <Tooltip title="查看详情">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => console.log('查看详情', record)}
                />
              </Tooltip>
              <Tooltip title="删除">
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  size="small"
                  danger
                  onClick={() => handleDelete(record)}
                />
              </Tooltip>
            </Space>
          )}
        />
      </Table>
    </>
  );
};

export { EbookModule };
