const net = require('net');
const CustomCrypto = require('./crypto');
const CustomProtocol = require('./protocol');
const config = require('./config');
const { logWithTime, formatBytes } = require('./utils');

class ProxyClient {
  constructor() {
    this.crypto = new CustomCrypto(config.client.password);
    this.protocol = new CustomProtocol();
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      bytesTransferred: 0
    };
  }

  start() {
    const server = net.createServer((localSocket) => {
      this.handleLocalConnection(localSocket);
    });

    server.listen(config.client.localPort, config.client.localHost, () => {
      logWithTime(`Proxy Client listening on ${config.client.localHost}:${config.client.localPort}`);
      logWithTime(`Using AES-128-GCM encryption`);
      logWithTime(`Forwarding to server: ${config.client.serverHost}:${config.client.serverPort}`);
    });

    server.on('error', (err) => {
      logWithTime(`Client server error: ${err.message}`);
    });

    // 定期输出统计信息
    setInterval(() => {
      logWithTime(`Stats - Total: ${this.stats.totalConnections}, Active: ${this.stats.activeConnections}, Data: ${formatBytes(this.stats.bytesTransferred)}`);
    }, 30000);
  }

  async handleLocalConnection(localSocket) {
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    logWithTime(`New local connection from ${localSocket.remoteAddress}:${localSocket.remotePort}`);

    // 解析本地HTTP请求以获取目标地址
    let firstRequest = true;
    let targetHost = '';
    let targetPort = 80;
    let serverSocket = null;
    let buffer = Buffer.alloc(0);
    let authenticated = false;

    localSocket.on('data', async (data) => {
      try {
        if (firstRequest) {
          // 解析HTTP请求头获取目标地址
          const request = data.toString();
          const hostMatch = request.match(/Host: ([^\r\n]+)/i);
          
          if (hostMatch) {
            const hostHeader = hostMatch[1];
            const [host, port] = hostHeader.split(':');
            targetHost = host;
            targetPort = parseInt(port) || (request.startsWith('CONNECT') ? 443 : 80);
          } else {
            // 尝试从URL中提取主机名
            const urlMatch = request.match(/^(?:GET|POST|PUT|DELETE|HEAD|OPTIONS) (?:https?:\/\/)?([^\/\s:]+)(?::(\d+))?/);
            if (urlMatch) {
              targetHost = urlMatch[1];
              targetPort = parseInt(urlMatch[2]) || 80;
            }
          }

          if (!targetHost) {
            logWithTime('Could not extract target host from request');
            localSocket.destroy();
            return;
          }

          logWithTime(`Extracted target: ${targetHost}:${targetPort}`);

          // 连接到代理服务器
          serverSocket = net.createConnection(config.client.serverPort, config.client.serverHost);

          serverSocket.on('connect', async () => {
            logWithTime(`Connected to proxy server`);
            
            // 发送连接请求
            const connectRequest = this.protocol.createConnectRequest(targetHost, targetPort, 1001);
            const encryptedRequest = this.encryptClientData(connectRequest);
            const wrappedRequest = this.protocol.wrapData(encryptedRequest);
            serverSocket.write(wrappedRequest);
          });

          let serverBuffer = Buffer.alloc(0);

          serverSocket.on('data', (serverData) => {
            try {
              serverBuffer = Buffer.concat([serverBuffer, serverData]);

              if (!authenticated) {
                // 处理服务器响应
                const result = this.protocol.unwrapData(serverBuffer);
                if (!result) return;

                serverBuffer = result.remaining;
                const decryptedResponse = this.decryptServerData(result.data);
                if (!decryptedResponse) {
                  localSocket.destroy();
                  return;
                }

                const response = this.protocol.parseResponse(decryptedResponse);
                if (response.status === config.protocol.statusSuccess) {
                  logWithTime(`Connection established: ${response.message}`);
                  authenticated = true;
                  
                  // 如果是CONNECT请求，发送200响应
                  if (request.startsWith('CONNECT')) {
                    localSocket.write('HTTP/1.1 200 Connection established\r\n\r\n');
                  } else {
                    // 转发原始HTTP请求
                    const encryptedData = this.encryptClientData(data);
                    const wrappedData = this.protocol.wrapData(encryptedData);
                    serverSocket.write(wrappedData);
                  }
                } else {
                  logWithTime(`Connection failed: ${response.message}`);
                  localSocket.destroy();
                }
              } else {
                // 已认证，转发服务器数据
                while (serverBuffer.length > 0) {
                  const result = this.protocol.unwrapData(serverBuffer);
                  if (!result) break;

                  serverBuffer = result.remaining;
                  const decryptedData = this.decryptServerData(result.data);
                  if (decryptedData) {
                    localSocket.write(decryptedData);
                    this.stats.bytesTransferred += decryptedData.length;
                  }
                }
              }
            } catch (error) {
              logWithTime(`Error processing server data: ${error.message}`);
              localSocket.destroy();
            }
          });

          serverSocket.on('close', () => {
            logWithTime(`Server connection closed`);
            localSocket.destroy();
          });

          serverSocket.on('error', (err) => {
            logWithTime(`Server connection error: ${err.message}`);
            localSocket.destroy();
          });

          firstRequest = false;

          // 如果不是CONNECT请求，需要转发数据
          if (!request.startsWith('CONNECT')) {
            // 等待认证完成后再发送数据
            return;
          }
        } else if (authenticated && serverSocket) {
          // 转发本地数据到服务器
          const encryptedData = this.encryptClientData(data);
          const wrappedData = this.protocol.wrapData(encryptedData);
          serverSocket.write(wrappedData);
          this.stats.bytesTransferred += data.length;
        }
      } catch (error) {
        logWithTime(`Error handling local data: ${error.message}`);
        localSocket.destroy();
      }
    });

    localSocket.on('close', () => {
      logWithTime(`Local connection closed`);
      this.stats.activeConnections--;
      if (serverSocket) {
        serverSocket.destroy();
      }
    });

    localSocket.on('error', (err) => {
      logWithTime(`Local connection error: ${err.message}`);
      this.stats.activeConnections--;
      if (serverSocket) {
        serverSocket.destroy();
      }
    });

    localSocket.setTimeout(config.client.timeout, () => {
      logWithTime(`Local connection timeout`);
      localSocket.destroy();
    });
  }

  encryptClientData(data) {
    // 使用新的AES-GCM加密方法
    return this.crypto.encryptPacket(data);
  }

  decryptServerData(encryptedData) {
    try {
      // 使用新的AES-GCM解密方法
      return this.crypto.decryptPacket(encryptedData);
    } catch (error) {
      logWithTime(`Decryption error: ${error.message}`);
      return null;
    }
  }
}

// 启动客户端
const client = new ProxyClient();
client.start();