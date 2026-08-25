import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import { PageLeft } from "@layout/page-left";
import { PageTop } from "@layout/page-top";
import { PageContent } from "@layout/page-content";
import LoginPage from "@pages/login";
import { AuthProvider, useAuth } from "@context/authContext.tsx";
import { NavigationProvider } from "@context/NavigationContext";
import { ThemeProvider, useTheme } from "./context/themeContext";
// 引入富文本编辑器的样式文件
import "react-quill/dist/quill.bubble.css";
import "quill/dist/quill.snow.css";
import "./App.scss";

const ThemedApp: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: isDark ? '#d4b106' : '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <div className={`App ${isDark ? 'dark-theme' : 'light-theme'}`}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </div>
    </ConfigProvider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ThemedApp />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

const ProtectedRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>正在加载...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? (
    <NavigationProvider>
      <PageTop />
      <div className="App-bottom">
        <PageLeft />
        <div className="App-content">
          <PageContent />
        </div>
      </div>
    </NavigationProvider>
  ) : (
    <Navigate to="/login" replace />
  );
};

export default App;

