import React, { useState, useEffect } from 'react';
import { 
  Key, Plus, Search, Eye, EyeOff, Copy, Trash2, RefreshCw, 
  Shield, Edit2, Check, X, KeyRound
} from 'lucide-react';
import { generatePassword, generateAPIKey } from '../utils/crypto';

interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url?: string;
  category: string;
  notes?: string;
  createdAt: string;
  type: 'password' | 'api_key' | 'token';
}

const STORAGE_KEY = 'password_manager_entries';

function getEntries(): PasswordEntry[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveEntries(entries: PasswordEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export const PasswordManagerPage: React.FC = () => {
  const [entries, setEntries] = useState<PasswordEntry[]>(getEntries());
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Add form state
  const [newEntry, setNewEntry] = useState<Partial<PasswordEntry>>({
    title: '',
    username: '',
    password: '',
    url: '',
    category: 'general',
    notes: '',
    type: 'password',
  });

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  const filteredEntries = entries.filter(entry =>
    entry.title.toLowerCase().includes(search.toLowerCase()) ||
    entry.username.toLowerCase().includes(search.toLowerCase()) ||
    entry.category.toLowerCase().includes(search.toLowerCase())
  );

  const togglePasswordVisibility = (id: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisiblePasswords(newVisible);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAdd = () => {
    if (!newEntry.title || !newEntry.password) return;
    
    const entry: PasswordEntry = {
      id: crypto.randomUUID(),
      title: newEntry.title || '',
      username: newEntry.username || '',
      password: newEntry.password || '',
      url: newEntry.url,
      category: newEntry.category || 'general',
      notes: newEntry.notes,
      createdAt: new Date().toISOString(),
      type: newEntry.type || 'password',
    };
    
    setEntries([entry, ...entries]);
    setNewEntry({ title: '', username: '', password: '', url: '', category: 'general', notes: '', type: 'password' });
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const handleGeneratePassword = () => {
    const password = generatePassword(20, { uppercase: true, lowercase: true, numbers: true, symbols: true });
    setNewEntry({ ...newEntry, password });
  };

  const handleGenerateAPIKey = () => {
    const key = generateAPIKey();
    setNewEntry({ ...newEntry, password: key, type: 'api_key' });
  };

  const categories = ['general', 'social', 'finance', 'work', 'api', 'database'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Менеджер паролей и ключей</h2>
            <p className="text-sm text-gray-400">{entries.length} записей</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors shadow-lg shadow-violet-500/20"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Добавить</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию, логину или категории..."
          className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
        />
      </div>

      {/* Entries List */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <KeyRound className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">Нет сохранённых записей</p>
            <p className="text-sm text-gray-600 mt-1">Нажмите "Добавить" чтобы создать первую запись</p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div key={entry.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all group">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  entry.type === 'api_key' ? 'bg-amber-500/10 text-amber-400' :
                  entry.type === 'token' ? 'bg-blue-500/10 text-blue-400' :
                  'bg-violet-500/10 text-violet-400'
                }`}>
                  {entry.type === 'api_key' ? <Shield className="w-5 h-5" /> : <Key className="w-5 h-5" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-white truncate">{entry.title}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize">
                      {entry.category}
                    </span>
                    {entry.type !== 'password' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 capitalize">
                        {entry.type === 'api_key' ? 'API Key' : 'Token'}
                      </span>
                    )}
                  </div>
                  
                  {entry.username && (
                    <p className="text-xs text-gray-500 mb-2">Логин: {entry.username}</p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300 font-mono truncate max-w-[200px]">
                      {visiblePasswords.has(entry.id) ? entry.password : '••••••••••••'}
                    </code>
                    <button
                      onClick={() => togglePasswordVisibility(entry.id)}
                      className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {visiblePasswords.has(entry.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(entry.password, entry.id)}
                      className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {copied === entry.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  
                  {entry.url && (
                    <p className="text-xs text-gray-600 mt-2 truncate">{entry.url}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingId(entry.id)}
                    className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
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
              <h3 className="text-lg font-semibold text-white">Новая запись</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Название</label>
                <input
                  type="text"
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  placeholder="GitHub, AWS, Database..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">Тип</label>
                  <select
                    value={newEntry.type}
                    onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value as any })}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  >
                    <option value="password">Пароль</option>
                    <option value="api_key">API Key</option>
                    <option value="token">Token</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1 block">Категория</label>
                  <select
                    value={newEntry.category}
                    onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Логин / Идентификатор</label>
                <input
                  type="text"
                  value={newEntry.username}
                  onChange={(e) => setNewEntry({ ...newEntry, username: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  placeholder="username@email.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Пароль / Ключ</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEntry.password}
                    onChange={(e) => setNewEntry({ ...newEntry, password: e.target.value })}
                    className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    placeholder="Введите или сгенерируйте..."
                  />
                  <button
                    onClick={handleGeneratePassword}
                    className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
                    title="Сгенерировать пароль"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleGenerateAPIKey}
                    className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
                    title="Сгенерировать API ключ"
                  >
                    <Shield className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">URL (опционально)</label>
                <input
                  type="text"
                  value={newEntry.url}
                  onChange={(e) => setNewEntry({ ...newEntry, url: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Заметки</label>
                <textarea
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none h-20"
                  placeholder="Дополнительная информация..."
                />
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
                className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors shadow-lg shadow-violet-500/20"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
