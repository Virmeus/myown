const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');
const { encrypt, decrypt, generatePassword, generateAPIKey } = require('../services/crypto.cjs');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const { category, type, search } = req.query;
    
    let query = 'SELECT * FROM passwords WHERE user_id = ?';
    const params = [req.user.id];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (type && type !== 'all') {
      query += ' AND type = ?';
      params.push(type);
    }

    if (search) {
      query += ' AND (title LIKE ? OR username LIKE ? OR url LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    const passwords = db.prepare(query).all(...params);

    const decrypted = passwords.map(p => {
      let decryptedPassword;
      try {
        decryptedPassword = decrypt(p.encrypted_password);
      } catch (e) {
        decryptedPassword = '[Ошибка дешифрования]';
      }
      
      return {
        id: p.id,
        title: p.title,
        username: p.username,
        password: decryptedPassword,
        url: p.url,
        category: p.category,
        notes: p.notes,
        type: p.type,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      };
    });

    res.json({ success: true, passwords: decrypted });
  } catch (err) {
    console.error('Get passwords error:', err);
    res.status(500).json({ success: false, error: 'Ошибка получения паролей' });
  }
});

router.post('/', authenticateToken, (req, res) => {
  try {
    const { title, username, password, url, category, notes, type } = req.body;

    if (!title || !password) {
      return res.status(400).json({ success: false, error: 'Название и пароль обязательны' });
    }

    const id = uuidv4();
    const encryptedPassword = encrypt(password);

    db.prepare(`
      INSERT INTO passwords (id, user_id, title, username, encrypted_password, url, category, notes, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, title, username || null, encryptedPassword, url || null, category || 'general', notes || null, type || 'password');

    res.status(201).json({
      success: true,
      password: {
        id, title, username: username || null, password, url: url || null,
        category: category || 'general', notes: notes || null, type: type || 'password',
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Create password error:', err);
    res.status(500).json({ success: false, error: 'Ошибка создания пароля' });
  }
});

router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM passwords WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Пароль не найден' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete password error:', err);
    res.status(500).json({ success: false, error: 'Ошибка удаления пароля' });
  }
});

router.post('/generate', authenticateToken, (req, res) => {
  try {
    const { length, uppercase, lowercase, numbers, symbols } = req.body;
    
    const password = generatePassword(length || 16, {
      uppercase: uppercase !== false,
      lowercase: lowercase !== false,
      numbers: numbers !== false,
      symbols: symbols !== false
    });

    res.json({ success: true, password });
  } catch (err) {
    console.error('Generate password error:', err);
    res.status(500).json({ success: false, error: 'Ошибка генерации пароля' });
  }
});

router.post('/generate-api-key', authenticateToken, (req, res) => {
  try {
    const apiKey = generateAPIKey();
    res.json({ success: true, apiKey });
  } catch (err) {
    console.error('Generate API key error:', err);
    res.status(500).json({ success: false, error: 'Ошибка генерации API ключа' });
  }
});

module.exports = router;
