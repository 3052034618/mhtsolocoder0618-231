import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Filter, Loader2, Leaf, Plus, X, Send } from 'lucide-react';
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

const claimSchema = z.object({
  plantingPlan: z.string().min(10, '种植计划至少需要10个字符'),
});

type ClaimForm = z.infer<typeof claimSchema>;

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
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, watch, handleSubmit, reset } = useForm<FilterForm>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      status: '',
      search: '',
    },
  });

  const {
    register: registerClaim,
    handleSubmit: handleSubmitClaim,
    formState: { errors: claimErrors },
    reset: resetClaim,
  } = useForm<ClaimForm>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      plantingPlan: '',
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

  const handleClaimClick = (e: React.MouseEvent, plot: Plot) => {
    e.stopPropagation();
    if (!user) {
      showToast('请先登录', 'error');
      navigate('/login');
      return;
    }
    setSelectedPlot(plot);
    setShowClaimModal(true);
  };

  const onSubmitClaim = async (data: ClaimForm) => {
    if (!selectedPlot) return;
    setSubmitting(true);
    try {
      await claims.createClaim({
        plotId: selectedPlot.id,
        plantingPlan: data.plantingPlan,
      });
      showToast('认领申请已提交，管理员审核后即可使用', 'success');
      setShowClaimModal(false);
      resetClaim();
      setSelectedPlot(null);
      fetchPlots();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '认领失败', 'error');
    } finally {
      setSubmitting(false);
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
                    onClick={(e) => handleClaimClick(e, plot)}
                    className={cn(
                      'absolute bottom-24 right-4 px-4 py-2 rounded-lg',
                      'bg-green-600 text-white text-sm font-medium',
                      'hover:bg-green-700 active:scale-95',
                      'transition-all duration-200',
                      'flex items-center gap-2'
                    )}
                  >
                    <Plus className="w-4 h-4" />
                    认领
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

      {showClaimModal && selectedPlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slideIn overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">申请认领地块</h3>
                <p className="text-green-100 text-sm">地块编号：{selectedPlot.plotNumber}</p>
              </div>
              <button
                onClick={() => {
                  setShowClaimModal(false);
                  setSelectedPlot(null);
                  resetClaim();
                }}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 mb-6 border border-green-100">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">地块编号</span>
                    <p className="font-medium text-gray-800">{selectedPlot.plotNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">面积</span>
                    <p className="font-medium text-gray-800">{selectedPlot.area} ㎡</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">位置</span>
                    <p className="font-medium text-gray-800">{selectedPlot.location}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitClaim(onSubmitClaim)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    种植计划 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="请描述您计划在这块地上种植什么，比如：我计划种植番茄、黄瓜和生菜，采用有机种植方式..."
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border resize-none',
                      claimErrors.plantingPlan
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                      'focus:outline-none focus:ring-2 transition-all'
                    )}
                    {...registerClaim('plantingPlan')}
                  />
                  {claimErrors.plantingPlan && (
                    <p className="mt-1 text-sm text-red-500">{claimErrors.plantingPlan.message as string}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowClaimModal(false);
                      setSelectedPlot(null);
                      resetClaim();
                    }}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        提交中
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        提交申请
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
