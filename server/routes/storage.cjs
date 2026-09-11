const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database.cjs');
const config = require('../config.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');

const router = express.Router();

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folderPath = req.body.folderPath || '/';
    const userDir = path.join(config.uploadDir, req.user.id);
    const fullPath = path.join(userDir, folderPath);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadSize, files: 10 },
});

router.get('/files', authenticateToken, (req, res) => {
  try {
    const { folderPath = '/', search } = req.query;

    let query = 'SELECT * FROM files WHERE user_id = ?';
    const params = [req.user.id];

    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    } else {
      query += ' AND folder_path = ?';
      params.push(folderPath);
    }

    query += ' ORDER BY created_at DESC';

    const files = db.prepare(query).all(...params);
    const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

    res.json({ success: true, files, totalSize, maxStorage: 10 * 1024 * 1024 * 1024 });
  } catch (err) {
    console.error('Get files error:', err);
    res.status(500).json({ success: false, error: 'Ошибка получения файлов' });
  }
});

router.post('/upload', authenticateToken, upload.array('files', 10), (req, res) => {
  try {
    const folderPath = req.body.folderPath || '/';
    const uploadedFiles = [];

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Файлы не выбраны' });
    }

    for (const file of req.files) {
      const id = uuidv4();
      const relativePath = path.relative(config.uploadDir, file.path);

      db.prepare(`INSERT INTO files (id, user_id, name, original_name, mime_type, size, path, folder_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, req.user.id, file.filename, file.originalname, file.mimetype, file.size, `/data/uploads/${req.user.id}/${relativePath}`, folderPath);

      uploadedFiles.push({ id, name: file.originalname, size: file.size, mimeType: file.mimetype, folderPath });
    }

    res.status(201).json({ success: true, files: uploadedFiles, message: `Загружено ${uploadedFiles.length} файл(ов)` });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, error: 'Ошибка загрузки' });
  }
});

router.post('/folder', authenticateToken, (req, res) => {
  try {
    const { name, parentPath = '/' } = req.body;

    if (!name) return res.status(400).json({ success: false, error: 'Имя папки обязательно' });

    const sanitizedName = name.replace(/[^a-zA-Zа-яА-Я0-9_\-\.]/g, '_');
    const folderPath = parentPath === '/' ? `/${sanitizedName}` : `${parentPath}/${sanitizedName}`;

    const userDir = path.join(config.uploadDir, req.user.id);
    const fullPath = path.join(userDir, folderPath);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    const id = uuidv4();
    db.prepare(`INSERT INTO files (id, user_id, name, original_name, mime_type, size, path, folder_path) VALUES (?, ?, ?, ?, 'folder', 0, ?, ?)`)
      .run(id, req.user.id, sanitizedName, sanitizedName, folderPath, parentPath);

    res.status(201).json({ success: true, folder: { id, name: sanitizedName, path: folderPath } });
  } catch (err) {
    console.error('Create folder error:', err);
    res.status(500).json({ success: false, error: 'Ошибка создания папки' });
  }
});

router.get('/download/:id', authenticateToken, (req, res) => {
  try {
    const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ? AND mime_type != "folder"').get(req.params.id, req.user.id);
    if (!file) return res.status(404).json({ success: false, error: 'Файл не найден' });

    const fullPath = path.join(__dirname, '..', file.path);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ success: false, error: 'Файл не существует' });

    res.download(fullPath, file.original_name);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка скачивания' });
  }
});

router.delete('/files/:id', authenticateToken, (req, res) => {
  try {
    const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!file) return res.status(404).json({ success: false, error: 'Файл не найден' });

    if (file.mime_type !== 'folder') {
      const fullPath = path.join(__dirname, '..', file.path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } else {
      const userDir = path.join(config.uploadDir, req.user.id);
      const folderFullPath = path.join(userDir, file.path);
      if (fs.existsSync(folderFullPath)) fs.rmSync(folderFullPath, { recursive: true, force: true });
      db.prepare('DELETE FROM files WHERE user_id = ? AND folder_path LIKE ?').run(req.user.id, `${file.path}%`);
    }

    db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка удаления' });
  }
});

router.get('/stats', authenticateToken, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT COUNT(*) as totalFiles, COALESCE(SUM(size), 0) as totalSize
      FROM files WHERE user_id = ? AND mime_type != 'folder'
    `).get(req.user.id);

    res.json({ success: true, stats: { ...stats, maxStorage: 10 * 1024 * 1024 * 1024 } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка' });
  }
});

module.exports = router;
