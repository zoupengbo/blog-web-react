import httpService from './request';

// 文章数据接口
export interface ArticleData {
  id?: React.Key;
  title: string;
  author: string;
  category: string;
  content: string;
  summary: string;
  status: string;
  tags: string[];
}

// 统一的文章保存接口
export const saveArticle = async (articleData: ArticleData) => {
  const { id, ...data } = articleData;
  
  if (id) {
    // 更新文章
    return await httpService.post("/updateArticle", {
      id,
      ...data,
    });
  } else {
    // 创建新文章
    return await httpService.post("/article", data);
  }
};

// 获取文章列表
export const getArticleList = async (page: number = 0, pageSize: number = 10) => {
  return await httpService("/articlelist", {
    params: {
      offset: page,
      limit: pageSize,
    },
  });
};

// 删除文章
export const deleteArticle = async (id: React.Key) => {
  return await httpService.post("/deleteArticle", { id });
};
