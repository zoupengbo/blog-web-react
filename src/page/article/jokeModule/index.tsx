import React, { useEffect, useState } from "react";
import { Space, Table, Button, message, TablePaginationConfig, Input } from "antd";

import httpService from "../../../common/request";
import "./index.scss";

const { Column } = Table;

interface DataType {
  id: React.Key;
  title: string;
}

const JokeModule: React.FC = () => {
  const [data, setData] = useState<DataType[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>("");

  const getJokeList = (page: number = 0, pageSize: number = 10) => {
    httpService("/jokeList", {
      params: {
        offset: page,
        limit: pageSize,
      },
    }).then((res) => {
      setTotal(res.data.count as number);
      setData(res.data.data);
    });
  };

  const handleDelete = (data: DataType) => {
    httpService
      .post("/deleteJoke", {
        id: data.id,
      })
      .then((res) => {
        if (res.code === 200) {
          getJokeList();
          message.success(res.msg);
        }
      });
  };

  // pageChange
  const pageChange = (pagination: TablePaginationConfig) => {
    const { current = 1, pageSize = 10 } = pagination;
    const offset = (current - 1) * pageSize;
    getJokeList(offset, pageSize);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleButtonClick = () => {
    // 按钮点击的逻辑，请求reptile接口，参数len
    console.log("Input Value:", inputValue);
    httpService("/reptile", {
      params: {
        len: inputValue,
      },
    }).then((res) => {
      if (res.code === 200) {
        getJokeList();
        message.success(res.msg);
      }
    })
  };

  useEffect(() => {
    // 在组件挂载后执行的逻辑
    getJokeList();
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
        pagination={{ pageSize: 10, total: total }}
        onChange={pageChange}
      >
        <Column width={300} title="id" dataIndex="id" key="id" />
        <Column width={700} title="标题" dataIndex="title" key="title" />
        <Column
          title="操作"
          key="action"
          render={(_: any, record: DataType) => (
            <Space size="middle">
              <a onClick={() => handleDelete(record)}>删除</a>
            </Space>
          )}
        />
      </Table>
    </>
  );
};

export { JokeModule };
