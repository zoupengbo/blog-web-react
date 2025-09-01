import React, { useState, useEffect } from "react";
import { useAuth } from "../context/authContext";
import { UserOutlined, LogoutOutlined, SettingOutlined, BellOutlined } from "@ant-design/icons";
import "./page-top.scss";

const PageTop: React.FC = () => {
  const { logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const userName = JSON.parse(localStorage.getItem("userInfo") || "{}").name || "管理员";

  const handleMouseEnter = () => {
    setShowMenu(true);
  };

  const handleMouseLeave = () => {
    setShowMenu(false);
  };

  // 更新时间的函数
  const updateTime = () => {
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long'
    });
    setCurrentTime(timeString);
  };

  // 设置定时器实时更新时间
  useEffect(() => {
    let isMounted = true;

    // 更新时间的函数（带挂载检查）
    const safeUpdateTime = () => {
      if (isMounted) {
        updateTime();
      }
    };

    // 立即更新一次时间
    safeUpdateTime();

    // 每秒更新一次时间
    const timer = setInterval(safeUpdateTime, 1000);

    // 清理函数
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="page-top">
      <div className="page-top-left">
        <div className="logo-section">
          <div className="logo-icon">📝</div>
          <div className="logo-text">
            <h1>个人博客后台管理系统</h1>
            <span className="subtitle">Personal Blog Management System</span>
          </div>
        </div>
      </div>

      <div className="page-top-center">
        <div className="time-display">
          <span className="current-time">{currentTime}</span>
        </div>
      </div>

      <div className="page-top-right">
        <div className="header-actions">
          <div className="action-item settings">
            <SettingOutlined />
          </div>

          <div
            className="user-info"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="user-avatar">
              <UserOutlined />
            </div>
            <div className="user-details">
              <span className="user-name">{userName}</span>
              <span className="user-role">管理员</span>
            </div>

            <div className={`user-menu ${showMenu ? 'show' : ''}`}>
              <div className="user-menu-item">
                <UserOutlined />
                <span>个人中心</span>
              </div>
              <div className="user-menu-item">
                <SettingOutlined />
                <span>系统设置</span>
              </div>
              <div className="user-menu-divider"></div>
              <div className="user-menu-item logout" onClick={logout}>
                <LogoutOutlined />
                <span>退出登录</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { PageTop };
