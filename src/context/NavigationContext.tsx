import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { routeConfigs, RouteConfig, BreadcrumbItem, generateBreadcrumbs, getDefaultOpenKeys } from '../config/routes';
import { useMenuData } from '../hooks/useMenuData';

interface NavigationContextType {
  currentPath: string;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  breadcrumbs: BreadcrumbItem[];
  routeMap: Map<string, RouteConfig>;
  menuItems: any[];
  defaultOpenKeys: string[];
}

const NavigationContext = createContext<NavigationContextType | null>(null);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const location = useLocation();
  
  // 从localStorage读取侧边栏折叠状态
  const [collapsed, setCollapsedState] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  // 获取菜单数据
  const { menuItems, routeMap } = useMenuData(routeConfigs);
  
  // 生成面包屑导航
  const breadcrumbs = useMemo(() => {
    return generateBreadcrumbs(location.pathname, routeMap);
  }, [location.pathname, routeMap]);

  // 获取默认展开的菜单项
  const defaultOpenKeys = useMemo(() => {
    return getDefaultOpenKeys(location.pathname, routeMap);
  }, [location.pathname, routeMap]);

  // 设置折叠状态并持久化
  const setCollapsed = (newCollapsed: boolean) => {
    setCollapsedState(newCollapsed);
    localStorage.setItem('sidebar-collapsed', newCollapsed.toString());
  };

  // 监听路由变化，可以在这里添加页面访问记录等逻辑
  useEffect(() => {
    // 记录页面访问（可选）
    console.log('Navigate to:', location.pathname);
  }, [location.pathname]);

  const value: NavigationContextType = {
    currentPath: location.pathname,
    collapsed,
    setCollapsed,
    breadcrumbs,
    routeMap,
    menuItems,
    defaultOpenKeys
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

// 自定义hook
export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

// 导出Context供其他组件使用
export { NavigationContext };
