const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { encrypt, decrypt, generatePassword, generateAPIKey } = require('../services/crypto');

const router = express.Router();

// GET /api/passwords - Get all passwords
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

    // Decrypt passwords for response
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

// POST /api/passwords - Create new password
router.post('/', authenticateToken, (req, res) => {
  try {
    const { title, username, password, url, category, notes, type } = req.body;

    if (!title || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Название и пароль обязательны' 
      });
    }

    const id = uuidv4();
    const encryptedPassword = encrypt(password);

    db.prepare(`
      INSERT INTO passwords (id, user_id, title, username, encrypted_password, url, category, notes, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      req.user.id, 
      title, 
      username || null, 
      encryptedPassword, 
      url || null, 
      category || 'general', 
      notes || null, 
      type || 'password'
    );

    res.status(201).json({
      success: true,
      password: {
        id,
        title,
        username: username || null,
        password,
        url: url || null,
        category: category || 'general',
        notes: notes || null,
        type: type || 'password',
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Create password error:', err);
    res.status(500).json({ success: false, error: 'Ошибка создания пароля' });
  }
});

// PUT /api/passwords/:id - Update password
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { title, username, password, url, category, notes, type } = req.body;
    const { id } = req.params;

    // Check if password exists and belongs to user
    const existing = db.prepare('SELECT * FROM passwords WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Пароль не найден' });
    }

    const encryptedPassword = password ? encrypt(password) : existing.encrypted_password;

    db.prepare(`
      UPDATE passwords 
      SET title = ?, username = ?, encrypted_password = ?, url = ?, category = ?, notes = ?, type = ?, updated_at = datetime("now")
      WHERE id = ?
    `).run(
      title || existing.title,
      username !== undefined ? username : existing.username,
      encryptedPassword,
      url !== undefined ? url : existing.url,
      category || existing.category,
      notes !== undefined ? notes : existing.notes,
      type || existing.type,
      id
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Update password error:', err);
    res.status(500).json({ success: false, error: 'Ошибка обновления пароля' });
  }
});

// DELETE /api/passwords/:id - Delete password
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM passwords WHERE id = ? AND user_id = ?').run(id, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Пароль не найден' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete password error:', err);
    res.status(500).json({ success: false, error: 'Ошибка удаления пароля' });
  }
});

// POST /api/passwords/generate - Generate password
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

// POST /api/passwords/generate-api-key - Generate API key
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
