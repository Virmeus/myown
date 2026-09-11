#!/usr/bin/env node

/**
 * AdminPanel - Start Script
 * Запускает бэкенд сервер на порту 3001
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Запуск AdminPanel сервера...\n');

const server = spawn('node', [path.join(__dirname, 'server', 'index.js')], {
  stdio: 'inherit',
  env: { ...process.env }
});

server.on('error', (err) => {
  console.error('❌ Ошибка запуска сервера:', err.message);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Сервер завершился с кодом ${code}`);
  }
  process.exit(code);
});

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('\n👋 Остановка сервера...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});
