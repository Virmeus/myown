const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Файл для хранения секретов
const secretsFile = path.join(__dirname, '..', 'data', '.secrets.json');
const dataDir = path.join(__dirname, '..', 'data');

// Создаём директорию если не существует
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Загружаем или создаём секреты
let secrets = {};
if (fs.existsSync(secretsFile)) {
  secrets = JSON.parse(fs.readFileSync(secretsFile, 'utf8'));
} else {
  secrets = {
    jwtSecret: crypto.randomBytes(32).toString('hex'),
    encryptionKey: crypto.randomBytes(32).toString('hex'),
  };
  fs.writeFileSync(secretsFile, JSON.stringify(secrets, null, 2));
}

module.exports = {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || secrets.jwtSecret,
  jwtExpiresIn: '24h',
  encryptionKey: process.env.ENCRYPTION_KEY || secrets.encryptionKey,
  dbPath: path.join(__dirname, '..', 'data', 'admin.db'),
  uploadDir: path.join(__dirname, '..', 'data', 'uploads'),
  mediaDir: path.join(__dirname, '..', 'data', 'media'),
  maxUploadSize: 100 * 1024 * 1024, // 100MB
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3000'],
};
