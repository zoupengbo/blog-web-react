import React from "react";
import { Route, Routes } from "react-router-dom";
import { ArticleEdit } from "../page/article/articleEdit/index.tsx";
import { JokeModule } from "../page/article/jokeModule/index.tsx";
import { AccessManager } from "../page/count/accessManager/index.tsx";
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
      element: <JokeModule />,
      title: "笑话管理"
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
