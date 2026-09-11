const jwt = require('jsonwebtoken');
const config = require('../config.cjs');
const db = require('../database.cjs');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const cookieToken = req.cookies?.auth_token;
  const finalToken = token || cookieToken;

  if (!finalToken) {
    return res.status(401).json({ success: false, error: 'Требуется авторизация' });
  }

  try {
    const decoded = jwt.verify(finalToken, config.jwtSecret);
    
    // Проверяем сессию в базе данных
    const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")').get(finalToken);
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Сессия недействительна или истекла' });
    }

    // Получаем пользователя
    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Пользователь не найден' });
    }

    req.user = user;
    req.token = finalToken;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Токен истёк, войдите снова' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Недействительный токен' });
    }
    return res.status(403).json({ success: false, error: 'Ошибка авторизации' });
  }
}

module.exports = { authenticateToken };
