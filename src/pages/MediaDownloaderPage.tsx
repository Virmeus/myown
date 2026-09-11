import React, { useState } from 'react';
import { 
  Download, Link, Play, Image, Music, FileVideo, 
  Check, AlertCircle, Loader2, ExternalLink
} from 'lucide-react';

interface DownloadTask {
  id: string;
  url: string;
  platform: string;
  type: string;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  progress: number;
  title: string;
  createdAt: string;
}

const platforms = [
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'facebook', name: 'Facebook', icon: '👤', color: 'bg-blue-600/10 text-blue-300 border-blue-600/20' },
  { id: 'vimeo', name: 'Vimeo', icon: '🎬', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { id: 'soundcloud', name: 'SoundCloud', icon: '🎧', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { id: 'other', name: 'Другое', icon: '🌐', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
];

function detectPlatform(url: string): string {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  return 'other';
}

export const MediaDownloaderPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [mediaType, setMediaType] = useState<'auto' | 'video' | 'audio' | 'image'>('auto');
  const [quality, setQuality] = useState('best');
  const [tasks, setTasks] = useState<DownloadTask[]>(() => {
    const stored = localStorage.getItem('media_tasks');
    return stored ? JSON.parse(stored) : [];
  });
  const [downloading, setDownloading] = useState(false);

  const detectedPlatform = url ? detectPlatform(url) : null;

  const handleDownload = () => {
    if (!url) return;
    
    setDownloading(true);
    
    const platform = detectPlatform(url);
    const platformInfo = platforms.find(p => p.id === platform);
    
    const task: DownloadTask = {
      id: crypto.randomUUID(),
      url,
      platform,
      type: mediaType === 'auto' ? 'video' : mediaType,
      status: 'downloading',
      progress: 0,
      title: `Медиа с ${platformInfo?.name || 'сайта'}`,
      createdAt: new Date().toISOString(),
    };

    setTasks(prev => {
      const updated = [task, ...prev];
      localStorage.setItem('media_tasks', JSON.stringify(updated));
      return updated;
    });

    // Simulate download progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        setTasks(prev => {
          const updated = prev.map(t => 
            t.id === task.id ? { ...t, status: 'completed' as const, progress: 100 } : t
          );
          localStorage.setItem('media_tasks', JSON.stringify(updated));
          return updated;
        });
        setDownloading(false);
      } else {
        setTasks(prev => {
          const updated = prev.map(t => 
            t.id === task.id ? { ...t, progress: Math.min(progress, 99) } : t
          );
          localStorage.setItem('media_tasks', JSON.stringify(updated));
          return updated;
        });
      }
    }, 500);

    setUrl('');
  };

  const clearCompleted = () => {
    const remaining = tasks.filter(t => t.status !== 'completed');
    setTasks(remaining);
    localStorage.setItem('media_tasks', JSON.stringify(remaining));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="w-4 h-4 text-emerald-400" />;
      case 'downloading': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Download className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <FileVideo className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      default: return <Play className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Скачивание медиа</h2>
          <p className="text-sm text-gray-400">Загрузка контента из социальных сетей</p>
        </div>
      </div>

      {/* Download Form */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Ссылка на медиа</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Вставьте ссылку на видео, аудио или изображение..."
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>
              <button
                onClick={handleDownload}
                disabled={!url || downloading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Скачать</span>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Тип медиа</label>
              <div className="flex gap-2">
                {(['auto', 'video', 'audio', 'image'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setMediaType(type)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      mediaType === type 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {type === 'auto' ? 'Авто' : type === 'video' ? 'Видео' : type === 'audio' ? 'Аудио' : 'Фото'}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Качество</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="best">Лучшее</option>
                <option value="1080p">1080p</option>
                <option value="720p">720p</option>
                <option value="480p">480p</option>
                <option value="360p">360p</option>
              </select>
            </div>
          </div>

          {/* Detected Platform */}
          {detectedPlatform && (
            <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <span className="text-lg">{platforms.find(p => p.id === detectedPlatform)?.icon}</span>
              <span className="text-sm text-gray-300">
                Обнаружена платформа: <strong>{platforms.find(p => p.id === detectedPlatform)?.name}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Supported Platforms */}
      <div className="flex flex-wrap gap-2">
        {platforms.map(platform => (
          <div key={platform.id} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${platform.color}`}>
            {platform.icon} {platform.name}
          </div>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-400">
            Задачи ({tasks.length})
          </h3>
          {tasks.some(t => t.status === 'completed') && (
            <button
              onClick={clearCompleted}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Очистить завершённые
            </button>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/30 border border-gray-800 rounded-xl">
            <Download className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Нет задач на скачивание</p>
            <p className="text-sm text-gray-600 mt-1">Вставьте ссылку выше для начала загрузки</p>
          </div>
        ) : (
          tasks.map(task => {
            const platformInfo = platforms.find(p => p.id === task.platform);
            return (
              <div key={task.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{platformInfo?.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white truncate">{task.title}</span>
                      {getStatusIcon(task.status)}
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-2">{task.url}</p>
                    
                    {task.status === 'downloading' && (
                      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    )}
                    
                    {task.status === 'completed' && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-emerald-400">✓ Завершено</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          {getTypeIcon(task.type)} {task.type}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(task.createdAt).toLocaleTimeString('ru')}
                    </p>
                    {task.status === 'downloading' && (
                      <p className="text-xs text-blue-400">{Math.round(task.progress)}%</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
