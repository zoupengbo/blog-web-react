import React, { useState } from "react";
import {
  DashboardOutlined,
  FileTextOutlined,
  SmileOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BarChartOutlined,
  EditOutlined,
  UnorderedListOutlined,
  BookOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Menu } from "antd";
import { useNavigate, useLocation } from "react-router-dom";
import "./page-left.scss";

type MenuItem = Required<MenuProps>["items"][number];
function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: "group"
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem;
}

const items: MenuItem[] = [
  getItem("数据概览", "/", <DashboardOutlined />),
  getItem("内容管理", "content", <FileTextOutlined />, [
    getItem("文章管理", "/article-edit", <EditOutlined />),
    getItem("文章列表", "/article-list", <UnorderedListOutlined />),
  ]),
  getItem("娱乐模块", "entertainment", <SmileOutlined />, [
    getItem("小说爬虫", "/novel-crawler", <BookOutlined />),
    getItem("电子书阅读", "/ebook-reader", <ReadOutlined />),
  ]),
  getItem("数据统计", "analytics", <BarChartOutlined />, [
    getItem("访问统计", "/analytics", <BarChartOutlined />),
  ]),
];

const PageLeft: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  const handleClick: MenuProps["onClick"] = (e) => {
    navigate(e.key);
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    return [location.pathname];
  };

  // 获取当前展开的菜单项
  const getOpenKeys = () => {
    const path = location.pathname;
    if (path === "/article-edit" || path === "/article-list") return ["content"];
    if (path === "/novel-crawler" || path === "/ebook-reader") return ["entertainment"];
    if (path === "/analytics") return ["analytics"];
    return [];
  };

  return (
    <div className={`page-left ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div
          className="collapse-btn"
          onClick={toggleCollapsed}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
        {!collapsed && (
          <div className="sidebar-title">
            <span>导航菜单</span>
          </div>
        )}
      </div>

      <div className="sidebar-menu">
        <Menu
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          onClick={handleClick}
          mode="inline"
          theme="light"
          inlineCollapsed={collapsed}
          items={items}
        />
      </div>

      {!collapsed && (
        <div className="sidebar-footer">
          <div className="footer-info">
            <div className="version">v1.0.0</div>
            <div className="copyright">© 2024 Blog Admin</div>
          </div>
        </div>
      )}
    </div>
  );
};

export { PageLeft };
