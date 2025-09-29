import { useMemo } from 'react';
import { RouteConfig, MenuItem, MenuGroup } from '../config/routes';

interface MenuDataResult {
  menuItems: MenuItem[];
  routeMap: Map<string, RouteConfig>;
}

export const useMenuData = (routeConfigs: RouteConfig[]): MenuDataResult => {
  return useMemo(() => {
    // 创建路由映射
    const routeMap = new Map(routeConfigs.map(route => [route.path, route]));

    // 按组分类路由
    const grouped = routeConfigs.reduce((acc, route) => {
      if (route.hidden) return acc;
      
      if (!route.group || route.group === 'main') {
        acc.main.push(route);
      } else {
        if (!acc.groups[route.group]) {
          acc.groups[route.group] = {
            title: route.groupTitle || route.group,
            icon: route.groupIcon,
            routes: []
          };
        }
        acc.groups[route.group].routes.push(route);
      }
      return acc;
    }, { main: [] as RouteConfig[], groups: {} as Record<string, MenuGroup> });

    // 生成Antd Menu需要的数据结构
    const menuItems: MenuItem[] = [
      // 主菜单项（不分组的）
      ...grouped.main.map(route => ({
        key: route.path,
        icon: route.icon,
        label: route.title
      })),
      // 分组菜单项
      ...Object.entries(grouped.groups).map(([groupKey, group]) => ({
        key: groupKey,
        icon: group.icon,
        label: group.title,
        children: group.routes.map(route => ({
          key: route.path,
          icon: route.icon,
          label: route.title
        }))
      }))
    ];

    return { menuItems, routeMap };
  }, [routeConfigs]);
};
