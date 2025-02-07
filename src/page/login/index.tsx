import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import './index.scss';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      // 模拟登录请求
      if (username === 'admin' && password === 'admin') {
        setMessage('登录成功');
        login(); // 设置认证状态为已登录
        navigate('/'); // 登录成功后跳转到主页
      } else {
        setMessage('登录失败');
      }
    } catch (error) {
      setMessage('请求错误');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>登录页面</h2>
        <div className="input-group">
          <label>用户名:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>密码:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="login-button" onClick={handleLogin}>登录</button>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
};

export default LoginPage;

