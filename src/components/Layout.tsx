import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Home,
  Sprout,
  HandHeart,
  BookOpen,
  Bell,
  Share2,
  Wallet,
  CalendarClock,
  User,
  LayoutDashboard,
  FileCheck,
  Megaphone,
  X,
  Leaf,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../store';
import Navbar from './Navbar';
import Toast from './Toast';
import { cn } from '@/lib/utils';

interface MenuItem {
  path: string;
  label: string;
  icon: typeof Home;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { path: '/', label: '首页', icon: Home },
  { path: '/plots', label: '地块', icon: Sprout },
  { path: '/claims', label: '认领', icon: HandHeart },
  { path: '/journal', label: '种植日志', icon: BookOpen },
  { path: '/announcements', label: '公告板', icon: Bell },
  { path: '/community', label: '分享社区', icon: Share2 },
  { path: '/bills', label: '费用中心', icon: Wallet },
  { path: '/renewals', label: '续期提醒', icon: CalendarClock },
  { path: '/profile', label: '个人中心', icon: User },
];

const adminMenuItems: MenuItem[] = [
  { path: '/admin/plots', label: '地块管理', icon: LayoutDashboard, adminOnly: true },
  { path: '/admin/claims', label: '认领审核', icon: FileCheck, adminOnly: true },
  { path: '/admin/announcements', label: '公告管理', icon: Megaphone, adminOnly: true },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useStore();
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAdmin = user?.role === 'admin';
  const allMenuItems = isAdmin ? [...menuItems, ...adminMenuItems] : menuItems;

  return (
    <div className="min-h-screen bg-cream">
      <Toast />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg">共享菜园</h1>
              <p className="text-xs text-gray-500">智慧农场管理</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/20'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight
                  className={cn(
                    'w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0'
                  )}
                />
              </NavLink>
            ))}
          </div>

          {isAdmin && (
            <div className="mt-6">
              <div className="px-3 mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  管理员
                </span>
              </div>
              <div className="space-y-1">
                {adminMenuItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                        isActive
                          ? 'bg-gradient-to-r from-soil to-amber-700 text-white shadow-md shadow-soil/20'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )
                    }
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0'
                      )}
                    />
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gradient-to-r from-accent/20 to-secondary/20 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-800 mb-1">
              {isAdmin ? '管理员模式' : '欢迎回来'}
            </p>
            <p className="text-xs text-gray-500">
              {isAdmin ? '您拥有系统管理权限' : '享受您的种植时光'}
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">
          <div className="container mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
