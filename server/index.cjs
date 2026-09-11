const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const config = require('./config.cjs');

const app = express();

// Security
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Simple rate limiter (замена express-rate-limit для совместимости с CommonJS)
function createRateLimiter(windowMs, maxRequests) {
  const requests = new Map();
  
  // Очистка старых записей каждые 5 минут
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests.entries()) {
      if (now - data.start > windowMs) {
        requests.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const data = requests.get(key) || { count: 0, start: now };
    
    if (now - data.start > windowMs) {
      data.count = 0;
      data.start = now;
    }
    
    data.count++;
    requests.set(key, data);
    
    if (data.count > maxRequests) {
      return res.status(429).json({ success: false, error: 'Слишком много запросов. Попробуйте позже.' });
    }
    
    next();
  };
}

const authLimiter = createRateLimiter(15 * 60 * 1000, 20); // 20 запросов за 15 минут
const apiLimiter = createRateLimiter(60 * 1000, 100); // 100 запросов за минуту

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// API routes
app.use('/api/auth', authLimiter, require('./routes/auth.cjs'));
app.use('/api/passwords', apiLimiter, require('./routes/passwords.cjs'));
app.use('/api/media', apiLimiter, require('./routes/media.cjs'));
app.use('/api/cron', apiLimiter, require('./routes/cron.cjs'));
app.use('/api/storage', apiLimiter, require('./routes/storage.cjs'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Serve static files from dist
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // Catch-all для SPA (Express 5 / path-to-regexp v8 синтаксис)
  app.get('/*path', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ success: false, error: 'API endpoint не найден' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'Файл слишком большой' });
  }

  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' ? 'Внутренняя ошибка сервера' : err.message 
  });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`\n🛡️  AdminPanel Server`);
  console.log(`   Port: ${PORT}`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
