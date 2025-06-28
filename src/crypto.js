const crypto = require('crypto');

class CustomCrypto {
  constructor(password) {
    this.password = password;
    this.key = this.deriveKey(password);
    this.algorithm = 'aes-128-gcm';
    this.keySize = 16; // 128 bits
    this.ivSize = 12;  // 96 bits for GCM
    this.tagSize = 16; // 128 bits authentication tag
  }

  // 密钥派生函数 - 使用PBKDF2
  deriveKey(password) {
    const salt = Buffer.from('custom-salt-2025', 'utf8');
    return crypto.pbkdf2Sync(password, salt, 10000, this.keySize, 'sha256');
  }

  // 生成随机IV (GCM使用96位IV)
  generateIV() {
    return crypto.randomBytes(this.ivSize);
  }

  // AES-128-GCM加密
  encrypt(data, iv = null) {
    if (!iv) {
      iv = this.generateIV();
    }
    
    const cipher = crypto.createCipherGCM(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(data);
    cipher.final();
    
    const authTag = cipher.getAuthTag();
    
    return { 
      encrypted, 
      iv, 
      authTag 
    };
  }

  // AES-128-GCM解密
  decrypt(encryptedData, iv, authTag) {
    try {
      const decipher = crypto.createDecipherGCM(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedData);
      decipher.final();
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // 为了保持向后兼容，保留MAC相关方法但标记为已弃用
  generateMAC(data, iv) {
    // GCM模式已包含认证，此方法仅用于兼容性
    const hmac = crypto.createHmac('sha256', this.key);
    hmac.update(Buffer.concat([data, iv]));
    return hmac.digest().slice(0, 8);
  }

  verifyMAC(data, iv, expectedMAC) {
    // GCM模式已包含认证，此方法仅用于兼容性
    const calculatedMAC = this.generateMAC(data, iv);
    return calculatedMAC.equals(expectedMAC);
  }

  // 新的加密方法，返回完整的加密包
  encryptPacket(data) {
    const iv = this.generateIV();
    const { encrypted, authTag } = this.encrypt(data, iv);
    
    // 数据包格式: IV(12) + AuthTag(16) + EncryptedData(N)
    return Buffer.concat([iv, authTag, encrypted]);
  }

  // 新的解密方法，解析完整的加密包
  decryptPacket(encryptedPacket) {
    if (encryptedPacket.length < this.ivSize + this.tagSize) {
      throw new Error('Invalid encrypted packet: too short');
    }

    const iv = encryptedPacket.slice(0, this.ivSize);
    const authTag = encryptedPacket.slice(this.ivSize, this.ivSize + this.tagSize);
    const encryptedData = encryptedPacket.slice(this.ivSize + this.tagSize);

    return this.decrypt(encryptedData, iv, authTag);
  }
}

module.exports = CustomCrypto;