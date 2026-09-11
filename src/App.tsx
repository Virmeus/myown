import React, { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PasswordManagerPage } from './pages/PasswordManagerPage';
import { MediaDownloaderPage } from './pages/MediaDownloaderPage';
import { CronManagerPage } from './pages/CronManagerPage';
import { CloudStoragePage } from './pages/CloudStoragePage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Menu } from 'lucide-react';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Панель управления', subtitle: 'Обзор системы и статистика' },
  passwords: { title: 'Менеджер паролей', subtitle: 'Безопасное хранение паролей и ключей' },
  media: { title: 'Скачивание медиа', subtitle: 'Загрузка контента из социальных сетей' },
  cron: { title: 'Cron задачи', subtitle: 'Автоматизация и планирование задач' },
  storage: { title: 'Облачное хранилище', subtitle: 'Управление файлами и документами' },
};

function App() {
  const { authenticated, loading, init, logout, error } = useAuthStore();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
          <p className="text-gray-400 text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Показываем ошибку если сервер недоступен
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-2xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Сервер недоступен</h2>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <div className="bg-gray-800 rounded-lg p-4 text-left">
              <p className="text-xs text-gray-500 mb-2">Запустите бэкенд командой:</p>
              <code className="text-sm text-emerald-400 font-mono">node server/index.js</code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage />;
  }

  const pageInfo = pageTitles[currentPage] || pageTitles.dashboard;

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'passwords':
        return <PasswordManagerPage />;
      case 'media':
        return <MediaDownloaderPage />;
      case 'cron':
        return <CronManagerPage />;
      case 'storage':
        return <CloudStoragePage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage}
        onLogout={logout}
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      
      <div className="lg:ml-64 transition-all duration-300">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold text-white">{pageInfo.title}</h1>
        </div>

        <div className="hidden lg:block">
          <Header title={pageInfo.title} subtitle={pageInfo.subtitle} />
        </div>
        
        <main className="p-4 lg:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
