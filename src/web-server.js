const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const config = require('./config');
const { logWithTime } = require('./utils');

class WebServer {
  constructor() {
    this.port = 3000;
    this.host = '0.0.0.0';
  }

  start() {
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    server.listen(this.port, this.host, () => {
      logWithTime(`Web interface started at http://${this.host}:${this.port}`);
      logWithTime(`Access the dashboard to view connection details`);
    });

    server.on('error', (err) => {
      logWithTime(`Web server error: ${err.message}`);
    });
  }

  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    try {
      if (pathname === '/' || pathname === '/index.html') {
        await this.serveHomePage(res);
      } else if (pathname === '/api/config') {
        await this.serveConfig(res);
      } else if (pathname === '/api/qrcode') {
        await this.serveQRCode(res, parsedUrl.query);
      } else if (pathname === '/api/stats') {
        await this.serveStats(res);
      } else {
        this.serve404(res);
      }
    } catch (error) {
      logWithTime(`Web server request error: ${error.message}`);
      this.serve500(res, error.message);
    }
  }

  async serveHomePage(res) {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custom Shadowsocket Proxy - 连接配置</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 300;
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin-bottom: 40px;
        }

        .card {
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .card-title {
            font-size: 1.4rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: #2d3748;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .icon {
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
        }

        .config-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
        }

        .config-item:last-child {
            border-bottom: none;
        }

        .config-label {
            font-weight: 500;
            color: #4a5568;
        }

        .config-value {
            font-family: 'Monaco', 'Menlo', monospace;
            background: #f7fafc;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 0.9rem;
            color: #2d3748;
            border: 1px solid #e2e8f0;
        }

        .connection-string {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
            word-break: break-all;
            margin: 15px 0;
            position: relative;
        }

        .copy-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #667eea;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
            transition: background 0.3s ease;
        }

        .copy-btn:hover {
            background: #5a67d8;
        }

        .qr-container {
            text-align: center;
            margin: 20px 0;
        }

        .qr-code {
            max-width: 200px;
            height: auto;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px;
            background: white;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }

        .stat-item {
            text-align: center;
            padding: 15px;
            background: #f7fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }

        .stat-value {
            font-size: 1.8rem;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 5px;
        }

        .stat-label {
            font-size: 0.9rem;
            color: #718096;
            font-weight: 500;
        }

        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }

        .status-online {
            background: #48bb78;
            box-shadow: 0 0 0 3px rgba(72, 187, 120, 0.3);
        }

        .status-offline {
            background: #f56565;
        }

        .instructions {
            background: white;
            border-radius: 16px;
            padding: 30px;
            margin-top: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .instructions h3 {
            color: #2d3748;
            margin-bottom: 20px;
            font-size: 1.3rem;
        }

        .instructions ol {
            padding-left: 20px;
        }

        .instructions li {
            margin-bottom: 10px;
            line-height: 1.6;
            color: #4a5568;
        }

        .alert {
            background: #fed7d7;
            border: 1px solid #feb2b2;
            color: #c53030;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }

        .alert-info {
            background: #bee3f8;
            border: 1px solid #90cdf4;
            color: #2b6cb0;
        }

        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .dashboard {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Custom Shadowsocket Proxy</h1>
            <p>安全的代理服务配置面板</p>
        </div>

        <div class="dashboard">
            <!-- 服务器状态 -->
            <div class="card">
                <div class="card-title">
                    <div class="icon">📊</div>
                    服务器状态
                </div>
                <div class="config-item">
                    <span class="config-label">服务状态</span>
                    <span class="config-value">
                        <span class="status-indicator status-online"></span>
                        运行中
                    </span>
                </div>
                <div class="stats-grid" id="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value" id="total-connections">-</div>
                        <div class="stat-label">总连接数</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="active-connections">-</div>
                        <div class="stat-label">活跃连接</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="data-transferred">-</div>
                        <div class="stat-label">数据传输</div>
                    </div>
                </div>
            </div>

            <!-- 服务器配置 -->
            <div class="card">
                <div class="card-title">
                    <div class="icon">⚙️</div>
                    服务器配置
                </div>
                <div class="config-item">
                    <span class="config-label">服务器地址</span>
                    <span class="config-value" id="server-host">加载中...</span>
                </div>
                <div class="config-item">
                    <span class="config-label">服务器端口</span>
                    <span class="config-value" id="server-port">加载中...</span>
                </div>
                <div class="config-item">
                    <span class="config-label">加密方法</span>
                    <span class="config-value" id="encryption-method">加载中...</span>
                </div>
                <div class="config-item">
                    <span class="config-label">密码</span>
                    <span class="config-value" id="server-password">加载中...</span>
                </div>
            </div>

            <!-- 客户端配置 -->
            <div class="card">
                <div class="card-title">
                    <div class="icon">📱</div>
                    客户端配置
                </div>
                <div class="config-item">
                    <span class="config-label">本地地址</span>
                    <span class="config-value" id="local-host">加载中...</span>
                </div>
                <div class="config-item">
                    <span class="config-label">本地端口</span>
                    <span class="config-value" id="local-port">加载中...</span>
                </div>
                <div class="config-item">
                    <span class="config-label">协议版本</span>
                    <span class="config-value" id="protocol-version">加载中...</span>
                </div>
            </div>
        </div>

        <!-- 连接字符串 -->
        <div class="card">
            <div class="card-title">
                <div class="icon">🔗</div>
                连接配置
            </div>
            
            <h4 style="margin-bottom: 15px; color: #4a5568;">Shadowsocks 连接字符串</h4>
            <div class="connection-string" id="ss-url">
                加载中...
                <button class="copy-btn" onclick="copyToClipboard('ss-url')">复制</button>
            </div>

            <h4 style="margin-bottom: 15px; color: #4a5568;">JSON 配置</h4>
            <div class="connection-string" id="json-config">
                加载中...
                <button class="copy-btn" onclick="copyToClipboard('json-config')">复制</button>
            </div>

            <div class="qr-container">
                <h4 style="margin-bottom: 15px; color: #4a5568;">二维码</h4>
                <img id="qr-code" class="qr-code" src="" alt="QR Code" style="display: none;">
            </div>
        </div>

        <!-- 使用说明 -->
        <div class="instructions">
            <h3>📖 使用说明</h3>
            
            <div class="alert alert-info">
                <strong>注意：</strong> 这是一个自定义协议的代理服务，与标准Shadowsocks不完全兼容。
            </div>

            <h4 style="margin: 20px 0 10px 0; color: #2d3748;">启动服务：</h4>
            <ol>
                <li>启动代理服务器：<code>npm run server</code></li>
                <li>启动本地客户端：<code>npm run client</code></li>
                <li>配置浏览器HTTP代理为 <code>127.0.0.1:1088</code></li>
            </ol>

            <h4 style="margin: 20px 0 10px 0; color: #2d3748;">客户端配置：</h4>
            <ol>
                <li>复制上方的连接字符串或JSON配置</li>
                <li>在支持的客户端中导入配置</li>
                <li>或扫描二维码快速配置</li>
            </ol>

            <div class="alert">
                <strong>安全提醒：</strong> 请妥善保管密码信息，不要在不安全的网络环境中传输配置。
            </div>
        </div>
    </div>

    <script>
        // 加载配置数据
        async function loadConfig() {
            try {
                const response = await fetch('/api/config');
                const config = await response.json();
                
                // 更新服务器配置
                document.getElementById('server-host').textContent = config.server.host;
                document.getElementById('server-port').textContent = config.server.port;
                document.getElementById('encryption-method').textContent = config.encryption.method;
                document.getElementById('server-password').textContent = config.server.password.substring(0, 8) + '...';
                
                // 更新客户端配置
                document.getElementById('local-host').textContent = config.client.localHost;
                document.getElementById('local-port').textContent = config.client.localPort;
                document.getElementById('protocol-version').textContent = config.protocol.version;
                
                // 生成连接字符串
                generateConnectionStrings(config);
                
                // 生成二维码
                generateQRCode(config);
                
            } catch (error) {
                console.error('Failed to load config:', error);
            }
        }

        // 生成连接字符串
        function generateConnectionStrings(config) {
            // Shadowsocks URL格式
            const method = config.encryption.method;
            const password = config.server.password;
            const host = config.server.host === '0.0.0.0' ? 'your-server-ip' : config.server.host;
            const port = config.server.port;
            
            const auth = btoa(method + ':' + password);
            const ssUrl = \`ss://\${auth}@\${host}:\${port}#CustomShadowsocket\`;
            
            document.getElementById('ss-url').innerHTML = \`
                \${ssUrl}
                <button class="copy-btn" onclick="copyToClipboard('ss-url')">复制</button>
            \`;
            
            // JSON配置
            const jsonConfig = {
                server: host,
                server_port: port,
                local_address: config.client.localHost,
                local_port: config.client.localPort,
                password: password,
                method: method,
                timeout: config.server.timeout / 1000,
                remarks: "Custom Shadowsocket Proxy"
            };
            
            document.getElementById('json-config').innerHTML = \`
                \${JSON.stringify(jsonConfig, null, 2)}
                <button class="copy-btn" onclick="copyToClipboard('json-config')">复制</button>
            \`;
        }

        // 生成二维码
        async function generateQRCode(config) {
            try {
                const method = config.encryption.method;
                const password = config.server.password;
                const host = config.server.host === '0.0.0.0' ? 'your-server-ip' : config.server.host;
                const port = config.server.port;
                
                const auth = btoa(method + ':' + password);
                const ssUrl = \`ss://\${auth}@\${host}:\${port}#CustomShadowsocket\`;
                
                const response = await fetch(\`/api/qrcode?data=\${encodeURIComponent(ssUrl)}\`);
                const blob = await response.blob();
                const qrUrl = URL.createObjectURL(blob);
                
                const qrImg = document.getElementById('qr-code');
                qrImg.src = qrUrl;
                qrImg.style.display = 'block';
            } catch (error) {
                console.error('Failed to generate QR code:', error);
            }
        }

        // 加载统计数据
        async function loadStats() {
            try {
                const response = await fetch('/api/stats');
                const stats = await response.json();
                
                document.getElementById('total-connections').textContent = stats.totalConnections || 0;
                document.getElementById('active-connections').textContent = stats.activeConnections || 0;
                document.getElementById('data-transferred').textContent = formatBytes(stats.bytesTransferred || 0);
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }

        // 复制到剪贴板
        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent.replace('复制', '').trim();
            
            navigator.clipboard.writeText(text).then(() => {
                const btn = element.querySelector('.copy-btn');
                const originalText = btn.textContent;
                btn.textContent = '已复制!';
                btn.style.background = '#48bb78';
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#667eea';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
            });
        }

        // 格式化字节数
        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // 页面加载完成后执行
        document.addEventListener('DOMContentLoaded', () => {
            loadConfig();
            loadStats();
            
            // 定期更新统计数据
            setInterval(loadStats, 5000);
        });
    </script>
</body>
</html>
    `;

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  }

  async serveConfig(res) {
    const configData = {
      server: {
        host: config.server.host,
        port: config.server.port,
        password: config.server.password,
        timeout: config.server.timeout
      },
      client: {
        localHost: config.client.localHost,
        localPort: config.client.localPort,
        serverHost: config.client.serverHost,
        serverPort: config.client.serverPort
      },
      encryption: config.encryption,
      protocol: config.protocol
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(configData, null, 2));
  }

  async serveQRCode(res, query) {
    try {
      const data = query.data || '';
      const qrCodeBuffer = await QRCode.toBuffer(data, {
        type: 'png',
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(qrCodeBuffer);
    } catch (error) {
      this.serve500(res, error.message);
    }
  }

  async serveStats(res) {
    // 这里可以从实际的服务器实例获取统计数据
    // 目前返回模拟数据
    const stats = {
      totalConnections: Math.floor(Math.random() * 1000),
      activeConnections: Math.floor(Math.random() * 50),
      bytesTransferred: Math.floor(Math.random() * 1024 * 1024 * 100),
      uptime: Date.now() - (Math.random() * 86400000),
      serverStatus: 'online'
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
  }

  serve404(res) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }

  serve500(res, message) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`500 Internal Server Error: ${message}`);
  }
}

// 启动Web服务器
const webServer = new WebServer();
webServer.start();