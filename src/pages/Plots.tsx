import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Filter, Loader2, Leaf, Plus } from 'lucide-react';
import type { Plot } from '../../shared/types.js';
import { useStore } from '../store';
import { plots, claims } from '../services/api';
import PlotCard from '../components/PlotCard';
import StatusBadge from '../components/StatusBadge';
import { cn } from '@/lib/utils';

const filterSchema = z.object({
  status: z.string(),
  search: z.string(),
});

type FilterForm = z.infer<typeof filterSchema>;

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'available', label: '空闲' },
  { value: 'claimed', label: '已认领' },
  { value: 'maintenance', label: '维护中' },
];

export default function Plots() {
  const navigate = useNavigate();
  const { user, showToast } = useStore();
  const [plotList, setPlotList] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const { register, watch, handleSubmit } = useForm<FilterForm>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      status: '',
      search: '',
    },
  });

  const statusFilter = watch('status');
  const searchQuery = watch('search');

  const fetchPlots = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : undefined;
      const data = await plots.getPlots(params);
      setPlotList(data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取地块列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlots();
  }, [statusFilter]);

  const filteredPlots = plotList.filter((plot) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      plot.plotNumber.toLowerCase().includes(query) ||
      plot.location.toLowerCase().includes(query) ||
      plot.description.toLowerCase().includes(query)
    );
  });

  const handleClaim = async (e: React.MouseEvent, plotId: number) => {
    e.stopPropagation();
    if (!user) {
      showToast('请先登录', 'error');
      navigate('/login');
      return;
    }

    setClaimingId(plotId);
    try {
      await claims.createClaim({ plotId, plantingPlan: '' });
      showToast('认领申请已提交', 'success');
      fetchPlots();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '认领失败', 'error');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Leaf className="w-8 h-8 text-green-600" />
            地块列表
          </h1>
          <p className="text-gray-500">浏览并认领您感兴趣的地块</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <form className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索地块编号、位置..."
                className={cn(
                  'w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200',
                  'focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500',
                  'transition-all duration-200'
                )}
                {...register('search')}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                className={cn(
                  'px-4 py-3 rounded-xl border border-gray-200 bg-white',
                  'focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500',
                  'transition-all duration-200 min-w-[140px]'
                )}
                {...register('status')}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : filteredPlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Leaf className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">暂无地块</h3>
            <p className="text-gray-400 text-sm">没有找到符合条件的地块</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlots.map((plot) => (
              <div key={plot.id} className="relative">
                <PlotCard plot={plot} />
                {plot.status === 'available' && (
                  <button
                    onClick={(e) => handleClaim(e, plot.id)}
                    disabled={claimingId === plot.id}
                    className={cn(
                      'absolute bottom-24 right-4 px-4 py-2 rounded-lg',
                      'bg-green-600 text-white text-sm font-medium',
                      'hover:bg-green-700 active:scale-95',
                      'transition-all duration-200',
                      'flex items-center gap-2',
                      claimingId === plot.id && 'opacity-70 cursor-not-allowed'
                    )}
                  >
                    {claimingId === plot.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        申请中
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        认领
                      </>
                    )}
                  </button>
                )}
                {plot.currentGardener && (
                  <div className="absolute bottom-24 left-4 px-3 py-1.5 bg-white/90 backdrop-blur rounded-lg text-xs text-gray-600">
                    园丁：{plot.currentGardener.username}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
