import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, Upload, Folder, File, Image, Film, Music, FileText,
  Download, Trash2, Grid, List, Search,
  HardDrive, FolderPlus, Loader2
} from 'lucide-react';
import api from '../utils/api';

interface FileItem {
  id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  folder_path: string;
  created_at: string;
}

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

function getFileIcon(file: FileItem) {
  if (file.mime_type === 'folder') return <Folder className="w-5 h-5 text-amber-400" />;
  
  const mime = file.mime_type || '';
  if (mime.startsWith('image/')) return <Image className="w-5 h-5 text-pink-400" />;
  if (mime.startsWith('video/')) return <Film className="w-5 h-5 text-purple-400" />;
  if (mime.startsWith('audio/')) return <Music className="w-5 h-5 text-green-400" />;
  if (mime === 'application/pdf') return <FileText className="w-5 h-5 text-red-400" />;
  if (mime.includes('json') || mime.includes('javascript') || mime.includes('text/')) return <File className="w-5 h-5 text-cyan-400" />;
  if (mime.includes('sql') || mime.includes('database')) return <HardDrive className="w-5 h-5 text-emerald-400" />;
  return <File className="w-5 h-5 text-gray-400" />;
}

export const CloudStoragePage: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [totalSize, setTotalSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, [currentPath]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const result = await api.getFiles(search ? undefined : currentPath, search || undefined);
      if (result.success) {
        setFiles(result.files);
        setTotalSize(result.totalSize || 0);
      }
    } catch (err) {
      console.error('Load files error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) loadFiles();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    setUploading(true);
    try {
      const fileArray = Array.from(selectedFiles);
      const result = await api.uploadFiles(fileArray, currentPath) as { success: boolean; error?: string; message?: string };
      if (result.success) {
        await loadFiles();
      } else {
        alert(result.error || 'Ошибка загрузки');
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleNewFolder = async () => {
    if (!newFolderName) return;
    try {
      const result = await api.createFolder(newFolderName, currentPath);
      if (result.success) {
        await loadFiles();
        setNewFolderName('');
        setShowNewFolder(false);
      }
    } catch (err: any) {
      alert(err.message || 'Ошибка создания папки');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот файл?')) return;
    try {
      await api.deleteFile(id);
      setFiles(files.filter(f => f.id !== id));
    } catch (err) {
      console.error('Delete file error:', err);
    }
  };

  const pathParts = currentPath.split('/').filter(Boolean);
  const maxStorage = 10 * 1024 * 1024 * 1024;
  const usedPercent = (totalSize / maxStorage) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Облачное хранилище</h2>
            <p className="text-sm text-gray-400">{files.length} элементов • {formatFileSize(totalSize)} из 10 ГБ</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            multiple
          />
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Папка</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="text-sm font-medium">Загрузить</span>
          </button>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Использовано хранилище</span>
          <span className="text-sm font-medium text-white">{formatFileSize(totalSize)} / 10 ГБ</span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              usedPercent > 80 ? 'bg-red-500' : usedPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(usedPercent, 2)}%` }}
          ></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <button
            onClick={() => { setCurrentPath('/'); setSearch(''); }}
            className="text-sm text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-800"
          >
            <Cloud className="w-4 h-4" />
          </button>
          {pathParts.map((part, index) => (
            <React.Fragment key={index}>
              <span className="text-gray-600">/</span>
              <button
                onClick={() => setCurrentPath('/' + pathParts.slice(0, index + 1).join('/'))}
                className="text-sm text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-800 truncate"
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="bg-gray-800/50 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-40"
          />
        </div>

        <div className="flex items-center bg-gray-800/50 border border-gray-700 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Files */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-800 text-xs font-medium text-gray-500 uppercase">
            <div className="col-span-5">Имя</div>
            <div className="col-span-2">Размер</div>
            <div className="col-span-3">Изменён</div>
            <div className="col-span-2 text-right">Действия</div>
          </div>
          
          {files.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">Папка пуста</p>
            </div>
          ) : (
            files.map(file => (
              <div
                key={file.id}
                className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                onClick={() => {
                  if (file.mime_type === 'folder') {
                    const newPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
                    setCurrentPath(newPath);
                    setSearch('');
                  }
                }}
              >
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  {getFileIcon(file)}
                  <span className="text-sm text-white truncate">{file.original_name || file.name}</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-gray-400">{formatFileSize(file.size)}</span>
                </div>
                <div className="col-span-3 flex items-center">
                  <span className="text-sm text-gray-500">{new Date(file.created_at).toLocaleDateString('ru')}</span>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  {file.mime_type !== 'folder' && (
                    <a
                      href={api.getDownloadUrl(file.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-500 hover:text-blue-400 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                    className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map(file => (
            <div
              key={file.id}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all cursor-pointer group relative"
              onClick={() => {
                if (file.mime_type === 'folder') {
                  const newPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
                  setCurrentPath(newPath);
                  setSearch('');
                }
              }}
            >
              <div className="flex items-center justify-center h-16 mb-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  file.mime_type === 'folder' ? 'bg-amber-500/10' : 'bg-gray-800'
                }`}>
                  {React.cloneElement(getFileIcon(file) as React.ReactElement, { className: 'w-6 h-6' })}
                </div>
              </div>
              <p className="text-sm text-white text-center truncate">{file.original_name || file.name}</p>
              <p className="text-xs text-gray-500 text-center mt-1">{formatFileSize(file.size)}</p>
              
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                  className="p-1 rounded bg-gray-800 text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Новая папка</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mb-4"
              placeholder="Название папки"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleNewFolder()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewFolder(false)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleNewFolder}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
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
