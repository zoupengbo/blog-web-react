import request from './request';

export interface Category {
  id?: number;
  name: string;
  description?: string;
  articleCount?: number;
  sort?: number;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 创建分类
 */
export const createCategory = async (data: Category) => {
  return request({
    url: '/category',
    method: 'post',
    data
  });
};

/**
 * 更新分类
 */
export const updateCategory = async (data: Category) => {
  return request({
    url: '/updateCategory',
    method: 'post',
    data
  });
};

/**
 * 删除分类
 */
export const deleteCategory = async (id: number) => {
  return request({
    url: `/category/${id}`,
    method: 'delete'
  });
};

/**
 * 获取分类详情
 */
export const getCategoryDetail = async (id: number) => {
  return request({
    url: `/category/${id}`,
    method: 'get'
  });
};

/**
 * 获取分类列表
 */
export const getCategoryList = async (offset: number = 0, limit: number = 100) => {
  return request({
    url: '/getCategoryList',
    method: 'get',
    params: { offset, limit }
  });
};

/**
 * 获取所有启用的分类（用于下拉选择）
 */
export const getActiveCategories = async () => {
  return request({
    url: '/getActiveCategories',
    method: 'get'
  });
};

