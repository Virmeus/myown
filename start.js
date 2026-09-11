#!/usr/bin/env node

/**
 * AdminPanel - Start Script
 * Автоматически собирает фронтенд и запускает сервер
 * Запуск: node start.js
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const distPath = path.join(__dirname, 'dist');
const needsBuild = !fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'));

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║        🛡️  AdminPanel v2.0               ║');
console.log('║   Node.js + Express + SQLite + React     ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');

// Шаг 1: Сборка фронтенда (если нужно)
if (needsBuild) {
  console.log('📦 Сборка фронтенда...');
  try {
    execSync('npm run build', { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    console.log('✅ Фронтенд собран\n');
  } catch (err) {
    console.error('❌ Ошибка сборки фронтенда');
    process.exit(1);
  }
} else {
  console.log('✅ Фронтенд уже собран (dist/)\n');
}

// Шаг 2: Создание директорий для данных
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads');
const mediaDir = path.join(dataDir, 'media');

[dataDir, uploadsDir, mediaDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Шаг 3: Запуск сервера
console.log('🚀 Запуск сервера...\n');

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
    console.error(`\n❌ Сервер завершился с кодом ${code}`);
  }
  process.exit(code || 0);
});

// Обработка сигналов завершения
process.on('SIGINT', () => {
  console.log('\n\n👋 Остановка сервера...');
  server.kill('SIGINT');
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1000);
});
