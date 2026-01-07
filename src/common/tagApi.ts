import request from './request';

export interface Tag {
  id?: number;
  name: string;
  color?: string;
  description?: string;
  usageCount?: number;
  sort?: number;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 创建标签
 */
export const createTag = async (data: Tag) => {
  return request({
    url: '/tag',
    method: 'post',
    data
  });
};

/**
 * 更新标签
 */
export const updateTag = async (data: Tag) => {
  return request({
    url: '/updateTag',
    method: 'post',
    data
  });
};

/**
 * 删除标签
 */
export const deleteTag = async (id: number) => {
  return request({
    url: `/tag/${id}`,
    method: 'delete'
  });
};

/**
 * 获取标签详情
 */
export const getTagDetail = async (id: number) => {
  return request({
    url: `/tag/${id}`,
    method: 'get'
  });
};

/**
 * 获取标签列表
 */
export const getTagList = async (offset: number = 0, limit: number = 100) => {
  return request({
    url: '/getTagList',
    method: 'get',
    params: { offset, limit }
  });
};

/**
 * 获取所有启用的标签（用于下拉选择）
 */
export const getActiveTags = async () => {
  return request({
    url: '/getActiveTags',
    method: 'get'
  });
};

