const path = require('path');

module.exports = {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'super_secret_key_change_in_production_' + require('crypto').randomBytes(16).toString('hex'),
  jwtExpiresIn: '24h',
  encryptionKey: process.env.ENCRYPTION_KEY || 'aes256_encryption_key_2024_secure',
  dbPath: path.join(__dirname, '..', 'data', 'admin.db'),
  uploadDir: path.join(__dirname, '..', 'data', 'uploads'),
  mediaDir: path.join(__dirname, '..', 'data', 'media'),
  maxUploadSize: 100 * 1024 * 1024, // 100MB
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3000'],
};
