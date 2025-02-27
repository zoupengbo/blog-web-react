import React, { useState } from "react";
import { useAuth } from "../context/authContext";

const PageTop: React.FC = () => {
  const { logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const userName = JSON.parse(localStorage.getItem("userInfo") || "{}").name;

  const handleMouseEnter = () => {
    setShowMenu(true);
  };

  const handleMouseLeave = () => {
    setShowMenu(false);
  };

  return (
    <>
      <style>
        {`
          .page-top {
            background-color: #7879e7;
            color: white;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
          }
          .text-center {
            padding-left: 20px;
          }
          .user-info {
            position: relative;
            cursor: pointer;
          }
          .user-name {
            font-weight: 800;
            font-size: 19px;
          }
          .user-menu {
            position: absolute;
            top: 100%;
            right: 0;
            background-color: white;
            color: black;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            display: ${showMenu ? "block" : "none"};
          }
          .user-menu-item {
            padding: 10px 20px;
            cursor: pointer;
            width: 55px;
            text-align: center;
          }
          .user-menu-item:hover {
            background-color: #f0f0f0;
          }
        `}
      </style>
      <div className="page-top">
        <h1 className="text-center">博客后台管理系统</h1>
        <div
          className="user-info"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span className="user-name">{userName}</span>
          <div className="user-menu">
            <div className="user-menu-item" onClick={logout}>
              登出
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export { PageTop };
