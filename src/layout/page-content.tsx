// index.tsx or App.tsx
import React from "react";
import { Route, Routes } from "react-router-dom";
import { ArticleEdit } from "../page/article/articleEdit/index.tsx";
import { JokeModule } from "../page/article/jokeModule/index.tsx";
import { AccessManager } from "../page/count/accessManager/index.tsx";

const PageContent: React.FC = () => {
  const isAuthenticated = false;

  const routes = [
    {
      path: "/",
      element: <AccessManager />,
    },
    {
      path: "/2",
      element: <ArticleEdit />,
    },
    {
      path: "/3",
      element: <JokeModule />,
    }
  ];
  return (
    <div style={{
      width: "100%",
      height: "100%",
      overflow: "auto"
    }
    }>
      <Routes>
        {routes.map((route, index) => (
          <Route key={index} path={route.path} element={route.element}/>
        ))}
      </Routes>
    </div>
  );
};

export { PageContent };
