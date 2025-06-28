# 使用官方Node.js 18 Alpine镜像作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S proxy -u 1001

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && \
    npm cache clean --force

# 复制源代码
COPY src/ ./src/
COPY test/ ./test/
COPY README.md ./
COPY docker-entrypoint.sh ./

# 设置启动脚本权限
RUN chmod +x docker-entrypoint.sh

# 创建日志目录
RUN mkdir -p /app/logs && \
    chown -R proxy:nodejs /app

# 切换到非root用户
USER proxy

# 暴露端口
EXPOSE 8388 1088 3000

# 设置环境变量
ENV NODE_ENV=production
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8388
ENV CLIENT_LOCAL_HOST=127.0.0.1
ENV CLIENT_LOCAL_PORT=1088
ENV WEB_PORT=3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const net = require('net'); const client = net.createConnection(8388, 'localhost'); client.on('connect', () => { client.end(); process.exit(0); }); client.on('error', () => process.exit(1));"

# 使用自定义启动脚本
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["all"]