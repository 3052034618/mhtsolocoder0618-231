import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  Leaf,
  TreeDeciduous,
  Bell,
  CalendarClock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  PlusCircle,
  BookOpen,
  HandHeart,
  Share2,
  Wallet
} from 'lucide-react';
import type { Plot, Announcement } from '../../shared/types';
import { useStore } from '../store';
import { plots, announcements, bills } from '../services/api';
import { cn } from '@/lib/utils';

interface Stats {
  totalPlots: number;
  claimedPlots: number;
  availablePlots: number;
  announcements: number;
  pendingTasks: number;
}

function AnimatedNumber({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

export default function Home() {
  const { user } = useStore();
  const [stats, setStats] = useState<Stats>({
    totalPlots: 0,
    claimedPlots: 0,
    availablePlots: 0,
    announcements: 0,
    pendingTasks: 0
  });
  const [plotsData, setPlotsData] = useState<Plot[]>([]);
  const [announcementsData, setAnnouncementsData] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plotsResponse, announcementsResponse, billsResponse] = await Promise.all([
          plots.getPlots(),
          announcements.getAnnouncements({ priority: 'important' }),
          bills.getBillStats()
        ]);

        const claimed = plotsResponse.filter(p => p.status === 'claimed').length;
        const available = plotsResponse.filter(p => p.status === 'available').length;

        setStats({
          totalPlots: plotsResponse.length,
          claimedPlots: claimed,
          availablePlots: available,
          announcements: announcementsResponse.length,
          pendingTasks: billsResponse.unpaid.count
        });

        setPlotsData(plotsResponse);
        setAnnouncementsData(announcementsResponse.slice(0, 2));
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-gradient-to-br from-accent to-secondary';
      case 'claimed':
        return 'bg-gradient-to-br from-primary to-secondary';
      case 'maintenance':
        return 'bg-gradient-to-br from-amber-400 to-orange-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return '空闲';
      case 'claimed':
        return '已认领';
      case 'maintenance':
        return '维护中';
      default:
        return '未知';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'important':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const statCards = [
    {
      label: '地块总数',
      value: stats.totalPlots,
      icon: TreeDeciduous,
      color: 'from-primary to-secondary',
      delay: 0
    },
    {
      label: '已认领',
      value: stats.claimedPlots,
      icon: Sprout,
      color: 'from-secondary to-accent',
      delay: 100
    },
    {
      label: '空闲地块',
      value: stats.availablePlots,
      icon: Leaf,
      color: 'from-accent to-emerald-400',
      delay: 200
    },
    {
      label: '公告数',
      value: stats.announcements,
      icon: Bell,
      color: 'from-soil to-amber-600',
      delay: 300
    },
    {
      label: '待办提醒',
      value: stats.pendingTasks,
      icon: CalendarClock,
      color: 'from-rose-500 to-pink-500',
      delay: 400
    }
  ];

  const quickActions = [
    {
      label: '查看地块',
      icon: Sprout,
      path: '/plots',
      color: 'from-primary to-secondary'
    },
    {
      label: '申请认领',
      icon: HandHeart,
      path: '/claims',
      color: 'from-secondary to-accent'
    },
    {
      label: '种植日志',
      icon: BookOpen,
      path: '/journal',
      color: 'from-soil to-amber-600'
    },
    {
      label: '分享社区',
      icon: Share2,
      path: '/community',
      color: 'from-rose-500 to-pink-500'
    },
    {
      label: '费用中心',
      icon: Wallet,
      path: '/bills',
      color: 'from-blue-500 to-indigo-500'
    },
    {
      label: '发布公告',
      icon: PlusCircle,
      path: '/admin/announcements',
      color: 'from-purple-500 to-violet-500',
      adminOnly: true
    }
  ];

  const gridSize = Math.ceil(Math.sqrt(plotsData.length));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-secondary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-secondary to-accent p-8 lg:p-12 animate-fadeIn">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-accent/20 rounded-full blur-2xl animate-pulse" />
          <svg className="absolute bottom-0 left-0 w-full h-24 opacity-30" viewBox="0 0 800 100" preserveAspectRatio="none">
            <path d="M0,80 Q150,40 300,70 T600,50 T800,60 L800,100 L0,100 Z" fill="white" />
          </svg>
          <div className="absolute top-6 right-8 opacity-20">
            <TreeDeciduous className="w-24 h-24 text-white" />
          </div>
          <div className="absolute bottom-4 right-32 opacity-20">
            <Sprout className="w-16 h-16 text-white" />
          </div>
          <div className="absolute top-12 right-48 opacity-20">
            <Leaf className="w-12 h-12 text-white" />
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Leaf className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm">欢迎回来</p>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                {user?.username || '园丁'}，祝您今天种植愉快！
              </h1>
            </div>
          </div>
          <p className="text-white/90 max-w-2xl text-lg">
            社区共享花园是一个让城市居民体验农耕乐趣、分享收获喜悦的平台。
            在这里，您可以认领属于自己的小菜园，种植新鲜的有机蔬菜，与邻居分享种子和农具。
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <Link to="/plots" className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-medium hover:bg-white/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              <Sprout className="w-5 h-5" />
              浏览地块
            </Link>
            <Link to="/claims" className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-medium hover:bg-white/30 transition-all border border-white/30">
              <PlusCircle className="w-5 h-5" />
              申请认领
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={cn(
              'card animate-fadeIn cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1',
            )}
            style={{ animationDelay: `${stat.delay}ms` }}
          >
            <div className={cn(
              'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg',
              stat.color
            )}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-3xl font-bold text-gray-800 mb-1">
              <AnimatedNumber value={stat.value} />
            </p>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-accent">
              <TrendingUp className="w-3 h-3" />
              <span>实时更新</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card animate-fadeIn" style={{ animationDelay: '500ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <TreeDeciduous className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">地块分布</h2>
                <p className="text-sm text-gray-500">点击查看详情</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-accent to-secondary"></div>
                <span className="text-gray-600">空闲</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-primary to-secondary"></div>
                <span className="text-gray-600">已认领</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500"></div>
                <span className="text-gray-600">维护中</span>
              </div>
            </div>
          </div>

          <div
            className="grid gap-2 p-4 bg-cream rounded-2xl"
            style={{
              gridTemplateColumns: `repeat(${Math.min(gridSize, 8)}, minmax(0, 1fr))`
            }}
          >
            {plotsData.map((plot, index) => (
              <Link
                key={plot.id}
                to={`/plots/${plot.id}`}
                className={cn(
                  'aspect-square rounded-xl flex flex-col items-center justify-center p-1 group cursor-pointer',
                  'transition-all duration-300 hover:scale-110 hover:shadow-lg',
                  getStatusColor(plot.status)
                )}
                style={{ animationDelay: `${(index % 20) * 30}ms` }}
                title={`${plot.plotNumber} - ${getStatusLabel(plot.status)}`}
              >
                <span className="text-[10px] font-bold text-white drop-shadow-sm">
                  {plot.plotNumber}
                </span>
                <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center transition-opacity">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Link to="/plots" className="inline-flex items-center gap-1 text-secondary font-medium hover:text-primary transition-colors">
              查看全部地块
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card animate-fadeIn" style={{ animationDelay: '600ms' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-soil to-amber-600 flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">最新公告</h2>
                <p className="text-sm text-gray-500">重要通知</p>
              </div>
            </div>

            <div className="space-y-3">
              {announcementsData.length > 0 ? (
                announcementsData.map((announcement) => (
                  <Link
                    key={announcement.id}
                    to="/announcements"
                    className="block p-4 bg-cream rounded-xl hover:bg-accent/10 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      {announcement.priority === 'urgent' ? (
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      ) : announcement.priority === 'important' ? (
                        <Bell className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Bell className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-800 truncate group-hover:text-secondary transition-colors">
                            {announcement.title}
                          </h3>
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium border',
                            getPriorityColor(announcement.priority)
                          )}>
                            {announcement.priority === 'urgent' ? '紧急' : '重要'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {announcement.content}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>暂无重要公告</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Link to="/announcements" className="inline-flex items-center gap-1 text-secondary font-medium hover:text-primary transition-colors">
                查看全部公告
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="card animate-fadeIn" style={{ animationDelay: '700ms' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                <PlusCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">快捷入口</h2>
                <p className="text-sm text-gray-500">常用功能</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {quickActions
                .filter(action => !action.adminOnly || user?.role === 'admin')
                .map((action) => (
                  <Link
                    key={action.path}
                    to={action.path}
                    className="flex flex-col items-center gap-2 p-4 bg-cream rounded-xl hover:shadow-lg transition-all duration-300 group hover:-translate-y-1"
                  >
                    <div className={cn(
                      'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow',
                      action.color
                    )}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-secondary transition-colors">
                      {action.label}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
