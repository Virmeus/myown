const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const cron = require('node-cron');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Store running cron tasks
const cronJobs = new Map();

// Initialize existing cron tasks
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
        
        // Calculate next run
        updateNextRun(task.id, task.schedule);
      }
    });
    
    console.log(`Initialized ${tasks.length} cron tasks`);
  } catch (err) {
    console.error('Error initializing cron tasks:', err);
  }
}

// Execute a cron task
function executeCronTask(taskId) {
  const task = db.prepare('SELECT * FROM cron_tasks WHERE id = ?').get(taskId);
  if (!task) return;

  // Update status to running
  db.prepare('UPDATE cron_tasks SET status = "running", last_run = datetime("now") WHERE id = ?').run(taskId);

  // Execute command
  exec(task.command, { timeout: 60000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    const output = stdout || stderr || (error ? error.message : 'No output');
    const exitCode = error ? error.code || 1 : 0;

    // Update task status
    db.prepare(`
      UPDATE cron_tasks 
      SET status = ?, last_output = ?, last_exit_code = ?
      WHERE id = ?
    `).run(exitCode === 0 ? 'idle' : 'error', output.slice(0, 10000), exitCode, taskId);

    // Log execution
    db.prepare(`
      INSERT INTO cron_logs (task_id, output, exit_code)
      VALUES (?, ?, ?)
    `).run(taskId, output.slice(0, 10000), exitCode);

    // Update next run
    updateNextRun(taskId, task.schedule);
  });
}

// Calculate next run time (simplified)
function updateNextRun(taskId, schedule) {
  // Simple next run calculation
  const now = new Date();
  let nextRun = new Date(now);
  
  const parts = schedule.split(' ');
  if (parts.length !== 5) return;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

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

  db.prepare('UPDATE cron_tasks SET next_run = ? WHERE id = ?')
    .run(nextRun.toISOString(), taskId);
}

// Initialize on module load
setTimeout(initializeCronTasks, 1000);

// GET /api/cron/tasks - Get all cron tasks
router.get('/tasks', authenticateToken, (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT * FROM cron_tasks WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user.id);

    res.json({ success: true, tasks });
  } catch (err) {
    console.error('Get cron tasks error:', err);
    res.status(500).json({ success: false, error: 'Ошибка получения задач' });
  }
});

// POST /api/cron/tasks - Create new cron task
router.post('/tasks', authenticateToken, (req, res) => {
  try {
    const { name, command, schedule } = req.body;

    if (!name || !command || !schedule) {
      return res.status(400).json({ 
        success: false, 
        error: 'Название, команда и расписание обязательны' 
      });
    }

    // Validate cron expression
    if (!cron.validate(schedule)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Некорректное cron выражение' 
      });
    }

    const id = uuidv4();

    db.prepare(`
      INSERT INTO cron_tasks (id, user_id, name, command, schedule, enabled)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(id, req.user.id, name, command, schedule);

    // Start cron job
    const job = cron.schedule(schedule, () => executeCronTask(id), {
      scheduled: true,
      timezone: 'Europe/Moscow'
    });
    cronJobs.set(id, job);

    // Calculate next run
    updateNextRun(id, schedule);

    const task = db.prepare('SELECT * FROM cron_tasks WHERE id = ?').get(id);

    res.status(201).json({ success: true, task });
  } catch (err) {
    console.error('Create cron task error:', err);
    res.status(500).json({ success: false, error: 'Ошибка создания задачи' });
  }
});

// PUT /api/cron/tasks/:id - Update cron task
router.put('/tasks/:id', authenticateToken, (req, res) => {
  try {
    const { name, command, schedule, enabled } = req.body;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM cron_tasks WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Задача не найдена' });
    }

    const newSchedule = schedule || existing.schedule;
    
    if (schedule && !cron.validate(schedule)) {
      return res.status(400).json({ success: false, error: 'Некорректное cron выражение' });
    }

    db.prepare(`
      UPDATE cron_tasks 
      SET name = ?, command = ?, schedule = ?, enabled = ?
      WHERE id = ?
    `).run(
      name || existing.name,
      command || existing.command,
      newSchedule,
      enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled,
      id
    );

    // Restart cron job
    if (cronJobs.has(id)) {
      cronJobs.get(id).stop();
      cronJobs.delete(id);
    }

    if (enabled !== false && cron.validate(newSchedule)) {
      const job = cron.schedule(newSchedule, () => executeCronTask(id), {
        scheduled: true,
        timezone: 'Europe/Moscow'
      });
      cronJobs.set(id, job);
      updateNextRun(id, newSchedule);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update cron task error:', err);
    res.status(500).json({ success: false, error: 'Ошибка обновления задачи' });
  }
});

// POST /api/cron/tasks/:id/toggle - Toggle task enabled/disabled
router.post('/tasks/:id/toggle', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM cron_tasks WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Задача не найдена' });
    }

    const newEnabled = existing.enabled ? 0 : 1;

    db.prepare('UPDATE cron_tasks SET enabled = ? WHERE id = ?').run(newEnabled, id);

    if (newEnabled) {
      // Start cron job
      if (cron.validate(existing.schedule)) {
        const job = cron.schedule(existing.schedule, () => executeCronTask(id), {
          scheduled: true,
          timezone: 'Europe/Moscow'
        });
        cronJobs.set(id, job);
        updateNextRun(id, existing.schedule);
      }
    } else {
      // Stop cron job
      if (cronJobs.has(id)) {
        cronJobs.get(id).stop();
        cronJobs.delete(id);
      }
    }

    res.json({ success: true, enabled: !!newEnabled });
  } catch (err) {
    console.error('Toggle cron task error:', err);
    res.status(500).json({ success: false, error: 'Ошибка переключения задачи' });
  }
});

// POST /api/cron/tasks/:id/run - Run task immediately
router.post('/tasks/:id/run', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM cron_tasks WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Задача не найдена' });
    }

    if (existing.status === 'running') {
      return res.status(400).json({ success: false, error: 'Задача уже выполняется' });
    }

    // Execute immediately
    executeCronTask(id);

    res.json({ success: true, message: 'Задача запущена' });
  } catch (err) {
    console.error('Run cron task error:', err);
    res.status(500).json({ success: false, error: 'Ошибка запуска задачи' });
  }
});

// DELETE /api/cron/tasks/:id - Delete cron task
router.delete('/tasks/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM cron_tasks WHERE id = ? AND user_id = ?')
      .run(id, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Задача не найдена' });
    }

    // Stop cron job
    if (cronJobs.has(id)) {
      cronJobs.get(id).stop();
      cronJobs.delete(id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete cron task error:', err);
    res.status(500).json({ success: false, error: 'Ошибка удаления задачи' });
  }
});

// GET /api/cron/tasks/:id/logs - Get task execution logs
router.get('/tasks/:id/logs', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const task = db.prepare('SELECT id FROM cron_tasks WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);
    
    if (!task) {
      return res.status(404).json({ success: false, error: 'Задача не найдена' });
    }

    const logs = db.prepare(`
      SELECT * FROM cron_logs WHERE task_id = ? ORDER BY executed_at DESC LIMIT 50
    `).all(id);

    res.json({ success: true, logs });
  } catch (err) {
    console.error('Get cron logs error:', err);
    res.status(500).json({ success: false, error: 'Ошибка получения логов' });
  }
});

module.exports = router;
