const net = require('net');
const CustomCrypto = require('./crypto');
const CustomProtocol = require('./protocol');
const config = require('./config');
const { logWithTime, formatBytes } = require('./utils');

class ProxyServer {
  constructor() {
    this.crypto = new CustomCrypto(config.server.password);
    this.protocol = new CustomProtocol();
    this.connections = new Map();
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      bytesTransferred: 0
    };
  }

  start() {
    const server = net.createServer((clientSocket) => {
      this.handleClientConnection(clientSocket);
    });

    server.listen(config.server.port, config.server.host, () => {
      logWithTime(`Custom Proxy Server listening on ${config.server.host}:${config.server.port}`);
      logWithTime(`Server started with password: ${config.server.password.substring(0, 8)}...`);
    });

    server.on('error', (err) => {
      logWithTime(`Server error: ${err.message}`);
    });

    // 定期输出统计信息
    setInterval(() => {
      logWithTime(`Stats - Total: ${this.stats.totalConnections}, Active: ${this.stats.activeConnections}, Data: ${formatBytes(this.stats.bytesTransferred)}`);
    }, 30000);
  }

  async handleClientConnection(clientSocket) {
    const connectionId = Date.now() + Math.random();
    this.connections.set(connectionId, { client: clientSocket, target: null });
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    logWithTime(`New client connection from ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);

    let buffer = Buffer.alloc(0);
    let authenticated = false;
    let targetSocket = null;

    clientSocket.on('data', async (data) => {
      try {
        buffer = Buffer.concat([buffer, data]);

        if (!authenticated) {
          // 处理认证和连接请求
          const result = this.protocol.unwrapData(buffer);
          if (!result) return; // 数据不完整，等待更多数据

          buffer = result.remaining;
          
          // 解密请求数据
          const decryptedData = await this.decryptClientData(result.data);
          if (!decryptedData) {
            clientSocket.destroy();
            return;
          }

          // 解析连接请求
          const request = this.protocol.parseConnectRequest(decryptedData);
          logWithTime(`Connection request: ${request.host}:${request.port} from user ${request.userId}`);

          // 建立目标连接
          targetSocket = net.createConnection(request.port, request.host);
          this.connections.get(connectionId).target = targetSocket;

          targetSocket.on('connect', () => {
            logWithTime(`Connected to target: ${request.host}:${request.port}`);
            authenticated = true;
            
            // 发送成功响应
            const response = this.protocol.createResponse(config.protocol.statusSuccess, 'Connected');
            const encryptedResponse = this.encryptServerData(response);
            const wrappedResponse = this.protocol.wrapData(encryptedResponse);
            clientSocket.write(wrappedResponse);
          });

          targetSocket.on('data', (targetData) => {
            // 转发目标服务器数据到客户端
            const encryptedData = this.encryptServerData(targetData);
            const wrappedData = this.protocol.wrapData(encryptedData);
            clientSocket.write(wrappedData);
            this.stats.bytesTransferred += targetData.length;
          });

          targetSocket.on('close', () => {
            logWithTime(`Target connection closed for ${request.host}:${request.port}`);
            clientSocket.destroy();
          });

          targetSocket.on('error', (err) => {
            logWithTime(`Target connection error: ${err.message}`);
            const response = this.protocol.createResponse(config.protocol.statusError, err.message);
            const encryptedResponse = this.encryptServerData(response);
            const wrappedResponse = this.protocol.wrapData(encryptedResponse);
            clientSocket.write(wrappedResponse);
            clientSocket.destroy();
          });

        } else {
          // 已认证，处理数据转发
          while (buffer.length > 0) {
            const result = this.protocol.unwrapData(buffer);
            if (!result) break;

            buffer = result.remaining;
            const decryptedData = this.decryptClientData(result.data);
            if (decryptedData && targetSocket) {
              targetSocket.write(decryptedData);
              this.stats.bytesTransferred += decryptedData.length;
            }
          }
        }
      } catch (error) {
        logWithTime(`Error handling client data: ${error.message}`);
        clientSocket.destroy();
      }
    });

    clientSocket.on('close', () => {
      logWithTime(`Client connection closed`);
      this.connections.delete(connectionId);
      this.stats.activeConnections--;
      if (targetSocket) {
        targetSocket.destroy();
      }
    });

    clientSocket.on('error', (err) => {
      logWithTime(`Client connection error: ${err.message}`);
      this.connections.delete(connectionId);
      this.stats.activeConnections--;
      if (targetSocket) {
        targetSocket.destroy();
      }
    });

    // 连接超时处理
    clientSocket.setTimeout(config.server.timeout, () => {
      logWithTime(`Client connection timeout`);
      clientSocket.destroy();
    });
  }

  decryptClientData(encryptedData) {
    try {
      if (encryptedData.length < 24) { // IV(16) + MAC(8)
        return null;
      }

      const iv = encryptedData.slice(0, 16);
      const mac = encryptedData.slice(16, 24);
      const ciphertext = encryptedData.slice(24);

      // 验证MAC
      if (!this.crypto.verifyMAC(ciphertext, iv, mac)) {
        logWithTime('MAC verification failed');
        return null;
      }

      return this.crypto.decrypt(ciphertext, iv);
    } catch (error) {
      logWithTime(`Decryption error: ${error.message}`);
      return null;
    }
  }

  encryptServerData(data) {
    const { encrypted, iv } = this.crypto.encrypt(data);
    const mac = this.crypto.generateMAC(encrypted, iv);
    return Buffer.concat([iv, mac, encrypted]);
  }
}

// 启动服务器
const server = new ProxyServer();
server.start();