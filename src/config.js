// 配置文件
const config = {
  server: {
    host: process.env.SERVER_HOST || '0.0.0.0',
    port: parseInt(process.env.SERVER_PORT) || 8388,
    password: process.env.PROXY_PASSWORD || 'd2659a2f3239b815cf53bf7b34104cf5',
    timeout: 30000,
    maxConnections: 1000
  },
  client: {
    localHost: process.env.CLIENT_LOCAL_HOST || '127.0.0.1',
    localPort: parseInt(process.env.CLIENT_LOCAL_PORT) || 1088,
    serverHost: process.env.SERVER_HOST || '0.0.0.0',
    serverPort: parseInt(process.env.SERVER_PORT) || 8388,
    password: process.env.PROXY_PASSWORD || 'd2659a2f3239b815cf53bf7b34104cf5',
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
    host: process.env.WEB_HOST || '0.0.0.0',
    port: parseInt(process.env.WEB_PORT) || 3000,
    title: 'Custom Shadowsocket Proxy'
  }
};

module.exports = config;