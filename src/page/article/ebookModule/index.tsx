import React, { useEffect, useState } from "react";
import { Button, message, TablePaginationConfig, Input } from "antd";
import CommonTable from "@components/CommonTable";
import { createEbookTableConfig, EbookDataType } from "./config/ebookTableConfig";
import httpService from "@common/request";
import "./index.scss";

// 使用从配置文件导入的类型
type DataType = EbookDataType;

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

  const handleDelete = (record: DataType) => {
    httpService
      .post("/deleteEbook", {
        id: record.id,
      })
      .then((res) => {
        if (res.code === 200) {
          getEbookList();
          message.success(res.msg);
        }
      });
  };

  const handleView = (record: DataType) => {
    console.log('查看详情', record);
    // 这里可以添加查看详情的逻辑，比如打开模态框等
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

  // 创建表格配置
  const tableConfig = createEbookTableConfig(handleDelete, handleView);

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
      <CommonTable
        data={data}
        total={total}
        config={tableConfig}
        onChange={pageChange}
      />
    </>
  );
};

export { EbookModule };
