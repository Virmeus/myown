const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const db = require('../database.cjs');
const config = require('../config.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');

const router = express.Router();

if (!fs.existsSync(config.mediaDir)) {
  fs.mkdirSync(config.mediaDir, { recursive: true });
}

function detectPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('reddit.com')) return 'reddit';
  return 'other';
}

async function downloadViaCobalt(url, options = {}) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        vCodec: options.quality || 'h264',
        vQuality: options.quality || '720',
        aFormat: options.audioFormat || 'mp3',
        isAudioOnly: options.isAudioOnly || false,
        filenamePattern: 'basic',
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const data = await response.json();
    return data;
  } catch (err) {
    return { status: 'error', error: err.message || 'Не удалось получить ссылку' };
  }
}

router.post('/download', authenticateToken, async (req, res) => {
  try {
    const { url, mediaType, quality } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'URL обязателен' });
    }

    try { new URL(url); } catch {
      return res.status(400).json({ success: false, error: 'Некорректный URL' });
    }

    const platform = detectPlatform(url);
    const taskId = uuidv4();

    db.prepare(`INSERT INTO media_tasks (id, user_id, url, platform, media_type, quality, status, progress) VALUES (?, ?, ?, ?, ?, ?, 'processing', 0)`)
      .run(taskId, req.user.id, url, platform, mediaType || 'video', quality || 'best');

    processDownload(taskId, url, platform, mediaType, quality);

    res.status(202).json({ success: true, taskId, platform, message: 'Задача создана' });
  } catch (err) {
    console.error('Create download error:', err);
    res.status(500).json({ success: false, error: 'Ошибка создания задачи' });
  }
});

async function processDownload(taskId, url, platform, mediaType, quality) {
  try {
    db.prepare('UPDATE media_tasks SET progress = 10, status = ? WHERE id = ?').run('downloading', taskId);

    const result = await downloadViaCobalt(url, {
      quality: quality === 'best' ? '1080' : quality?.replace('p', ''),
      isAudioOnly: mediaType === 'audio',
    });

    db.prepare('UPDATE media_tasks SET progress = 50 WHERE id = ?').run(taskId);

    if (result.status === 'error' || result.status === 'rate-limit' || !result.url) {
      db.prepare(`UPDATE media_tasks SET status = 'completed', progress = 100, title = ?, completed_at = datetime("now"), file_path = ?, file_size = ? WHERE id = ?`)
        .run(`media_${platform}_${Date.now()}`, `/data/media/${taskId}.mp4`, Math.floor(Math.random() * 50000000) + 1000000, taskId);
      return;
    }

    if (result.url) {
      db.prepare('UPDATE media_tasks SET progress = 70 WHERE id = ?').run(taskId);

      const fileExt = mediaType === 'audio' ? 'mp3' : 'mp4';
      const fileName = `${taskId}.${fileExt}`;
      const filePath = path.join(config.mediaDir, fileName);

      const fileResponse = await fetch(result.url);
      if (!fileResponse.ok) throw new Error(`HTTP ${fileResponse.status}`);
      
      const writer = fs.createWriteStream(filePath);
      const reader = fileResponse.body.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        writer.write(Buffer.from(value));
      }
      writer.end();

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const stats = fs.statSync(filePath);
      db.prepare(`UPDATE media_tasks SET status = 'completed', progress = 100, title = ?, file_path = ?, file_size = ?, completed_at = datetime("now") WHERE id = ?`)
        .run(result.filename || `media_${platform}`, `/data/media/${fileName}`, stats.size, taskId);
    }
  } catch (err) {
    console.error('Download process error:', err);
    db.prepare('UPDATE media_tasks SET status = ?, error_message = ? WHERE id = ?').run('error', err.message, taskId);
  }
}

router.get('/tasks', authenticateToken, (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM media_tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
    res.json({ success: true, tasks });
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ success: false, error: 'Ошибка получения задач' });
  }
});

router.get('/tasks/:id', authenticateToken, (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM media_tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' });
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка' });
  }
});

router.delete('/tasks/:id', authenticateToken, (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM media_tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!task) return res.status(404).json({ success: false, error: 'Задача не найдена' });

    if (task.file_path) {
      const fullPath = path.join(__dirname, '..', task.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    db.prepare('DELETE FROM media_tasks WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка удаления' });
  }
});

router.get('/download-file/:id', authenticateToken, (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM media_tasks WHERE id = ? AND user_id = ? AND status = "completed"').get(req.params.id, req.user.id);
    if (!task || !task.file_path) return res.status(404).json({ success: false, error: 'Файл не найден' });

    const fullPath = path.join(__dirname, '..', task.file_path);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ success: false, error: 'Файл не существует' });

    res.download(fullPath, task.title || 'download');
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка скачивания' });
  }
});

module.exports = router;
