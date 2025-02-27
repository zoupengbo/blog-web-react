
import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import { message } from 'antd';

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
    return config;
  },
  (error: any) => {
    // 对请求错误做些什么
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
    if (error.response.data.code === 403) {
      message.error("token失效，请重新登录");
      localStorage.setItem("token", "");
    } else {
      message.error(error.response.data.msg || "出错了");
      return Promise.resolve(error.response.data);
    }
    return Promise.reject(error);
  }
);

export default httpService;
