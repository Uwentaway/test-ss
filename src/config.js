// 配置文件
const config = {
  server: {
    host: '0.0.0.0',
    port: 8388,
    password: 'd2659a2f3239b815cf53bf7b34104cf5',
    timeout: 30000,
    maxConnections: 1000
  },
  client: {
    localHost: '127.0.0.1',
    localPort: 1088,
    serverHost: '0.0.0.0',
    serverPort: 8388,
    password: 'd2659a2f3239b815cf53bf7b34104cf5',
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
  },
  web: {
    host: '0.0.0.0',
    port: 3000,
    title: 'Custom Shadowsocket Proxy'
  }
};

module.exports = config;