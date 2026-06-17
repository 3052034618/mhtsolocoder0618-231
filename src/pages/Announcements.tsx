import { useState, useEffect } from 'react';
import {
  Megaphone,
  Loader2,
  Clock,
  Calendar,
  AlertTriangle,
  Star,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import type { Announcement } from '../../shared/types.js';
import { useStore } from '../store';
import { announcements } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { cn } from '@/lib/utils';

const typeOptions = [
  { value: 'all', label: '全部' },
  { value: 'maintenance', label: '维护排班' },
  { value: 'rule', label: '规则说明' },
  { value: 'event', label: '活动通知' },
  { value: 'general', label: '一般公告' },
];

const priorityOptions = [
  { value: 'all', label: '全部优先级' },
  { value: 'urgent', label: '紧急' },
  { value: 'important', label: '重要' },
  { value: 'normal', label: '普通' },
];

const typeLabels: Record<string, string> = {
  maintenance: '维护排班',
  rule: '规则说明',
  event: '活动通知',
  general: '一般公告',
};

const priorityLabels: Record<string, string> = {
  urgent: '紧急',
  important: '重要',
  normal: '普通',
};

const typeBadgeVariants: Record<string, string> = {
  maintenance: 'bg-blue-100 text-blue-700',
  rule: 'bg-purple-100 text-purple-700',
  event: 'bg-pink-100 text-pink-700',
  general: 'bg-gray-100 text-gray-700',
};

export default function Announcements() {
  const { showToast } = useStore();
  const [announcementList, setAnnouncementList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const params: { type?: string; priority?: string } = {};
      if (selectedType !== 'all') params.type = selectedType;
      if (selectedPriority !== 'all') params.priority = selectedPriority;

      const data = await announcements.getAnnouncements(params);

      const sorted = [...data].sort((a, b) => {
        const priorityOrder: Record<string, number> = { urgent: 0, important: 1, normal: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setAnnouncementList(sorted);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取公告列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [selectedType, selectedPriority]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isContentLong = (content: string) => content.length > 150;

  const getBorderStyle = (priority: string) => {
    if (priority === 'urgent') return 'border-red-400 border-2';
    if (priority === 'important') return 'border-yellow-400 border-2';
    return 'border-gray-100';
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'urgent') {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
    if (priority === 'important') {
      return <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" />;
    }
    return <Megaphone className="w-5 h-5 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-green-600" />
            公告板
          </h1>
          <p className="text-gray-500">查看最新通知和重要信息</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">类型筛选</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedType(option.value)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                      selectedType === option.value
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:w-48">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">优先级</span>
              </div>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {announcementList.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">暂无公告</h3>
            <p className="text-gray-400 text-sm">当前没有符合筛选条件的公告</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcementList.map((announcement) => (
              <div
                key={announcement.id}
                className={cn(
                  'bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-all',
                  getBorderStyle(announcement.priority)
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                        announcement.priority === 'urgent' && 'bg-red-50',
                        announcement.priority === 'important' && 'bg-yellow-50',
                        announcement.priority === 'normal' && 'bg-gray-50'
                      )}
                    >
                      {getPriorityIcon(announcement.priority)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {announcement.title}
                        </h3>
                        <span
                          className={cn(
                            'px-2.5 py-1 text-xs font-medium rounded-full',
                            typeBadgeVariants[announcement.type]
                          )}
                        >
                          {typeLabels[announcement.type]}
                        </span>
                        <StatusBadge
                          status={announcement.priority}
                          variant={
                            announcement.priority === 'urgent'
                              ? 'error'
                              : announcement.priority === 'important'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          发布于{' '}
                          {new Date(announcement.createdAt).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                        {announcement.validUntil ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            有效期至{' '}
                            {new Date(announcement.validUntil).toLocaleDateString('zh-CN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <Clock className="w-4 h-4" />
                            长期有效
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pl-16">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p
                      className={cn(
                        'text-gray-700 leading-relaxed',
                        !expandedIds.has(announcement.id) &&
                          isContentLong(announcement.content) &&
                          'line-clamp-3'
                      )}
                    >
                      {announcement.content}
                    </p>
                    {isContentLong(announcement.content) && (
                      <button
                        onClick={() => toggleExpand(announcement.id)}
                        className="mt-2 text-sm text-green-600 font-medium hover:text-green-700 flex items-center gap-1"
                      >
                        {expandedIds.has(announcement.id) ? (
                          <>
                            收起 <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            展开 <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {announcement.creator && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                      <img
                        src={announcement.creator.avatar}
                        alt={announcement.creator.username}
                        className="w-6 h-6 rounded-full"
                      />
                      <span>发布者：{announcement.creator.username}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
