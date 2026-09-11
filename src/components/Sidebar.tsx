import React, { useState } from 'react';
import { 
  LayoutDashboard, Key, Download, Clock, Cloud, 
  LogOut, Menu, X, Shield, ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Панель управления', icon: LayoutDashboard },
  { id: 'passwords', label: 'Менеджер паролей', icon: Key },
  { id: 'media', label: 'Скачивание медиа', icon: Download },
  { id: 'cron', label: 'Cron задачи', icon: Clock },
  { id: 'storage', label: 'Облачное хранилище', icon: Cloud },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, onLogout, isMobileOpen, onMobileClose }) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleNavigate = (page: string) => {
    onNavigate(page);
    onMobileClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 transition-all duration-300 z-50 flex flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'lg:w-16' : 'lg:w-64'}
        w-64
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Shield className="w-7 h-7 text-violet-400" />
              <span className="text-white font-bold text-lg">AdminPanel</span>
            </div>
          )}
          {collapsed && <Shield className="w-7 h-7 text-violet-400 mx-auto" />}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-violet-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                {!collapsed && (
                  <>
                    <span className="text-sm font-medium">{item.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span className="text-sm font-medium">Выйти</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
