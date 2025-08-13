
import axios, { AxiosResponse, AxiosRequestConfig, AxiosError } from "axios";
import { message } from 'antd';

// 统一错误处理函数
const getErrorMessage = (error: any): string => {
  if (error.response) {
    // 服务器返回了错误响应
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return data?.msg || "请求参数错误";
      case 401:
        return "用户名或密码错误";
      case 403:
        return "账户已被禁用，请联系管理员";
      case 404:
        return "请求的资源不存在";
      case 408:
        return "请求超时，请重试";
      case 429:
        return "请求过于频繁，请稍后重试";
      case 500:
        return "服务器内部错误";
      case 502:
        return "网关错误";
      case 503:
        return "服务暂时不可用";
      case 504:
        return "网关超时";
      default:
        return data?.msg || `服务器错误 (${status})`;
    }
  } else if (error.request) {
    // 网络错误
    if (error.code === 'ECONNABORTED') {
      return "请求超时，请检查网络连接";
    }
    return "网络连接失败，请检查网络设置";
  } else {
    // 其他错误
    return error.message || "未知错误，请重试";
  }
};

//防止返回报ts没有属性的错误
declare module "axios" {
  interface AxiosResponse<T = any> {
    code: null;
    res: any;
    error: null;
    msg: string;
    count?: number;
    token?: string;
  }
  export function create(config?: AxiosRequestConfig): AxiosInstance;
}
const httpService = axios.create({
  baseURL: '/api', // 需自定义
  headers: {
    authorization: localStorage.getItem("token"),
  },
  // 请求超时时间
  timeout: 3000, // 需自定义
});

/* 网络请求部分 */
httpService.interceptors.request.use(
  (config: any) => {
    // 动态获取最新的token
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.authorization = token;
    }
    return config;
  },
  (error: any) => {
    // 对请求错误做些什么
    const errorMessage = getErrorMessage(error);
    message.error(errorMessage);
    return Promise.reject(error);
  }
);

httpService.interceptors.response.use(
  (response: AxiosResponse) => {
    // 对响应数据做点什么
    if (response.status === 200) {
      return response.data;
    }
    return response;
  },
  (error: any) => {
    // 对响应错误做点什么
    const errorMessage = getErrorMessage(error);

    // 特殊处理token失效
    if (error.response?.status === 401 || error.response?.data?.code === 403) {
      message.error("登录已过期，请重新登录");
      localStorage.removeItem("token");
      localStorage.removeItem("userInfo");
      // 可以在这里添加跳转到登录页的逻辑
      // window.location.href = '/login';
      return Promise.reject(error);
    }

    // 对于登录接口，不显示全局错误提示，让组件自己处理
    const isLoginRequest = error.config?.url?.includes('/login');
    if (!isLoginRequest) {
      message.error(errorMessage);
    }

    // 返回错误信息供组件使用
    return Promise.reject({
      ...error,
      message: errorMessage
    });
  }
);

// 导出工具函数供其他组件使用
export { getErrorMessage };

// 清除用户登录信息的工具函数
export const clearUserData = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userInfo");
};

// 检查是否已登录的工具函数
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("token");
};

export default httpService;
