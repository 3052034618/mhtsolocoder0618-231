import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Share2,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Package,
  Sprout,
  Wrench,
  MoreHorizontal,
  Filter,
  Gift,
} from 'lucide-react';
import type { SharePost } from '../../shared/types.js';
import { useStore } from '../store';
import { shares } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { cn } from '@/lib/utils';

const categoryOptions = [
  { value: 'all', label: '全部' },
  { value: 'seeds', label: '种子' },
  { value: 'seedling', label: '幼苗' },
  { value: 'tool', label: '工具' },
  { value: 'other', label: '其他' },
];

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'available', label: '可领取' },
  { value: 'reserved', label: '已预定' },
  { value: 'claimed', label: '已领取' },
];

const categoryLabels: Record<string, string> = {
  seeds: '种子',
  seedling: '幼苗',
  tool: '工具',
  other: '其他',
};

const categoryIcons: Record<string, React.ReactNode> = {
  seeds: <Sprout className="w-5 h-5" />,
  seedling: <Package className="w-5 h-5" />,
  tool: <Wrench className="w-5 h-5" />,
  other: <MoreHorizontal className="w-5 h-5" />,
};

const categoryColors: Record<string, string> = {
  seeds: 'bg-green-100 text-green-600',
  seedling: 'bg-emerald-100 text-emerald-600',
  tool: 'bg-blue-100 text-blue-600',
  other: 'bg-gray-100 text-gray-600',
};

export default function ShareCommunity() {
  const navigate = useNavigate();
  const { showToast } = useStore();
  const [shareList, setShareList] = useState<SharePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const fetchShares = async () => {
    setLoading(true);
    try {
      const params: { category?: string; status?: string } = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedStatus !== 'all') params.status = selectedStatus;

      const data = await shares.getShares(params);
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setShareList(sorted);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取分享列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShares();
  }, [selectedCategory, selectedStatus]);

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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Share2 className="w-8 h-8 text-green-600" />
            分享社区
          </h1>
          <p className="text-gray-500">分享闲置物品，互助共建美好社区</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">类别筛选</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedCategory(option.value)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                      selectedCategory === option.value
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {option.value !== 'all' && categoryIcons[option.value]}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:w-48">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">状态</span>
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {shareList.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Share2 className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">暂无分享</h3>
            <p className="text-gray-400 text-sm mb-6">
              当前没有符合筛选条件的分享，快来发布第一条吧！
            </p>
            <button
              onClick={() => navigate('/shares/new')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              发布分享
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shareList.map((share) => (
              <div
                key={share.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
              >
                {share.photos && share.photos.length > 0 ? (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={share.photos[0]}
                      alt={share.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={share.status} />
                    </div>
                    {share.status === 'available' && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                          <Gift className="w-3 h-3" />
                          免费领取
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative h-48 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                    <div
                      className={cn(
                        'w-16 h-16 rounded-2xl flex items-center justify-center',
                        categoryColors[share.category]
                      )}
                    >
                      {categoryIcons[share.category]}
                    </div>
                    <div className="absolute top-3 right-3">
                      <StatusBadge status={share.status} />
                    </div>
                    {share.status === 'available' && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                          <Gift className="w-3 h-3" />
                          免费领取
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800 line-clamp-1">
                      {share.title}
                    </h3>
                    <span
                      className={cn(
                        'flex-shrink-0 ml-2 px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1',
                        categoryColors[share.category]
                      )}
                    >
                      {categoryIcons[share.category]}
                      {categoryLabels[share.category]}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {share.description}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span>数量：{share.quantity}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{share.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{share.contact}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <img
                        src={share.user?.avatar}
                        alt={share.user?.username}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm text-gray-500">
                        {share.user?.username || '匿名用户'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(share.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate('/shares/new')}
          className="fixed bottom-8 right-8 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 hover:shadow-xl transition-all flex items-center justify-center group"
        >
          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
        </button>
      </div>
    </div>
  );
}
