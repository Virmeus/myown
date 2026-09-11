const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../database');

function authenticateToken(req, res, next) {
  // Check Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // Check cookie as fallback
  const cookieToken = req.cookies?.auth_token;
  
  const finalToken = token || cookieToken;

  if (!finalToken) {
    return res.status(401).json({ 
      success: false, 
      error: 'Требуется авторизация' 
    });
  }

  try {
    const decoded = jwt.verify(finalToken, config.jwtSecret);
    
    // Check if session exists and is valid
    const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")').get(finalToken);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'Сессия истекла, войдите снова' 
      });
    }

    // Get user
    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Пользователь не найден' 
      });
    }

    req.user = user;
    req.token = finalToken;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Токен истёк, войдите снова' 
      });
    }
    return res.status(403).json({ 
      success: false, 
      error: 'Недействительный токен' 
    });
  }
}

function auditLog(action, resource, resourceId, details) {
  return (req, res, next) => {
    const originalEnd = res.end;
    res.end = function(...args) {
      if (res.statusCode < 400) {
        try {
          db.prepare(`
            INSERT INTO audit_log (user_id, action, resource, resource_id, ip_address, user_agent, details)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            req.user?.id || null,
            action,
            resource || req.path,
            resourceId || null,
            req.ip,
            req.headers['user-agent'],
            typeof details === 'function' ? details(req, res) : JSON.stringify(details)
          );
        } catch (e) {
          console.error('Audit log error:', e);
        }
      }
      originalEnd.apply(res, args);
    };
    next();
  };
}

module.exports = { authenticateToken, auditLog };
