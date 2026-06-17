import { useState } from 'react';
import { Menu, LogOut, User, ChevronDown, Bell, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onMenuClick?: () => void;
  className?: string;
}

export default function Navbar({ onMenuClick, className }: NavbarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, logout, showToast } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    showToast('已安全退出', 'success');
    navigate('/login');
  };

  return (
    <nav
      className={cn(
        'h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 hidden sm:block">
          共享菜园管理系统
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-medium text-sm overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-800">
                {user?.username || '用户'}
              </p>
              <p className="text-xs text-gray-500">
                {user?.role === 'admin' ? '管理员' : '园丁'}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform hidden md:block',
                showDropdown && 'rotate-180'
              )}
            />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fadeIn">
              <div className="px-4 py-3 border-b border-gray-100 md:hidden">
                <p className="text-sm font-medium text-gray-800">
                  {user?.username || '用户'}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'admin' ? '管理员' : '园丁'}
                </p>
              </div>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  navigate('/profile');
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <User className="w-4 h-4" />
                个人中心
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  navigate('/settings');
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
              >
                <Settings className="w-4 h-4" />
                账号设置
              </button>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
