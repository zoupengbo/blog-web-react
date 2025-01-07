import React from "react";
import { PageLeft } from "./layout/page-left";
import { BrowserRouter as Router } from "react-router-dom";
import { PageTop } from "./layout/page-top";
import { PageContent } from "./layout/page-content";
// 引入富文本编辑器的样式文件
import "react-quill/dist/quill.bubble.css";
import "quill/dist/quill.snow.css";
import "./App.scss";

const App: React.FC = () => (
  <div className="App">
    <PageTop />
    <div className="App-bottom">
      <Router>
        <PageLeft />
        <PageContent/>
      </Router>
    </div>
  </div>
);

export default App;
