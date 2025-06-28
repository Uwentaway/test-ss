// 配置文件
const config = {
  server: {
    host: '127.0.0.1',
    port: 8388,
    password: 'custom-proxy-key-2025',
    timeout: 30000,
    maxConnections: 1000
  },
  client: {
    localHost: '127.0.0.1',
    localPort: 1088,
    serverHost: '127.0.0.1',
    serverPort: 8388,
    password: 'custom-proxy-key-2025',
    timeout: 30000
  },
  encryption: {
    method: 'xor-advanced', // 自定义加密方法
    keySize: 32,
    ivSize: 16
  },
  protocol: {
    version: 1,
    headerSize: 24,
    commandConnect: 0x01,
    commandBind: 0x02,
    commandUdp: 0x03,
    statusSuccess: 0x00,
    statusError: 0x01
  }
};

module.exports = config;