const express = require('express');
const bcrypt = require('../utils/bcrypt.cjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database.cjs');
const config = require('../config.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get();
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Администратор уже зарегистрирован' });
    }

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Имя пользователя и пароль обязательны' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ success: false, error: 'Имя пользователя: 3-30 символов' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Пароль: минимум 6 символов' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = uuidv4();
    db.prepare(`INSERT INTO users (id, username, password_hash, email, role) VALUES (?, ?, ?, ?, 'admin')`)
      .run(userId, username, passwordHash, email || null);

    const token = jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(sessionId, userId, token, req.ip, req.headers['user-agent'], expiresAt);

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token,
      user: { id: userId, username, email: email || null, role: 'admin' }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Заполните все поля' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Неверные учётные данные' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMin = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({ success: false, error: `Аккаунт заблокирован. Подождите ${remainingMin} мин.` });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      const failedAttempts = (user.failed_attempts || 0) + 1;
      const lockedUntil = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60000).toISOString() : null;
      
      db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
        .run(failedAttempts, lockedUntil, user.id);

      if (failedAttempts >= 5) {
        return res.status(423).json({ success: false, error: 'Слишком много попыток. Заблокирован на 15 мин.' });
      }

      return res.status(401).json({ success: false, error: `Неверный пароль. Осталось попыток: ${5 - failedAttempts}` });
    }

    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = datetime("now") WHERE id = ?')
      .run(user.id);

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(sessionId, user.id, token, req.ip, req.headers['user-agent'], expiresAt);

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Ошибка сервера' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
    res.clearCookie('auth_token');
    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, error: 'Ошибка при выходе' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// GET /api/auth/check
router.get('/check', (req, res) => {
  const user = db.prepare('SELECT id FROM users LIMIT 1').get();
  res.json({ success: true, needsRegistration: !user });
});

module.exports = router;
