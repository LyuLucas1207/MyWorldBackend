# 使用官方 Node.js 为基础镜像
FROM node:16

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装项目依赖
RUN npm install

# # 复制所有项目文件到工作目录
# COPY . .
# replace with mount: sudo docker run -d -p 9999:9999 --name my-app -v /volume2/ProJData/PersonalData:/app my-backend-container
# 由于使用了挂载，所以不需要复制文件

# 暴露端口 9999
EXPOSE 9999

# 运行你的 app
CMD ["node", "backend/http.js"]
