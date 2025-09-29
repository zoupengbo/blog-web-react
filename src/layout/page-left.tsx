import React from "react";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Menu } from "antd";
import { useNavigate } from "react-router-dom";
import { useNavigation } from "../context/NavigationContext";
import "./page-left.scss";

// 侧边栏头部组件
const SidebarHeader: React.FC<{ collapsed: boolean; onToggle: () => void }> = ({ 
  collapsed, 
  onToggle 
}) => (
  <div className="sidebar-header">
    <div className="collapse-btn" onClick={onToggle}>
      {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
    </div>
    {!collapsed && (
      <div className="sidebar-title">
        <span>导航菜单</span>
      </div>
    )}
  </div>
);

// 侧边栏底部组件
const SidebarFooter: React.FC<{ collapsed: boolean }> = ({ collapsed }) => (
  !collapsed ? (
    <div className="sidebar-footer">
      <div className="footer-info">
        <div className="version">v1.0.0</div>
        <div className="copyright">© 2024 Blog Admin</div>
      </div>
    </div>
  ) : null
);

const PageLeft: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentPath, 
    collapsed, 
    setCollapsed,
    menuItems,
    defaultOpenKeys
  } = useNavigation();

  const handleMenuClick: MenuProps["onClick"] = (e) => {
    navigate(e.key);
  };

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={`page-left ${collapsed ? 'collapsed' : ''}`}>
      <SidebarHeader collapsed={collapsed} onToggle={toggleCollapsed} />

      <div className="sidebar-menu">
        <Menu
          selectedKeys={[currentPath]}
          defaultOpenKeys={defaultOpenKeys}
          onClick={handleMenuClick}
          mode="inline"
          theme="light"
          inlineCollapsed={collapsed}
          items={menuItems}
        />
      </div>

      <SidebarFooter collapsed={collapsed} />
    </div>
  );
};

export { PageLeft };
