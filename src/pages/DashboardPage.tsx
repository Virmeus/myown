import React from 'react';
import { Key, Download, Clock, Cloud, Activity, Shield, TrendingUp, Server } from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

const stats = [
  { label: 'Сохранённых паролей', value: '24', icon: Key, color: 'from-violet-500 to-purple-600', change: '+3' },
  { label: 'Загружено медиа', value: '156', icon: Download, color: 'from-blue-500 to-cyan-600', change: '+12' },
  { label: 'Активных Cron', value: '7', icon: Clock, color: 'from-amber-500 to-orange-600', change: '+1' },
  { label: 'Файлов в облаке', value: '89', icon: Cloud, color: 'from-emerald-500 to-green-600', change: '+5' },
];

const recentActivity = [
  { action: 'Сохранён новый пароль', target: 'GitHub API', time: '5 мин назад', icon: Key },
  { action: 'Скачано видео', target: 'YouTube - Tutorial', time: '15 мин назад', icon: Download },
  { action: 'Cron задача выполнена', target: 'backup_db', time: '1 час назад', icon: Clock },
  { action: 'Файл загружен', target: 'report_2024.pdf', time: '2 часа назад', icon: Cloud },
  { action: 'API ключ сгенерирован', target: 'Service API', time: '3 часа назад', icon: Shield },
];

const systemStats = [
  { label: 'CPU', value: 23, color: 'bg-violet-500' },
  { label: 'RAM', value: 67, color: 'bg-blue-500' },
  { label: 'Диск', value: 45, color: 'bg-emerald-500' },
  { label: 'Сеть', value: 12, color: 'bg-amber-500' },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all duration-200 cursor-pointer group"
              onClick={() => onNavigate(['passwords', 'media', 'cron', 'storage'][index])}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-400" />
              Последняя активность
            </h3>
            <TrendingUp className="w-5 h-5 text-gray-500" />
          </div>
          <div className="space-y-3">
            {recentActivity.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-800/50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{item.action}</p>
                    <p className="text-xs text-gray-500 truncate">{item.target}</p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{item.time}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Stats */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-violet-400" />
            Система
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
            <p className="text-xs text-gray-500">Все системы работают нормально. Угроз не обнаружено.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
