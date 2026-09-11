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
  const { authenticated, loading, init, logout } = useAuthStore();
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
