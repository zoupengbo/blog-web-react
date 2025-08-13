import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import "./index.scss";
import httpService from "../../common/request";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  // 如果已经登录，直接跳转到主页
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 验证表单
  const validateForm = () => {
    let isValid = true;

    // 清除之前的错误信息
    setUsernameError("");
    setPasswordError("");
    setMessage("");
    setMessageType('');

    // 验证用户名
    if (!username.trim()) {
      setUsernameError("用户名不能为空");
      isValid = false;
    }

    // 验证密码
    if (!password.trim()) {
      setPasswordError("密码不能为空");
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    // 先进行表单验证
    if (!validateForm()) {
      return;
    }

    // 防止重复提交
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setMessage("");
    setMessageType('');

    try {
      // 发送登录请求
      const response = await httpService("/login", {
        method: "post",
        data: {
          name: username,
          password,
        },
      });

      console.log("🚀 ~ handleLogin ~ response:", response);

      // 根据httpService的响应结构处理
      if (response && response.code === 200) {
        // 登录成功
        setMessage("登录成功");
        setMessageType('success');

        // 存储token和用户信息
        if (response.token) {
          localStorage.setItem("token", response.token);
          // 不需要手动更新headers，请求拦截器会自动处理
        }

        if (response.data) {
          localStorage.setItem("userInfo", JSON.stringify(response.data));
        }

        // 设置认证状态
        login();

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 1000);

      } else {
        // 登录失败，显示服务器返回的错误信息
        const errorMessage = response?.msg || "登录失败，请检查用户名和密码";
        setMessage(errorMessage);
        setMessageType('error');
      }
    } catch (error: any) {
      console.error("登录请求失败:", error);

      // 使用统一错误处理返回的错误信息
      const errorMessage = error.message || error.response?.data?.msg || "登录失败，请重试";
      setMessage(errorMessage);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理输入框变化，清除对应的错误信息
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (usernameError) {
      setUsernameError("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) {
      setPasswordError("");
    }
  };

  return (
    <div className="login-container">
      {/* 装饰元素 */}
      <div className="decoration-1"></div>
      <div className="decoration-2"></div>
      <div className="decoration-3"></div>
      <div className="decoration-4"></div>

      <div className="login-box">
        <div className="system-title">
          <h1>个人博客后台管理系统</h1>
          <p className="subtitle">Personal Blog Management System</p>
        </div>
        <h2>用户登录</h2>
        <div className="input-group">
          <label>用户名:</label>
          <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="请输入用户名"
            className={usernameError ? 'error' : ''}
          />
          {usernameError && <span className="error-message">{usernameError}</span>}
        </div>
        <div className="input-group">
          <label>密码:</label>
          <input
            type="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="请输入密码"
            className={passwordError ? 'error' : ''}
          />
          {passwordError && <span className="error-message">{passwordError}</span>}
        </div>
        <button
          className={`login-button ${isLoading ? 'loading' : ''}`}
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? "登录中..." : "登录"}
        </button>
        {message && <p className={`message ${messageType}`}>{message}</p>}
      </div>
    </div>
  );
};

export default LoginPage;
