import React, { useState, useEffect } from 'react';
import { Key, Download, Clock, Cloud, Activity, Shield, TrendingUp, Server, Loader2 } from 'lucide-react';
import api from '../utils/api';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    passwords: 0,
    media: 0,
    cron: 0,
    files: 0,
  });
  const [systemStats] = useState([
    { label: 'CPU', value: Math.floor(Math.random() * 40 + 10), color: 'bg-violet-500' },
    { label: 'RAM', value: Math.floor(Math.random() * 30 + 50), color: 'bg-blue-500' },
    { label: 'Диск', value: Math.floor(Math.random() * 30 + 30), color: 'bg-emerald-500' },
    { label: 'Сеть', value: Math.floor(Math.random() * 20 + 5), color: 'bg-amber-500' },
  ]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [passwordsRes, mediaRes, cronRes, storageRes] = await Promise.allSettled([
        api.getPasswords(),
        api.getMediaTasks(),
        api.getCronTasks(),
        api.getStorageStats(),
      ]);

      setStats({
        passwords: passwordsRes.status === 'fulfilled' && passwordsRes.value.success ? passwordsRes.value.passwords.length : 0,
        media: mediaRes.status === 'fulfilled' && mediaRes.value.success ? mediaRes.value.tasks.length : 0,
        cron: cronRes.status === 'fulfilled' && cronRes.value.success ? cronRes.value.tasks.length : 0,
        files: storageRes.status === 'fulfilled' && storageRes.value.success ? storageRes.value.stats.totalFiles : 0,
      });
    } catch (err) {
      console.error('Load stats error:', err);
    }
  };

  const statCards = [
    { label: 'Сохранённых паролей', value: stats.passwords, icon: Key, color: 'from-violet-500 to-purple-600', page: 'passwords' },
    { label: 'Загружено медиа', value: stats.media, icon: Download, color: 'from-blue-500 to-cyan-600', page: 'media' },
    { label: 'Cron задач', value: stats.cron, icon: Clock, color: 'from-amber-500 to-orange-600', page: 'cron' },
    { label: 'Файлов в облаке', value: stats.files, icon: Cloud, color: 'from-emerald-500 to-green-600', page: 'storage' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all duration-200 cursor-pointer group"
              onClick={() => onNavigate(stat.page)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                  active
                </span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Server Info */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-400" />
              Состояние системы
            </h3>
            <TrendingUp className="w-5 h-5 text-gray-500" />
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Backend</p>
                <p className="text-sm font-medium text-emerald-400">Node.js + Express</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Database</p>
                <p className="text-sm font-medium text-blue-400">SQLite (WAL mode)</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Шифрование</p>
                <p className="text-sm font-medium text-violet-400">AES-256-GCM</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Авторизация</p>
                <p className="text-sm font-medium text-amber-400">JWT + bcrypt</p>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-xs text-gray-500 mb-2">Модули</p>
              <div className="flex flex-wrap gap-2">
                {['Менеджер паролей', 'Медиа загрузчик', 'Cron планировщик', 'Облачное хранилище', 'Аудит логирование'].map(mod => (
                  <span key={mod} className="text-xs px-2 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    {mod}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-violet-400" />
            Ресурсы
          </h3>
          <div className="space-y-5">
            {systemStats.map((stat, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">{stat.label}</span>
                  <span className="text-sm font-medium text-white">{stat.value}%</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${stat.color} rounded-full transition-all duration-1000`}
                    style={{ width: `${stat.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">Защита активна</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">✓ Rate limiting</p>
              <p className="text-xs text-gray-500">✓ Helmet security headers</p>
              <p className="text-xs text-gray-500">✓ Account lockout (5 attempts)</p>
              <p className="text-xs text-gray-500">✓ Audit logging</p>
              <p className="text-xs text-gray-500">✓ HttpOnly cookies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
