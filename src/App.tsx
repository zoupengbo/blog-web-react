import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { PageLeft } from "./layout/page-left";
import { PageTop } from "./layout/page-top";
import { PageContent } from "./layout/page-content";
import LoginPage from "./page/login";
import { AuthProvider, useAuth } from "./context/authContext.tsx";
// 引入富文本编辑器的样式文件
import "react-quill/dist/quill.bubble.css";
import "quill/dist/quill.snow.css";
import "./App.scss";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

const ProtectedRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <>
      <PageTop />
      <div className="App-bottom">
        <PageLeft />
        <div className="App-content">
          <PageContent />
        </div>
      </div>
    </>
  ) : (
    <Navigate to="/login" />
  );
};

export default App;
