#!/bin/sh

# Docker容器启动脚本

set -e

# 打印启动信息
echo "🚀 Starting Custom Shadowsocket Proxy Service..."
echo "📅 $(date)"
echo "🔧 Node.js version: $(node --version)"
echo "📦 NPM version: $(npm --version)"

# 检查环境变量
echo "🔍 Environment Configuration:"
echo "   SERVER_HOST: ${SERVER_HOST:-0.0.0.0}"
echo "   SERVER_PORT: ${SERVER_PORT:-8388}"
echo "   CLIENT_LOCAL_HOST: ${CLIENT_LOCAL_HOST:-127.0.0.1}"
echo "   CLIENT_LOCAL_PORT: ${CLIENT_LOCAL_PORT:-1088}"
echo "   WEB_PORT: ${WEB_PORT:-3000}"
echo "   NODE_ENV: ${NODE_ENV:-production}"

# 创建日志目录
mkdir -p /app/logs

# 等待网络就绪
echo "⏳ Waiting for network to be ready..."
sleep 2

# 启动服务的函数
start_server() {
    echo "🖥️  Starting Proxy Server on port ${SERVER_PORT:-8388}..."
    node src/server.js > /app/logs/server.log 2>&1 &
    SERVER_PID=$!
    echo "   Server PID: $SERVER_PID"
}

start_client() {
    echo "📱 Starting Proxy Client on port ${CLIENT_LOCAL_PORT:-1088}..."
    sleep 3  # 等待服务器启动
    node src/client.js > /app/logs/client.log 2>&1 &
    CLIENT_PID=$!
    echo "   Client PID: $CLIENT_PID"
}

start_web() {
    echo "🌐 Starting Web Interface on port ${WEB_PORT:-3000}..."
    node src/web-server.js > /app/logs/web.log 2>&1 &
    WEB_PID=$!
    echo "   Web PID: $WEB_PID"
}

# 信号处理函数
cleanup() {
    echo "🛑 Shutting down services..."
    
    if [ ! -z "$SERVER_PID" ]; then
        echo "   Stopping Server (PID: $SERVER_PID)..."
        kill -TERM $SERVER_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$CLIENT_PID" ]; then
        echo "   Stopping Client (PID: $CLIENT_PID)..."
        kill -TERM $CLIENT_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$WEB_PID" ]; then
        echo "   Stopping Web Interface (PID: $WEB_PID)..."
        kill -TERM $WEB_PID 2>/dev/null || true
    fi
    
    echo "✅ All services stopped"
    exit 0
}

# 注册信号处理
trap cleanup SIGTERM SIGINT

# 根据启动模式决定启动哪些服务
case "${1:-all}" in
    "server")
        start_server
        wait $SERVER_PID
        ;;
    "client")
        start_client
        wait $CLIENT_PID
        ;;
    "web")
        start_web
        wait $WEB_PID
        ;;
    "all"|*)
        start_server
        start_client
        start_web
        
        echo "✅ All services started successfully!"
        echo "📊 Access web interface at: http://localhost:${WEB_PORT:-3000}"
        echo "🔗 Proxy server listening on: ${SERVER_HOST:-0.0.0.0}:${SERVER_PORT:-8388}"
        echo "📱 Local proxy available at: ${CLIENT_LOCAL_HOST:-127.0.0.1}:${CLIENT_LOCAL_PORT:-1088}"
        echo ""
        echo "📋 Service Status:"
        echo "   Server PID: $SERVER_PID"
        echo "   Client PID: $CLIENT_PID"
        echo "   Web PID: $WEB_PID"
        echo ""
        echo "📝 Logs are available in /app/logs/"
        echo "🔄 Use 'docker logs <container>' to view real-time logs"
        
        # 等待所有进程
        wait
        ;;
esac