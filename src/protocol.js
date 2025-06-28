const config = require('./config');

class CustomProtocol {
  constructor() {
    this.version = config.protocol.version;
    this.headerSize = config.protocol.headerSize;
  }

  // 创建连接请求包
  createConnectRequest(host, port, userId = 0) {
    const hostBuffer = Buffer.from(host, 'utf8');
    const hostLength = hostBuffer.length;
    
    // 自定义协议头：版本(1) + 命令(1) + 用户ID(4) + 时间戳(8) + 主机长度(2) + 端口(2) + 保留(6)
    const header = Buffer.alloc(this.headerSize);
    let offset = 0;
    
    header.writeUInt8(this.version, offset); offset += 1;
    header.writeUInt8(config.protocol.commandConnect, offset); offset += 1;
    header.writeUInt32BE(userId, offset); offset += 4;
    header.writeBigUInt64BE(BigInt(Date.now()), offset); offset += 8;
    header.writeUInt16BE(hostLength, offset); offset += 2;
    header.writeUInt16BE(port, offset); offset += 2;
    // 保留字段填充随机数据
    require('crypto').randomFillSync(header, offset, 6);
    
    return Buffer.concat([header, hostBuffer]);
  }

  // 解析连接请求
  parseConnectRequest(data) {
    if (data.length < this.headerSize) {
      throw new Error('Invalid request: header too short');
    }
    
    let offset = 0;
    const version = data.readUInt8(offset); offset += 1;
    const command = data.readUInt8(offset); offset += 1;
    const userId = data.readUInt32BE(offset); offset += 4;
    const timestamp = data.readBigUInt64BE(offset); offset += 8;
    const hostLength = data.readUInt16BE(offset); offset += 2;
    const port = data.readUInt16BE(offset); offset += 2;
    offset += 6; // 跳过保留字段
    
    if (version !== this.version) {
      throw new Error(`Unsupported protocol version: ${version}`);
    }
    
    if (data.length < this.headerSize + hostLength) {
      throw new Error('Invalid request: incomplete host data');
    }
    
    const host = data.slice(this.headerSize, this.headerSize + hostLength).toString('utf8');
    
    // 时间戳验证（防重放攻击）
    const now = BigInt(Date.now());
    const timeDiff = now - timestamp;
    if (timeDiff > 300000n || timeDiff < -300000n) { // 5分钟时间窗口
      throw new Error('Request timestamp out of valid range');
    }
    
    return { version, command, userId, timestamp, host, port };
  }

  // 创建响应包
  createResponse(status, message = '') {
    const messageBuffer = Buffer.from(message, 'utf8');
    const responseHeader = Buffer.alloc(8);
    
    responseHeader.writeUInt8(this.version, 0);
    responseHeader.writeUInt8(status, 1);
    responseHeader.writeUInt16BE(messageBuffer.length, 2);
    responseHeader.writeUInt32BE(Date.now() & 0xFFFFFFFF, 4);
    
    return Buffer.concat([responseHeader, messageBuffer]);
  }

  // 解析响应包
  parseResponse(data) {
    if (data.length < 8) {
      throw new Error('Invalid response: too short');
    }
    
    const version = data.readUInt8(0);
    const status = data.readUInt8(1);
    const messageLength = data.readUInt16BE(2);
    const timestamp = data.readUInt32BE(4);
    
    if (version !== this.version) {
      throw new Error(`Unsupported response version: ${version}`);
    }
    
    let message = '';
    if (messageLength > 0 && data.length >= 8 + messageLength) {
      message = data.slice(8, 8 + messageLength).toString('utf8');
    }
    
    return { version, status, message, timestamp };
  }

  // 数据包装（添加长度前缀）
  wrapData(data) {
    const lengthPrefix = Buffer.alloc(4);
    lengthPrefix.writeUInt32BE(data.length, 0);
    return Buffer.concat([lengthPrefix, data]);
  }

  // 数据解包
  unwrapData(data) {
    if (data.length < 4) {
      return null;
    }
    
    const expectedLength = data.readUInt32BE(0);
    if (data.length < 4 + expectedLength) {
      return null; // 数据不完整
    }
    
    return {
      data: data.slice(4, 4 + expectedLength),
      remaining: data.slice(4 + expectedLength)
    };
  }
}

module.exports = CustomProtocol;