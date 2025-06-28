const net = require('net');
const http = require('http');
const { logWithTime } = require('../src/utils');

class ProxyTester {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  addTest(name, testFunction) {
    this.tests.push({ name, testFunction });
  }

  async runAllTests() {
    logWithTime('Starting proxy service tests...');
    
    for (const test of this.tests) {
      try {
        logWithTime(`Running test: ${test.name}`);
        const startTime = Date.now();
        
        await test.testFunction();
        
        const duration = Date.now() - startTime;
        this.results.push({ name: test.name, status: 'PASSED', duration });
        logWithTime(`✅ ${test.name} - PASSED (${duration}ms)`);
      } catch (error) {
        this.results.push({ name: test.name, status: 'FAILED', error: error.message });
        logWithTime(`❌ ${test.name} - FAILED: ${error.message}`);
      }
    }

    this.printSummary();
  }

  printSummary() {
    logWithTime('\n=== Test Summary ===');
    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    
    logWithTime(`Total tests: ${this.results.length}`);
    logWithTime(`Passed: ${passed}`);
    logWithTime(`Failed: ${failed}`);
    
    if (failed > 0) {
      logWithTime('\nFailed tests:');
      this.results
        .filter(r => r.status === 'FAILED')
        .forEach(r => logWithTime(`  - ${r.name}: ${r.error}`));
    }
  }

  // 测试TCP连接
  async testTCPConnection() {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(1088, '127.0.0.1');
      
      socket.on('connect', () => {
        socket.destroy();
        resolve();
      });
      
      socket.on('error', (err) => {
        reject(new Error(`TCP connection failed: ${err.message}`));
      });
      
      setTimeout(() => {
        socket.destroy();
        reject(new Error('TCP connection timeout'));
      }, 5000);
    });
  }

  // 测试HTTP代理
  async testHTTPProxy() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: 1088,
        path: 'http://httpbin.org/ip',
        method: 'GET',
        headers: {
          'Host': 'httpbin.org',
          'User-Agent': 'ProxyTester/1.0'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              if (response.origin) {
                resolve();
              } else {
                reject(new Error('Invalid response format'));
              }
            } catch (error) {
              reject(new Error(`Failed to parse response: ${error.message}`));
            }
          } else {
            reject(new Error(`HTTP error: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(new Error(`HTTP request failed: ${err.message}`));
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('HTTP request timeout'));
      });

      req.end();
    });
  }

  // 测试HTTPS代理
  async testHTTPSProxy() {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(1088, '127.0.0.1');
      
      socket.on('connect', () => {
        // 发送CONNECT请求
        const connectRequest = 'CONNECT httpbin.org:443 HTTP/1.1\r\nHost: httpbin.org:443\r\n\r\n';
        socket.write(connectRequest);
      });

      socket.on('data', (data) => {
        const response = data.toString();
        if (response.includes('200 Connection established')) {
          socket.destroy();
          resolve();
        } else {
          socket.destroy();
          reject(new Error(`HTTPS CONNECT failed: ${response}`));
        }
      });

      socket.on('error', (err) => {
        reject(new Error(`HTTPS connection failed: ${err.message}`));
      });

      setTimeout(() => {
        socket.destroy();
        reject(new Error('HTTPS connection timeout'));
      }, 10000);
    });
  }

  // 测试AES-GCM加密功能
  async testEncryption() {
    const CustomCrypto = require('../src/crypto');
    const crypto = new CustomCrypto('test-password');
    
    const testData = Buffer.from('Hello, World! This is a test message for AES-128-GCM encryption.');
    
    // 测试新的加密/解密方法
    const encryptedPacket = crypto.encryptPacket(testData);
    const decrypted = crypto.decryptPacket(encryptedPacket);
    
    if (!testData.equals(decrypted)) {
      throw new Error('AES-GCM encryption/decryption test failed');
    }
    
    // 测试单独的加密/解密方法
    const iv = crypto.generateIV();
    const { encrypted, authTag } = crypto.encrypt(testData, iv);
    const decrypted2 = crypto.decrypt(encrypted, iv, authTag);
    
    if (!testData.equals(decrypted2)) {
      throw new Error('AES-GCM separate encryption/decryption test failed');
    }
    
    // 测试认证失败情况
    try {
      const tamperedData = Buffer.from(encrypted);
      tamperedData[0] ^= 0xFF; // 篡改数据
      crypto.decrypt(tamperedData, iv, authTag);
      throw new Error('Authentication should have failed');
    } catch (error) {
      if (!error.message.includes('Decryption failed')) {
        throw error;
      }
    }
    
    logWithTime('AES-128-GCM encryption tests passed');
  }

  // 测试协议解析
  async testProtocol() {
    const CustomProtocol = require('../src/protocol');
    const protocol = new CustomProtocol();
    
    // 测试连接请求
    const request = protocol.createConnectRequest('example.com', 443, 1001);
    const parsed = protocol.parseConnectRequest(request);
    
    if (parsed.host !== 'example.com' || parsed.port !== 443 || parsed.userId !== 1001) {
      throw new Error('Protocol parsing test failed');
    }
    
    // 测试响应
    const response = protocol.createResponse(0, 'Success');
    const parsedResponse = protocol.parseResponse(response);
    
    if (parsedResponse.status !== 0 || parsedResponse.message !== 'Success') {
      throw new Error('Protocol response test failed');
    }
    
    logWithTime('Protocol parsing tests passed');
  }

  // 测试密钥派生
  async testKeyDerivation() {
    const CustomCrypto = require('../src/crypto');
    
    const crypto1 = new CustomCrypto('test-password');
    const crypto2 = new CustomCrypto('test-password');
    const crypto3 = new CustomCrypto('different-password');
    
    // 相同密码应该生成相同密钥
    if (!crypto1.key.equals(crypto2.key)) {
      throw new Error('Same password should generate same key');
    }
    
    // 不同密码应该生成不同密钥
    if (crypto1.key.equals(crypto3.key)) {
      throw new Error('Different passwords should generate different keys');
    }
    
    logWithTime('Key derivation tests passed');
  }
}

// 运行测试
async function runTests() {
  const tester = new ProxyTester();
  
  // 添加测试用例
  tester.addTest('AES-GCM Encryption/Decryption', () => tester.testEncryption());
  tester.addTest('Key Derivation', () => tester.testKeyDerivation());
  tester.addTest('Protocol Parsing', () => tester.testProtocol());
  tester.addTest('TCP Connection', () => tester.testTCPConnection());
  
  // 注意：HTTP和HTTPS测试需要代理服务运行
  // tester.addTest('HTTP Proxy', () => tester.testHTTPProxy());
  // tester.addTest('HTTPS Proxy', () => tester.testHTTPSProxy());
  
  await tester.runAllTests();
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = ProxyTester;