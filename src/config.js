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
    method: 'aes-128-gcm', // 使用AES-128-GCM加密
    keySize: 16,  // 128 bits
    ivSize: 12,   // 96 bits for GCM
    tagSize: 16   // 128 bits authentication tag
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