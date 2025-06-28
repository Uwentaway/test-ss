const crypto = require('crypto');

class CustomCrypto {
  constructor(password) {
    this.password = password;
    this.key = this.deriveKey(password);
  }

  // 自定义密钥派生函数
  deriveKey(password) {
    const hash = crypto.createHash('sha256');
    hash.update(password + 'custom-salt-2025');
    return hash.digest();
  }

  // 生成随机IV
  generateIV() {
    return crypto.randomBytes(16);
  }

  // 自定义XOR加密（增强版）
  encrypt(data, iv = null) {
    if (!iv) {
      iv = this.generateIV();
    }
    
    const encrypted = Buffer.alloc(data.length);
    const keyHash = crypto.createHash('sha256');
    keyHash.update(Buffer.concat([this.key, iv]));
    const expandedKey = keyHash.digest();
    
    // 多轮XOR加密
    for (let i = 0; i < data.length; i++) {
      let keyByte = expandedKey[i % expandedKey.length];
      // 基于位置的密钥变换
      keyByte ^= (i & 0xFF);
      // 基于前一个字节的链式加密
      if (i > 0) {
        keyByte ^= encrypted[i - 1];
      }
      encrypted[i] = data[i] ^ keyByte;
    }
    
    return { encrypted, iv };
  }

  // 自定义XOR解密
  decrypt(encryptedData, iv) {
    const decrypted = Buffer.alloc(encryptedData.length);
    const keyHash = crypto.createHash('sha256');
    keyHash.update(Buffer.concat([this.key, iv]));
    const expandedKey = keyHash.digest();
    
    // 多轮XOR解密
    for (let i = 0; i < encryptedData.length; i++) {
      let keyByte = expandedKey[i % expandedKey.length];
      keyByte ^= (i & 0xFF);
      if (i > 0) {
        keyByte ^= encryptedData[i - 1];
      }
      decrypted[i] = encryptedData[i] ^ keyByte;
    }
    
    return decrypted;
  }

  // 数据完整性校验
  generateMAC(data, iv) {
    const hmac = crypto.createHmac('sha256', this.key);
    hmac.update(Buffer.concat([data, iv]));
    return hmac.digest().slice(0, 8); // 8字节MAC
  }

  verifyMAC(data, iv, expectedMAC) {
    const calculatedMAC = this.generateMAC(data, iv);
    return calculatedMAC.equals(expectedMAC);
  }
}

module.exports = CustomCrypto;