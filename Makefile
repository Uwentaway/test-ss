# Makefile for Custom Shadowsocket Proxy

# 变量定义
IMAGE_NAME = custom-shadowsocket-proxy
IMAGE_TAG = latest
CONTAINER_NAME = shadowsocket-proxy
REGISTRY = your-registry.com

# 默认目标
.PHONY: help
help:
	@echo "🛡️  Custom Shadowsocket Proxy - Docker Commands"
	@echo ""
	@echo "📦 Build Commands:"
	@echo "  make build          - 构建Docker镜像"
	@echo "  make build-no-cache - 无缓存构建Docker镜像"
	@echo ""
	@echo "🚀 Run Commands:"
	@echo "  make run            - 运行容器（所有服务）"
	@echo "  make run-server     - 仅运行代理服务器"
	@echo "  make run-client     - 仅运行代理客户端"
	@echo "  make run-web        - 仅运行Web界面"
	@echo "  make run-detached   - 后台运行容器"
	@echo ""
	@echo "🔧 Management Commands:"
	@echo "  make stop           - 停止容器"
	@echo "  make restart        - 重启容器"
	@echo "  make logs           - 查看容器日志"
	@echo "  make shell          - 进入容器Shell"
	@echo "  make clean          - 清理容器和镜像"
	@echo ""
	@echo "📊 Info Commands:"
	@echo "  make ps             - 查看容器状态"
	@echo "  make images         - 查看镜像信息"
	@echo "  make stats          - 查看容器资源使用"
	@echo ""
	@echo "🌐 Registry Commands:"
	@echo "  make push           - 推送镜像到仓库"
	@echo "  make pull           - 从仓库拉取镜像"
	@echo ""
	@echo "🧪 Development Commands:"
	@echo "  make dev            - 开发模式运行"
	@echo "  make test           - 运行测试"

# 构建镜像
.PHONY: build
build:
	@echo "🔨 Building Docker image..."
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .
	@echo "✅ Build completed: $(IMAGE_NAME):$(IMAGE_TAG)"

# 无缓存构建
.PHONY: build-no-cache
build-no-cache:
	@echo "🔨 Building Docker image (no cache)..."
	docker build --no-cache -t $(IMAGE_NAME):$(IMAGE_TAG) .
	@echo "✅ Build completed: $(IMAGE_NAME):$(IMAGE_TAG)"

# 运行容器（所有服务）
.PHONY: run
run:
	@echo "🚀 Starting container with all services..."
	docker run -it --rm \
		--name $(CONTAINER_NAME) \
		-p 8388:8388 \
		-p 1088:1088 \
		-p 3000:3000 \
		$(IMAGE_NAME):$(IMAGE_TAG)

# 后台运行
.PHONY: run-detached
run-detached:
	@echo "🚀 Starting container in detached mode..."
	docker run -d \
		--name $(CONTAINER_NAME) \
		-p 8388:8388 \
		-p 1088:1088 \
		-p 3000:3000 \
		--restart unless-stopped \
		$(IMAGE_NAME):$(IMAGE_TAG)
	@echo "✅ Container started: $(CONTAINER_NAME)"
	@echo "📊 Web interface: http://localhost:3000"

# 仅运行服务器
.PHONY: run-server
run-server:
	@echo "🖥️  Starting proxy server only..."
	docker run -it --rm \
		--name $(CONTAINER_NAME)-server \
		-p 8388:8388 \
		$(IMAGE_NAME):$(IMAGE_TAG) server

# 仅运行客户端
.PHONY: run-client
run-client:
	@echo "📱 Starting proxy client only..."
	docker run -it --rm \
		--name $(CONTAINER_NAME)-client \
		-p 1088:1088 \
		$(IMAGE_NAME):$(IMAGE_TAG) client

# 仅运行Web界面
.PHONY: run-web
run-web:
	@echo "🌐 Starting web interface only..."
	docker run -it --rm \
		--name $(CONTAINER_NAME)-web \
		-p 3000:3000 \
		$(IMAGE_NAME):$(IMAGE_TAG) web

# 使用docker-compose运行
.PHONY: up
up:
	@echo "🚀 Starting services with docker-compose..."
	docker-compose up

# 后台运行docker-compose
.PHONY: up-detached
up-detached:
	@echo "🚀 Starting services with docker-compose (detached)..."
	docker-compose up -d
	@echo "✅ Services started"
	@echo "📊 Web interface: http://localhost:3000"

# 停止容器
.PHONY: stop
stop:
	@echo "🛑 Stopping container..."
	-docker stop $(CONTAINER_NAME)
	-docker-compose down
	@echo "✅ Container stopped"

# 重启容器
.PHONY: restart
restart: stop run-detached

# 查看日志
.PHONY: logs
logs:
	@echo "📋 Container logs:"
	docker logs -f $(CONTAINER_NAME)

# 进入容器Shell
.PHONY: shell
shell:
	@echo "🐚 Entering container shell..."
	docker exec -it $(CONTAINER_NAME) /bin/sh

# 查看容器状态
.PHONY: ps
ps:
	@echo "📊 Container status:"
	docker ps -a --filter name=$(CONTAINER_NAME)

# 查看镜像信息
.PHONY: images
images:
	@echo "📦 Image information:"
	docker images $(IMAGE_NAME)

# 查看资源使用
.PHONY: stats
stats:
	@echo "📈 Container resource usage:"
	docker stats $(CONTAINER_NAME)

# 清理
.PHONY: clean
clean:
	@echo "🧹 Cleaning up..."
	-docker stop $(CONTAINER_NAME)
	-docker rm $(CONTAINER_NAME)
	-docker rmi $(IMAGE_NAME):$(IMAGE_TAG)
	-docker-compose down --rmi all
	@echo "✅ Cleanup completed"

# 推送到仓库
.PHONY: push
push:
	@echo "📤 Pushing image to registry..."
	docker tag $(IMAGE_NAME):$(IMAGE_TAG) $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)
	docker push $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)
	@echo "✅ Image pushed"

# 从仓库拉取
.PHONY: pull
pull:
	@echo "📥 Pulling image from registry..."
	docker pull $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG)
	docker tag $(REGISTRY)/$(IMAGE_NAME):$(IMAGE_TAG) $(IMAGE_NAME):$(IMAGE_TAG)
	@echo "✅ Image pulled"

# 开发模式
.PHONY: dev
dev:
	@echo "🔧 Starting development mode..."
	docker run -it --rm \
		--name $(CONTAINER_NAME)-dev \
		-p 8388:8388 \
		-p 1088:1088 \
		-p 3000:3000 \
		-v $(PWD)/src:/app/src \
		-v $(PWD)/logs:/app/logs \
		$(IMAGE_NAME):$(IMAGE_TAG)

# 运行测试
.PHONY: test
test:
	@echo "🧪 Running tests..."
	docker run --rm \
		--name $(CONTAINER_NAME)-test \
		$(IMAGE_NAME):$(IMAGE_TAG) \
		npm test

# 健康检查
.PHONY: health
health:
	@echo "🏥 Checking container health..."
	docker exec $(CONTAINER_NAME) node -e "const net = require('net'); const client = net.createConnection(8388, 'localhost'); client.on('connect', () => { console.log('✅ Server is healthy'); client.end(); }); client.on('error', (err) => { console.log('❌ Server is unhealthy:', err.message); });"