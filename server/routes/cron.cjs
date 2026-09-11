const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const cron = require('node-cron');
const db = require('../database.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');

const router = express.Router();
const cronJobs = new Map();

function initializeCronTasks() {
  try {
    const tasks = db.prepare('SELECT * FROM cron_tasks WHERE enabled = 1').all();
    tasks.forEach(task => {
      if (cron.validate(task.schedule)) {
        const job = cron.schedule(task.schedule, () => executeCronTask(task.id), {
          scheduled: true,
          timezone: 'Europe/Moscow'
        });
        cronJobs.set(task.id, job);
        updateNextRun(task.id, task.schedule);
      }
    });
    console.log(`✅ Initialized ${tasks.length} cron tasks`);
  } catch (err) {
    console.error('Error initializing cron tasks:', err);
  }
}

function executeCronTask(taskId) {
  const task = db.prepare('SELECT * FROM cron_tasks WHERE id = ?').get(taskId);
  if (!task) return;

  db.prepare('UPDATE cron_tasks SET status = "running", last_run = datetime("now") WHERE id = ?').run(taskId);

  exec(task.command, { timeout: 60000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    const output = stdout || stderr || (error ? error.message : 'No output');
    const exitCode = error ? error.code || 1 : 0;

    db.prepare('UPDATE cron_tasks SET status = ?, last_output = ?, last_exit_code = ? WHERE id = ?')
      .run(exitCode === 0 ? 'idle' : 'error', output.slice(0, 10000), exitCode, taskId);

    db.prepare('INSERT INTO cron_logs (task_id, output, exit_code) VALUES (?, ?, ?)')
      .run(taskId, output.slice(0, 10000), exitCode);

    updateNextRun(taskId, task.schedule);
  });
}

function updateNextRun(taskId, schedule) {
  const now = new Date();
  let nextRun = new Date(now);
  const parts = schedule.split(' ');
  if (parts.length !== 5) return;

  const [minute, hour] = parts;

  if (minute === '*' && hour === '*') {
    nextRun.setMinutes(nextRun.getMinutes() + 1);
  } else if (minute.startsWith('*/')) {
    const interval = parseInt(minute.slice(2));
    const currentMin = nextRun.getMinutes();
    const nextMin = Math.ceil((currentMin + 1) / interval) * interval;
    if (nextMin >= 60) {
      nextRun.setHours(nextRun.getHours() + 1);
      nextRun.setMinutes(0);
    } else {
      nextRun.setMinutes(nextMin);
    }
  } else if (hour === '*') {
    nextRun.setHours(nextRun.getHours() + 1);
    nextRun.setMinutes(parseInt(minute) || 0);
  } else {
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(parseInt(hour) || 0);
    nextRun.setMinutes(parseInt(minute) || 0);
  }

  db.prepare('UPDATE cron_tasks SET next_run = ? WHERE id = ?').run(nextRun.toISOString(), taskId);
}

setTimeout(initializeCronTasks, 1000);

router.get('/tasks', authenticateToken, (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM cron_tasks WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка получения задач' });
  }
});

router.post('/tasks', authenticateToken, (req, res) => {
  try {
    const { name, command, schedule } = req.body;

    if (!name || !command || !schedule) {
      return res.status(400).json({ success: false, error: 'Все поля обязательны' });
    }

    if (!cron.validate(schedule)) {
      return res.status(400).json({ success: false, error: 'Некорректное cron выражение' });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO cron_tasks (id, user_id, name, command, schedule, enabled) VALUES (?, ?, ?, ?, ?, 1)')
      .run(id, req.user.id, name, command, schedule);

    const job = cron.schedule(schedule, () => executeCronTask(id), {
      scheduled: true,
      timezone: 'Europe/Moscow'
    });
    cronJobs.set(id, job);
    updateNextRun(id, schedule);

    const task = db.prepare('SELECT * FROM cron_tasks WHERE id = ?').get(id);
    res.status(201).json({ success: true, task });
  } catch (err) {
    console.error('Create cron task error:', err);
    res.status(500).json({ success: false, error: 'Ошибка создания задачи' });
  }
});

router.post('/tasks/:id/toggle', authenticateToken, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM cron_tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Задача не найдена' });

    const newEnabled = existing.enabled ? 0 : 1;
    db.prepare('UPDATE cron_tasks SET enabled = ? WHERE id = ?').run(newEnabled, req.params.id);

    if (newEnabled) {
      if (cron.validate(existing.schedule)) {
        const job = cron.schedule(existing.schedule, () => executeCronTask(req.params.id), {
          scheduled: true,
          timezone: 'Europe/Moscow'
        });
        cronJobs.set(req.params.id, job);
        updateNextRun(req.params.id, existing.schedule);
      }
    } else {
      if (cronJobs.has(req.params.id)) {
        cronJobs.get(req.params.id).stop();
        cronJobs.delete(req.params.id);
      }
    }

    res.json({ success: true, enabled: !!newEnabled });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка' });
  }
});

router.post('/tasks/:id/run', authenticateToken, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM cron_tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Задача не найдена' });
    if (existing.status === 'running') return res.status(400).json({ success: false, error: 'Уже выполняется' });

    executeCronTask(req.params.id);
    res.json({ success: true, message: 'Задача запущена' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка' });
  }
});

router.delete('/tasks/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM cron_tasks WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'Задача не найдена' });

    if (cronJobs.has(req.params.id)) {
      cronJobs.get(req.params.id).stop();
      cronJobs.delete(req.params.id);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка' });
  }
});

router.get('/tasks/:id/logs', authenticateToken, (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM cron_logs WHERE task_id = ? ORDER BY executed_at DESC LIMIT 50').all(req.params.id);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Ошибка' });
  }
});

module.exports = router;
