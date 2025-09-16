import React from "react";
import { Route, Routes } from "react-router-dom";
import { ArticleEdit } from "@pages/article/articleEdit/index.tsx";
import { EbookModule } from "@pages/article/ebookModule/index.tsx";
import { AccessManager } from "@pages/count/accessManager/index.tsx";
import { NovelModule } from "@pages/entertainment/novelModule/index.tsx";
import EbookReader from "@pages/entertainment/ebookReader/index.tsx";
import "./page-content.scss";

const PageContent: React.FC = () => {
  const routes = [
    {
      path: "/",
      element: <AccessManager />,
      title: "数据概览"
    },
    {
      path: "/article-edit",
      element: <ArticleEdit />,
      title: "文章管理"
    },
    {
      path: "/novel-crawler",
      element: <NovelModule />,
      title: "小说爬虫"
    },
    {
      path: "/ebook-reader",
      element: <EbookReader />,
      title: "电子书阅读"
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
