// index.tsx or App.tsx
import React from "react";
import { Route, Routes } from "react-router-dom";
import { ArticleEdit } from "../page/article/articleEdit/index.tsx";

const PageContent: React.FC = () => {
  return (
    <div style={{
      width: "100%",
      height: "100%",
      overflow: "auto"
    }
    }>
      <Routes>
        <Route path="/" element={<ArticleEdit />} />
      </Routes>
    </div>
  );
};

export { PageContent };
