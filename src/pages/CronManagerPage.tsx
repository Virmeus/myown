import React, { useState, useEffect } from 'react';
import { 
  Clock, Plus, Play, Pause, Trash2, Edit2, Check, X, 
  Zap, Calendar, Repeat, AlertCircle
} from 'lucide-react';

interface CronTask {
  id: string;
  name: string;
  command: string;
  schedule: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  status: 'idle' | 'running' | 'error';
  createdAt: string;
}

const STORAGE_KEY = 'cron_tasks';

function getTasks(): CronTask[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [
    {
      id: '1',
      name: 'Резервное копирование БД',
      command: 'pg_dump mydb > backup.sql',
      schedule: '0 2 * * *',
      enabled: true,
      lastRun: new Date(Date.now() - 3600000).toISOString(),
      status: 'idle',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Очистка логов',
      command: 'find /var/log -name "*.log" -mtime +7 -delete',
      schedule: '0 0 * * 0',
      enabled: true,
      lastRun: new Date(Date.now() - 86400000).toISOString(),
      status: 'idle',
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Мониторинг серверов',
      command: 'curl -s https://health-check.example.com',
      schedule: '*/5 * * * *',
      enabled: false,
      status: 'idle',
      createdAt: new Date().toISOString(),
    },
  ];
}

function saveTasks(tasks: CronTask[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function parseCronExpression(expr: string): string {
  const parts = expr.split(' ');
  if (parts.length !== 5) return 'Неверный формат';
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  let result = '';
  
  if (minute === '*' && hour === '*') result = 'Каждую минуту';
  else if (minute.startsWith('*/')) result = `Каждые ${minute.slice(2)} мин`;
  else if (hour === '*') result = `Каждый час в :${minute.padStart(2, '0')}`;
  else if (dayOfWeek === '*') result = `Ежедневно в ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  else if (dayOfWeek !== '*') {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const day = parseInt(dayOfWeek);
    result = `Каждый ${days[day]} в ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  } else {
    result = `${minute}:${hour} ${dayOfMonth}/${month}`;
  }
  
  return result;
}

export const CronManagerPage: React.FC = () => {
  const [tasks, setTasks] = useState<CronTask[]>(getTasks());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    command: '',
    schedule: '',
  });

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  const handleAdd = () => {
    if (!newTask.name || !newTask.command || !newTask.schedule) return;
    
    const task: CronTask = {
      id: crypto.randomUUID(),
      name: newTask.name,
      command: newTask.command,
      schedule: newTask.schedule,
      enabled: true,
      status: 'idle',
      createdAt: new Date().toISOString(),
    };
    
    setTasks([task, ...tasks]);
    setNewTask({ name: '', command: '', schedule: '' });
    setShowAddModal(false);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, enabled: !t.enabled } : t
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const runTask = (id: string) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, status: 'running' as const, lastRun: new Date().toISOString() } : t
    ));
    
    setTimeout(() => {
      setTasks(tasks.map(t => 
        t.id === id ? { ...t, status: 'idle' as const } : t
      ));
    }, 3000);
  };

  const presets = [
    { label: 'Каждую минуту', value: '* * * * *' },
    { label: 'Каждые 5 минут', value: '*/5 * * * *' },
    { label: 'Каждый час', value: '0 * * * *' },
    { label: 'Каждый день в полночь', value: '0 0 * * *' },
    { label: 'Каждый день в 2:00', value: '0 2 * * *' },
    { label: 'Каждую неделю (Вс)', value: '0 0 * * 0' },
    { label: 'Каждый месяц (1-е)', value: '0 0 1 * *' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Cron задачи</h2>
            <p className="text-sm text-gray-400">{tasks.filter(t => t.enabled).length} активных из {tasks.length}</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Новая задача</span>
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/30 border border-gray-800 rounded-xl">
            <Clock className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Нет cron задач</p>
            <p className="text-sm text-gray-600 mt-1">Создайте первую задачу для автоматизации</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className={`bg-gray-900/50 border rounded-xl p-5 transition-all ${
              task.enabled ? 'border-gray-800 hover:border-gray-700' : 'border-gray-800/50 opacity-60'
            }`}>
              <div className="flex items-start gap-4">
                {/* Status indicator */}
                <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                  task.status === 'running' ? 'bg-amber-400 animate-pulse' :
                  task.status === 'error' ? 'bg-red-400' :
                  task.enabled ? 'bg-emerald-400' : 'bg-gray-600'
                }`}></div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-white">{task.name}</h4>
                    {task.status === 'running' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 animate-pulse">
                        Выполняется
                      </span>
                    )}
                  </div>
                  
                  <code className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400 font-mono block mb-2 truncate">
                    $ {task.command}
                  </code>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Repeat className="w-3.5 h-3.5" />
                      {task.schedule}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {parseCronExpression(task.schedule)}
                    </span>
                    {task.lastRun && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span>Последний запуск: {new Date(task.lastRun).toLocaleString('ru')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => runTask(task.id)}
                    disabled={!task.enabled || task.status === 'running'}
                    className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-emerald-400 transition-colors disabled:opacity-30"
                    title="Запустить сейчас"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      task.enabled 
                        ? 'hover:bg-gray-800 text-emerald-400 hover:text-amber-400' 
                        : 'hover:bg-gray-800 text-gray-500 hover:text-emerald-400'
                    }`}
                    title={task.enabled ? 'Приостановить' : 'Включить'}
                  >
                    {task.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Новая Cron задача</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Название</label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="Резервное копирование..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Команда</label>
                <input
                  type="text"
                  value={newTask.command}
                  onChange={(e) => setNewTask({ ...newTask, command: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="/path/to/script.sh"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Cron выражение</label>
                <input
                  type="text"
                  value={newTask.schedule}
                  onChange={(e) => setNewTask({ ...newTask, schedule: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="*/5 * * * *"
                />
                {newTask.schedule && (
                  <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {parseCronExpression(newTask.schedule)}
                  </p>
                )}
              </div>

              {/* Presets */}
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Шаблоны расписания</label>
                <div className="flex flex-wrap gap-2">
                  {presets.map(preset => (
                    <button
                      key={preset.value}
                      onClick={() => setNewTask({ ...newTask, schedule: preset.value })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        newTask.schedule === preset.value
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors shadow-lg shadow-amber-500/20"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
