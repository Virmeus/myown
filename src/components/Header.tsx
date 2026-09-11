import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { user } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Поиск..." 
              className="bg-transparent text-sm text-gray-300 placeholder-gray-500 outline-none w-40"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-700 transition-colors">
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full"></span>
          </button>
          
          {/* User */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-white">{user?.username || 'Admin'}</p>
              <p className="text-xs text-gray-500">{user?.role || 'admin'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
