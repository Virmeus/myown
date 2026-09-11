import React, { useState } from 'react';
import { 
  Cloud, Upload, Folder, File, Image, Film, Music, FileText,
  MoreVertical, Download, Trash2, Eye, Grid, List, Search,
  HardDrive, Plus, FolderPlus
} from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  fileType?: string;
  size: number;
  modifiedAt: string;
  path: string;
}

const STORAGE_KEY = 'cloud_storage_files';

function getFiles(): FileItem[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) return JSON.parse(data);
  
  // Default files
  return [
    { id: '1', name: 'Документы', type: 'folder', size: 0, modifiedAt: new Date().toISOString(), path: '/' },
    { id: '2', name: 'Фотографии', type: 'folder', size: 0, modifiedAt: new Date().toISOString(), path: '/' },
    { id: '3', name: 'Видео', type: 'folder', size: 0, modifiedAt: new Date().toISOString(), path: '/' },
    { id: '4', name: 'backup_2024.sql', type: 'file', fileType: 'database', size: 15728640, modifiedAt: new Date(Date.now() - 3600000).toISOString(), path: '/' },
    { id: '5', name: 'report.pdf', type: 'file', fileType: 'pdf', size: 2097152, modifiedAt: new Date(Date.now() - 86400000).toISOString(), path: '/' },
    { id: '6', name: 'config.json', type: 'file', fileType: 'code', size: 4096, modifiedAt: new Date(Date.now() - 172800000).toISOString(), path: '/' },
    { id: '7', name: 'presentation.pptx', type: 'file', fileType: 'document', size: 5242880, modifiedAt: new Date(Date.now() - 259200000).toISOString(), path: '/' },
  ];
}

function saveFiles(files: FileItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '—';
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
  if (file.type === 'folder') return <Folder className="w-5 h-5 text-amber-400" />;
  
  switch (file.fileType) {
    case 'image': return <Image className="w-5 h-5 text-pink-400" />;
    case 'video': return <Film className="w-5 h-5 text-purple-400" />;
    case 'audio': return <Music className="w-5 h-5 text-green-400" />;
    case 'pdf': return <FileText className="w-5 h-5 text-red-400" />;
    case 'code': return <File className="w-5 h-5 text-cyan-400" />;
    case 'database': return <HardDrive className="w-5 h-5 text-emerald-400" />;
    default: return <File className="w-5 h-5 text-gray-400" />;
  }
}

function detectFileType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'svg': case 'webp': return 'image';
    case 'mp4': case 'avi': case 'mov': case 'mkv': case 'webm': return 'video';
    case 'mp3': case 'wav': case 'flac': case 'ogg': return 'audio';
    case 'pdf': return 'pdf';
    case 'js': case 'ts': case 'py': case 'json': case 'yaml': case 'yml': return 'code';
    case 'sql': case 'db': return 'database';
    case 'doc': case 'docx': case 'pptx': case 'xlsx': return 'document';
    default: return 'file';
  }
}

export const CloudStoragePage: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>(getFiles());
  const [currentPath, setCurrentPath] = useState('/');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [search, setSearch] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const currentFiles = files.filter(f => f.path === currentPath);
  const filteredFiles = search 
    ? currentFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : currentFiles;

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const maxStorage = 10 * 1024 * 1024 * 1024; // 10GB
  const usedPercent = (totalSize / maxStorage) * 100;

  const handleUpload = () => {
    // Simulate file upload
    const fakeFiles = ['document.pdf', 'photo.jpg', 'video.mp4', 'archive.zip'];
    const randomFile = fakeFiles[Math.floor(Math.random() * fakeFiles.length)];
    
    const newFile: FileItem = {
      id: crypto.randomUUID(),
      name: randomFile,
      type: 'file',
      fileType: detectFileType(randomFile),
      size: Math.floor(Math.random() * 50000000),
      modifiedAt: new Date().toISOString(),
      path: currentPath,
    };
    
    const updated = [newFile, ...files];
    setFiles(updated);
    saveFiles(updated);
    setShowUploadModal(false);
  };

  const handleNewFolder = () => {
    if (!newFolderName) return;
    
    const folder: FileItem = {
      id: crypto.randomUUID(),
      name: newFolderName,
      type: 'folder',
      size: 0,
      modifiedAt: new Date().toISOString(),
      path: currentPath,
    };
    
    const updated = [folder, ...files];
    setFiles(updated);
    saveFiles(updated);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleDelete = (id: string) => {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    saveFiles(updated);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFiles(newSelected);
  };

  const pathParts = currentPath.split('/').filter(Boolean);

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
            <p className="text-sm text-gray-400">{files.length} файлов • {formatFileSize(totalSize)} из 10 ГБ</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span className="text-sm font-medium hidden sm:inline">Папка</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Upload className="w-4 h-4" />
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
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <button
            onClick={() => setCurrentPath('/')}
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

        {/* Search */}
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

        {/* View Toggle */}
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
      {viewMode === 'list' ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-800 text-xs font-medium text-gray-500 uppercase">
            <div className="col-span-5">Имя</div>
            <div className="col-span-2">Размер</div>
            <div className="col-span-3">Изменён</div>
            <div className="col-span-2 text-right">Действия</div>
          </div>
          
          {/* Files */}
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">Папка пуста</p>
            </div>
          ) : (
            filteredFiles.map(file => (
              <div
                key={file.id}
                className={`grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer ${
                  selectedFiles.has(file.id) ? 'bg-emerald-500/5' : ''
                }`}
                onClick={() => {
                  if (file.type === 'folder') {
                    setCurrentPath(currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`);
                  }
                }}
              >
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  {getFileIcon(file)}
                  <span className="text-sm text-white truncate">{file.name}</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm text-gray-400">{formatFileSize(file.size)}</span>
                </div>
                <div className="col-span-3 flex items-center">
                  <span className="text-sm text-gray-500">{new Date(file.modifiedAt).toLocaleDateString('ru')}</span>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                    className="p-1.5 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
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
          {filteredFiles.map(file => (
            <div
              key={file.id}
              className={`bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all cursor-pointer group ${
                selectedFiles.has(file.id) ? 'border-emerald-500/50 bg-emerald-500/5' : ''
              }`}
              onClick={() => {
                if (file.type === 'folder') {
                  setCurrentPath(currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`);
                }
              }}
            >
              <div className="flex items-center justify-center h-16 mb-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  file.type === 'folder' ? 'bg-amber-500/10' : 'bg-gray-800'
                }`}>
                  {React.cloneElement(getFileIcon(file) as React.ReactElement, { className: 'w-6 h-6' })}
                </div>
              </div>
              <p className="text-sm text-white text-center truncate">{file.name}</p>
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Загрузить файл</h3>
            
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-colors cursor-pointer mb-4">
              <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Перетащите файлы сюда</p>
              <p className="text-xs text-gray-600 mt-1">или нажмите для выбора</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              >
                Загрузить
              </button>
            </div>
          </div>
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
