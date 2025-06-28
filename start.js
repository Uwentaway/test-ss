#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Environment variables with defaults
const config = {
  SERVER_HOST: process.env.SERVER_HOST || '0.0.0.0',
  SERVER_PORT: process.env.SERVER_PORT || '8388',
  CLIENT_LOCAL_HOST: process.env.CLIENT_LOCAL_HOST || '127.0.0.1',
  CLIENT_LOCAL_PORT: process.env.CLIENT_LOCAL_PORT || '1088',
  WEB_PORT: process.env.WEB_PORT || '3000',
  PROXY_PASSWORD: process.env.PROXY_PASSWORD || 'd2659a2f3239b815cf53bf7b34104cf5',
  NODE_ENV: process.env.NODE_ENV || 'development'
};

// Set environment variables for child processes
Object.keys(config).forEach(key => {
  process.env[key] = config[key];
});

console.log('🛡️  Custom Shadowsocket Proxy Starting...');
console.log('📊 Configuration:');
Object.keys(config).forEach(key => {
  if (key === 'PROXY_PASSWORD') {
    console.log(`   ${key}: ${'*'.repeat(config[key].length)}`);
  } else {
    console.log(`   ${key}: ${config[key]}`);
  }
});

const mode = process.argv[2] || 'all';
const processes = [];

function startProcess(name, scriptPath, description) {
  console.log(`🚀 Starting ${description}...`);
  
  const child = spawn('node', [scriptPath], {
    stdio: 'inherit',
    env: process.env
  });

  child.on('error', (err) => {
    console.error(`❌ Error starting ${name}:`, err.message);
  });

  child.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error(`❌ ${name} exited with code ${code} (signal: ${signal})`);
    } else {
      console.log(`✅ ${name} exited gracefully`);
    }
  });

  processes.push({ name, child });
  return child;
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down services...');
  processes.forEach(({ name, child }) => {
    console.log(`   Stopping ${name}...`);
    child.kill('SIGTERM');
  });
  
  setTimeout(() => {
    console.log('✅ All services stopped');
    process.exit(0);
  }, 2000);
});

// Start services based on mode
switch (mode) {
  case 'server':
    startProcess('Server', path.join(__dirname, 'src', 'server.js'), 'Proxy Server');
    break;
    
  case 'client':
    startProcess('Client', path.join(__dirname, 'src', 'client.js'), 'Proxy Client');
    break;
    
  case 'web':
    startProcess('Web', path.join(__dirname, 'src', 'web-server.js'), 'Web Interface');
    break;
    
  case 'all':
  default:
    console.log('🔄 Starting all services...');
    startProcess('Server', path.join(__dirname, 'src', 'server.js'), 'Proxy Server');
    
    // Wait a bit before starting client
    setTimeout(() => {
      startProcess('Client', path.join(__dirname, 'src', 'client.js'), 'Proxy Client');
    }, 1000);
    
    // Wait a bit more before starting web interface
    setTimeout(() => {
      startProcess('Web', path.join(__dirname, 'src', 'web-server.js'), 'Web Interface');
      
      setTimeout(() => {
        console.log('\n✅ All services started successfully!');
        console.log('📊 Access points:');
        console.log(`   🌐 Web Interface: http://localhost:${config.WEB_PORT}`);
        console.log(`   🖥️  Proxy Server: ${config.SERVER_HOST}:${config.SERVER_PORT}`);
        console.log(`   📱 Local Client: ${config.CLIENT_LOCAL_HOST}:${config.CLIENT_LOCAL_PORT}`);
        console.log('\n💡 Press Ctrl+C to stop all services');
      }, 1000);
    }, 2000);
    break;
}