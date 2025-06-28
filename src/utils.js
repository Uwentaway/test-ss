// 工具函数
function logWithTime(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isValidIPv4(ip) {
  const parts = ip.split('.');
  return parts.length === 4 && parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255 && part === num.toString();
  });
}

function isValidPort(port) {
  const num = parseInt(port, 10);
  return num >= 1 && num <= 65535;
}

function generateRandomId() {
  return Math.floor(Math.random() * 0xFFFFFFFF);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  logWithTime,
  formatBytes,
  isValidIPv4,
  isValidPort,
  generateRandomId,
  sleep
};