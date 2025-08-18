import React from "react";
import { Route, Routes } from "react-router-dom";
import { ArticleEdit } from "../page/article/articleEdit/index.tsx";
import { EbookModule } from "../page/article/ebookModule/index.tsx";
import { AccessManager } from "../page/count/accessManager/index.tsx";
import { NovelModule } from "../page/entertainment/novelModule/index.tsx";
import "./page-content.scss";

const PageContent: React.FC = () => {
  const routes = [
    {
      path: "/",
      element: <AccessManager />,
      title: "数据概览"
    },
    {
      path: "/2",
      element: <ArticleEdit />,
      title: "文章管理"
    },
    {
      path: "/3",
      element: <EbookModule />,
      title: "电子书管理"
    },
    {
      path: "/4",
      element: <NovelModule />,
      title: "小说爬虫"
    },
    {
      path: "/article-list",
      element: <div>文章列表页面</div>,
      title: "文章列表"
    },
    {
      path: "/analytics",
      element: <div>数据统计页面</div>,
      title: "数据统计"
    }
  ];

  return (
    <div className="page-content">
      <Routes>
        {routes.map((route, index) => (
          <Route key={index} path={route.path} element={route.element}/>
        ))}
      </Routes>
    </div>
  );
};

export { PageContent };
