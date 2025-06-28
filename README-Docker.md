# 🐳 Docker 部署指南

本文档介绍如何使用Docker部署Custom Shadowsocket Proxy服务。

## 📋 前置要求

- Docker 20.10+
- Docker Compose 2.0+ (可选)
- 至少 512MB 可用内存
- 端口 8388, 1088, 3000 可用

## 🚀 快速开始

### 1. 构建镜像

```bash
# 克隆项目
git clone <repository-url>
cd custom-shadowsocket-proxy

# 构建Docker镜像
make build
# 或者
docker build -t custom-shadowsocket-proxy .
```

### 2. 运行容器

```bash
# 运行所有服务
make run
# 或者
docker run -it --rm \
  --name shadowsocket-proxy \
  -p 8388:8388 \
  -p 1088:1088 \
  -p 3000:3000 \
  custom-shadowsocket-proxy
```

### 3. 访问服务

- **Web管理界面**: http://localhost:3000
- **代理服务器**: localhost:8388
- **本地代理**: localhost:1088

## 🔧 配置选项

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `SERVER_HOST` | 0.0.0.0 | 服务器监听地址 |
| `SERVER_PORT` | 8388 | 服务器端口 |
| `CLIENT_LOCAL_HOST` | 127.0.0.1 | 客户端本地地址 |
| `CLIENT_LOCAL_PORT` | 1088 | 客户端本地端口 |
| `WEB_PORT` | 3000 | Web界面端口 |
| `PROXY_PASSWORD` | (配置文件) | 代理密码 |
| `NODE_ENV` | production | 运行环境 |

### 自定义配置运行

```bash
docker run -d \
  --name shadowsocket-proxy \
  -p 8388:8388 \
  -p 1088:1088 \
  -p 3000:3000 \
  -e SERVER_PORT=9999 \
  -e WEB_PORT=8080 \
  -e PROXY_PASSWORD=your-custom-password \
  custom-shadowsocket-proxy
```

## 📦 Docker Compose 部署

### 1. 使用提供的配置

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 2. 自定义 docker-compose.yml

```yaml
version: '3.8'

services:
  shadowsocket-proxy:
    build: .
    container_name: my-shadowsocket-proxy
    restart: unless-stopped
    ports:
      - "8388:8388"
      - "1088:1088"
      - "3000:3000"
    environment:
      - PROXY_PASSWORD=my-secure-password
      - SERVER_PORT=8388
      - WEB_PORT=3000
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config  # 可选：挂载配置目录
    networks:
      - proxy-network

networks:
  proxy-network:
    driver: bridge
```

## 🛠️ 管理命令

### 使用 Makefile

```bash
# 查看所有可用命令
make help

# 构建和运行
make build
make run-detached

# 管理容器
make stop
make restart
make logs

# 进入容器
make shell

# 清理
make clean
```

### 直接使用 Docker

```bash
# 构建镜像
docker build -t custom-shadowsocket-proxy .

# 后台运行
docker run -d \
  --name shadowsocket-proxy \
  -p 8388:8388 \
  -p 1088:1088 \
  -p 3000:3000 \
  --restart unless-stopped \
  custom-shadowsocket-proxy

# 查看日志
docker logs -f shadowsocket-proxy

# 停止容器
docker stop shadowsocket-proxy

# 删除容器
docker rm shadowsocket-proxy
```

## 🔍 服务模式

### 1. 完整模式（默认）
运行所有服务：代理服务器 + 客户端 + Web界面

```bash
docker run -it --rm \
  --name shadowsocket-proxy \
  -p 8388:8388 \
  -p 1088:1088 \
  -p 3000:3000 \
  custom-shadowsocket-proxy
```

### 2. 仅服务器模式
只运行代理服务器

```bash
docker run -it --rm \
  --name shadowsocket-server \
  -p 8388:8388 \
  custom-shadowsocket-proxy server
```

### 3. 仅客户端模式
只运行代理客户端

```bash
docker run -it --rm \
  --name shadowsocket-client \
  -p 1088:1088 \
  custom-shadowsocket-proxy client
```

### 4. 仅Web界面模式
只运行Web管理界面

```bash
docker run -it --rm \
  --name shadowsocket-web \
  -p 3000:3000 \
  custom-shadowsocket-proxy web
```

## 📊 监控和日志

### 健康检查

```bash
# 检查容器健康状态
docker exec shadowsocket-proxy node -e "
const net = require('net');
const client = net.createConnection(8388, 'localhost');
client.on('connect', () => {
  console.log('✅ Server is healthy');
  client.end();
});
client.on('error', (err) => {
  console.log('❌ Server is unhealthy:', err.message);
});
"
```

### 查看资源使用

```bash
# 实时资源监控
docker stats shadowsocket-proxy

# 容器信息
docker inspect shadowsocket-proxy
```

### 日志管理

```bash
# 查看实时日志
docker logs -f shadowsocket-proxy

# 查看最近100行日志
docker logs --tail 100 shadowsocket-proxy

# 查看特定时间段日志
docker logs --since "2024-01-01T00:00:00" shadowsocket-proxy
```

## 🔒 安全建议

### 1. 密码安全
```bash
# 使用强密码
export PROXY_PASSWORD=$(openssl rand -hex 16)
docker run -e PROXY_PASSWORD=$PROXY_PASSWORD ...
```

### 2. 网络安全
```bash
# 限制网络访问
docker run --network none ...
# 或使用自定义网络
docker network create --driver bridge proxy-net
docker run --network proxy-net ...
```

### 3. 资源限制
```bash
# 限制内存和CPU使用
docker run \
  --memory=512m \
  --cpus=1.0 \
  --restart=unless-stopped \
  custom-shadowsocket-proxy
```

## 🚨 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 检查端口使用情况
   netstat -tulpn | grep :8388
   # 或使用不同端口
   docker run -p 9999:8388 ...
   ```

2. **容器无法启动**
   ```bash
   # 查看详细错误信息
   docker logs shadowsocket-proxy
   # 检查容器状态
   docker ps -a
   ```

3. **连接失败**
   ```bash
   # 进入容器调试
   docker exec -it shadowsocket-proxy /bin/sh
   # 检查网络连接
   netstat -tulpn
   ```

### 调试模式

```bash
# 开发模式运行（挂载源码）
docker run -it --rm \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/logs:/app/logs \
  -p 8388:8388 \
  -p 1088:1088 \
  -p 3000:3000 \
  custom-shadowsocket-proxy
```

## 📈 性能优化

### 1. 多阶段构建优化
Dockerfile已使用Alpine Linux基础镜像，减小镜像大小。

### 2. 资源配置
```bash
# 生产环境推荐配置
docker run \
  --memory=1g \
  --cpus=2.0 \
  --restart=unless-stopped \
  --log-driver=json-file \
  --log-opt max-size=100m \
  --log-opt max-file=3 \
  custom-shadowsocket-proxy
```

### 3. 网络优化
```bash
# 使用host网络模式（生产环境谨慎使用）
docker run --network=host custom-shadowsocket-proxy
```

## 🌐 生产部署

### 1. 使用外部配置

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  shadowsocket-proxy:
    image: custom-shadowsocket-proxy:latest
    container_name: shadowsocket-proxy-prod
    restart: unless-stopped
    ports:
      - "8388:8388"
      - "1088:1088"
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PROXY_PASSWORD_FILE=/run/secrets/proxy_password
    secrets:
      - proxy_password
    volumes:
      - logs:/app/logs
      - /etc/localtime:/etc/localtime:ro
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "3"

secrets:
  proxy_password:
    file: ./secrets/proxy_password.txt

volumes:
  logs:
    driver: local
```

### 2. 反向代理配置

```nginx
# nginx.conf
upstream shadowsocket_web {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://shadowsocket_web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

这个Docker化方案提供了完整的容器化部署解决方案，支持多种运行模式和生产环境部署！