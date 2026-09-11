import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distPath = join(__dirname, 'dist');
const needsBuild = !existsSync(distPath) || !existsSync(join(distPath, 'index.html'));

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
const dataDir = join(__dirname, 'data');
const uploadsDir = join(dataDir, 'uploads');
const mediaDir = join(dataDir, 'media');

[dataDir, uploadsDir, mediaDir].forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

// Шаг 3: Запуск сервера
console.log('🚀 Запуск сервера...\n');

const server = spawn('node', [join(__dirname, 'server', 'index.cjs')], {
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
