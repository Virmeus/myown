import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, Link, Play, Image, Music, FileVideo, 
  Check, AlertCircle, Loader2, ExternalLink, Trash2
} from 'lucide-react';
import api from '../utils/api';

interface DownloadTask {
  id: string;
  url: string;
  platform: string;
  type: string;
  status: 'pending' | 'processing' | 'downloading' | 'completed' | 'error';
  progress: number;
  title: string;
  created_at: string;
  completed_at?: string;
  file_size?: number;
  error_message?: string;
}

const platforms: Record<string, { name: string; icon: string; color: string }> = {
  youtube: { name: 'YouTube', icon: '▶️', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  instagram: { name: 'Instagram', icon: '📷', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  tiktok: { name: 'TikTok', icon: '🎵', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  twitter: { name: 'Twitter/X', icon: '🐦', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  facebook: { name: 'Facebook', icon: '👤', color: 'bg-blue-600/10 text-blue-300 border-blue-600/20' },
  vimeo: { name: 'Vimeo', icon: '🎬', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  soundcloud: { name: 'SoundCloud', icon: '🎧', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  reddit: { name: 'Reddit', icon: '🔴', color: 'bg-orange-600/10 text-orange-300 border-orange-600/20' },
  other: { name: 'Другое', icon: '🌐', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

function formatFileSize(bytes: number): string {
  if (!bytes) return '—';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

export const MediaDownloaderPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [mediaType, setMediaType] = useState<'auto' | 'video' | 'audio' | 'image'>('auto');
  const [quality, setQuality] = useState('best');
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadTasks();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadTasks = async () => {
    try {
      const result = await api.getMediaTasks();
      if (result.success) {
        setTasks(result.tasks);
      }
    } catch (err) {
      console.error('Load tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll for task updates
  useEffect(() => {
    const hasActiveTasks = tasks.some(t => t.status === 'processing' || t.status === 'downloading');
    
    if (hasActiveTasks) {
      pollRef.current = setInterval(loadTasks, 2000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tasks]);

  const detectedPlatform = url ? detectPlatform(url) : null;

  function detectPlatform(url: string): string {
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

  const handleDownload = async () => {
    if (!url) return;
    
    setDownloading(true);
    try {
      const result = await api.startDownload(url, mediaType === 'auto' ? undefined : mediaType, quality);
      if (result.success) {
        setUrl('');
        await loadTasks();
      }
    } catch (err: any) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await api.deleteMediaTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Delete task error:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="w-4 h-4 text-emerald-400" />;
      case 'processing': case 'downloading': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <Download className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Завершено';
      case 'processing': return 'Обработка...';
      case 'downloading': return 'Скачивание...';
      case 'error': return 'Ошибка';
      default: return 'Ожидание';
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
          <p className="text-sm text-gray-400">Через Cobalt API • YouTube, Instagram, TikTok и др.</p>
        </div>
      </div>

      {/* Download Form */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <div className="space-y-4">
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
                  onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                />
              </div>
              <button
                onClick={handleDownload}
                disabled={!url || downloading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span className="hidden sm:inline">Скачать</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Тип медиа</label>
              <div className="flex gap-2">
                {(['auto', 'video', 'audio'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setMediaType(type)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      mediaType === type 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {type === 'auto' ? 'Авто' : type === 'video' ? 'Видео' : 'Аудио'}
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

          {detectedPlatform && (
            <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <span className="text-lg">{platforms[detectedPlatform]?.icon}</span>
              <span className="text-sm text-gray-300">
                Платформа: <strong>{platforms[detectedPlatform]?.name}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Supported Platforms */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(platforms).map(([id, platform]) => (
          <div key={id} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${platform.color}`}>
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
          <button
            onClick={loadTasks}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            <Loader2 className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>

        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/30 border border-gray-800 rounded-xl">
            <Download className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Нет задач на скачивание</p>
            <p className="text-sm text-gray-600 mt-1">Вставьте ссылку выше для начала загрузки</p>
          </div>
        ) : (
          tasks.map(task => {
            const platformInfo = platforms[task.platform] || platforms.other;
            return (
              <div key={task.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{platformInfo.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {task.title || platformInfo.name}
                      </span>
                      {getStatusIcon(task.status)}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        task.status === 'error' ? 'bg-red-500/10 text-red-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {getStatusText(task.status)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-2">{task.url}</p>
                    
                    {task.status === 'processing' && (
                      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse"
                          style={{ width: '60%' }}
                        ></div>
                      </div>
                    )}
                    
                    {task.status === 'completed' && (
                      <div className="flex items-center gap-3">
                        {task.file_size && (
                          <span className="text-xs text-gray-500">{formatFileSize(task.file_size)}</span>
                        )}
                        <a
                          href={api.getMediaDownloadUrl(task.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="w-3 h-3" /> Скачать файл
                        </a>
                      </div>
                    )}

                    {task.status === 'error' && task.error_message && (
                      <p className="text-xs text-red-400">{task.error_message}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {new Date(task.created_at).toLocaleTimeString('ru')}
                    </span>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
