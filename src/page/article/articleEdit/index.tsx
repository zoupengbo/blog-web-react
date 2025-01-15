import React, { useEffect, useState } from "react";
import { Space, Table, Button, message, TablePaginationConfig } from "antd";

import httpService from "../../../common/request";
import "./index.scss";
import AddArticleModal from "./sections/addArticleModal";

const { Column } = Table;

interface DataType {
  author: string;
  category: string;
  id: React.Key;
  status: string;
  title: string;
  updatedAt: string;
}

const ArticleEdit: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DataType[]>([]);
  const [editData, setEditData] = useState<any>(null);
  const [total, setTotal] = useState<number>(0);
  const size = "large";
  const getArticleList = (page: number = 0, pageSize: number = 10) => {
    httpService("/articlelist", {
      params: {
        offset: page,
        limit: pageSize,
      },
    }).then((res) => {
      console.log("🚀 ~ getArticleList ~ res:", res)
      
      setTotal(res.count as number);
      setData(res.data);
    });
  };
  const handleDelete = (data: DataType) => {
    httpService
      .post("/deleteArticle", {
        id: data.id,
      })
      .then((res) => {
        if (res.code === 200) {
          getArticleList();
          message.success(res.msg);
        }
      });
  };

  // pageChange
  const pageChange = (pagination: TablePaginationConfig) => {
    const { current = 1, pageSize = 10 } = pagination;
    const offset = (current - 1) * pageSize;
    getArticleList(offset, pageSize);
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
    getArticleList();
  };
  // 编辑文章
  const handleUpdate = (data: DataType) => {
    setEditData(data);
    setOpen(true);
  }
  useEffect(() => {
    // 在组件挂载后执行的逻辑
    getArticleList();
  }, []); // 空数组表示仅在组件挂载时执行一次˝
  return (
    <>
      <div className="btn-container">
        <Button type="primary" size={size} onClick={addArticle}>
          新建
        </Button>
      </div>
      <Table
        dataSource={data}
        pagination={{ pageSize: 10, total: total }}
        onChange={pageChange}
      >
        <Column title="标题" dataIndex="title" key="title" />
        <Column title="作者" dataIndex="author" key="author" />
        <Column title="更新时间" dataIndex="updatedAt" key="updatedAt" />
        <Column
          title="操作"
          key="action"
          render={(_: any, record: DataType) => (
            <Space size="middle">
              <a onClick={() => handleDelete(record)}>删除</a>
              <a onClick={() => handleUpdate(record)}>编辑</a>
            </Space>
          )}
        />
      </Table>
      <AddArticleModal
        key={open.toString()}
        open={open}
        editData={editData}
        onSave={handleSave}
        onCancel={handleCanCel}
      />
    </>
  );
};

export { ArticleEdit };
