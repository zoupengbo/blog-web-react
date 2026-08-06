# 构建阶段：使用 Node 镜像打包前端 React 代码
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package定义
COPY package*.json ./
RUN npm install --registry=https://registry.npmmirror.com

# 复制源码并构建
COPY . .
RUN npm run build

# 运行阶段：使用 Nginx 提供服务
FROM nginx:alpine

# 复制构建产物到 Nginx 目录
COPY --from=builder /app/build /usr/share/nginx/html

# 复制定制的 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
