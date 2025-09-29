import React from 'react';
import {
  DashboardOutlined,
  FileTextOutlined,
  SmileOutlined,
  BarChartOutlined,
  EditOutlined,
  UnorderedListOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import { AccessManager } from '@pages/count/accessManager/index.tsx';
import { ArticleEdit } from '@pages/article/articleEdit/index.tsx';
import EbookReader from '@pages/entertainment/ebookReader/index.tsx';

// 路由配置接口
export interface RouteConfig {
  path: string;
  title: string;
  icon?: React.ReactNode;
  component: React.ComponentType;
  group?: string;
  groupTitle?: string;
  groupIcon?: React.ReactNode;
  hidden?: boolean;
  permission?: string;
  exact?: boolean;
}

// 面包屑项接口
export interface BreadcrumbItem {
  path: string;
  title: string;
  icon?: React.ReactNode;
}

// 菜单项接口
export interface MenuItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  children?: MenuItem[];
}

// 菜单分组接口
export interface MenuGroup {
  title: string;
  icon?: React.ReactNode;
  routes: RouteConfig[];
}

// 路由配置数组
export const routeConfigs: RouteConfig[] = [
  {
    path: "/",
    title: "数据概览",
    icon: <DashboardOutlined />,
    component: AccessManager,
    group: "dashboard",
    groupTitle: "数据面板",
    groupIcon: <DashboardOutlined />
  },
  {
    path: "/article-edit",
    title: "文章管理",
    icon: <EditOutlined />,
    component: ArticleEdit,
    group: "content",
    groupTitle: "内容管理",
    groupIcon: <FileTextOutlined />
  },
  {
    path: "/article-list",
    title: "文章列表",
    icon: <UnorderedListOutlined />,
    component: () => <div>文章列表页面</div>, // 临时组件
    group: "content"
  },
  {
    path: "/ebook-reader",
    title: "电子书阅读",
    icon: <ReadOutlined />,
    component: EbookReader,
    group: "entertainment",
    groupTitle: "娱乐模块",
    groupIcon: <SmileOutlined />
  },
  {
    path: "/analytics",
    title: "访问统计",
    icon: <BarChartOutlined />,
    component: () => <div>数据统计页面</div>, // 临时组件
    group: "analytics",
    groupTitle: "数据统计",
    groupIcon: <BarChartOutlined />
  }
];

// 生成面包屑导航
export const generateBreadcrumbs = (
  currentPath: string, 
  routeMap: Map<string, RouteConfig>
): BreadcrumbItem[] => {
  const route = routeMap.get(currentPath);
  if (!route) return [];

  const breadcrumbs: BreadcrumbItem[] = [];

  // 如果是分组页面，先添加分组
  if (route.group && route.group !== 'main' && route.groupTitle) {
    breadcrumbs.push({
      path: '',
      title: route.groupTitle,
      icon: route.groupIcon
    });
  }

  // 添加当前页面
  breadcrumbs.push({
    path: route.path,
    title: route.title,
    icon: route.icon
  });

  return breadcrumbs;
};

// 获取默认展开的菜单项
export const getDefaultOpenKeys = (currentPath: string, routeMap: Map<string, RouteConfig>): string[] => {
  const route = routeMap.get(currentPath);
  if (!route || !route.group || route.group === 'main') {
    return [];
  }
  return [route.group];
};
