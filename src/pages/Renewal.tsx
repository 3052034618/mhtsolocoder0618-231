import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Bell,
  CalendarClock,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  RefreshCw,
  XCircle,
  MapPin,
  User,
  Send
} from 'lucide-react';
import type { Claim, Plot } from '../../shared/types.js';
import { useStore } from '../store';
import { claims as claimsApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { cn } from '@/lib/utils';

const renewSchema = z.object({
  durationMonths: z.coerce.number().min(1, '请选择续期时长').max(24, '最长续期24个月')
});

type RenewFormData = z.infer<typeof renewSchema>;

interface PlotWithClaim extends Plot {
  currentClaim: Claim;
}

const durationOptions = [
  { value: 1, label: '1 个月', price: '¥50' },
  { value: 3, label: '3 个月', price: '¥140' },
  { value: 6, label: '6 个月', price: '¥260' },
  { value: 12, label: '12 个月', price: '¥480' }
];

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default function Renewal() {
  const { user, showToast } = useStore();
  const [plots, setPlots] = useState<PlotWithClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<PlotWithClaim | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<RenewFormData>({
    resolver: zodResolver(renewSchema),
    defaultValues: {
      durationMonths: 1
    }
  });

  const durationMonths = watch('durationMonths');

  const fetchExpiringPlots = async () => {
    setLoading(true);
    try {
      const params = user?.role === 'admin' ? { status: 'approved' } : undefined;
      const claimsData = await claimsApi.getClaims(params);
      
      const plotsWithClaims: PlotWithClaim[] = [];
      
      for (const claim of claimsData) {
        if (!claim.plotId || !claim.plot) continue;
        
        if (user?.role !== 'admin' && claim.userId !== user?.id) continue;
        
        const daysRemaining = getDaysRemaining(claim.endDate);
        if (daysRemaining > 30) continue;
        
        if (claim.plot.status === 'claimed') {
          plotsWithClaims.push({
            ...claim.plot,
            currentClaim: claim
          } as PlotWithClaim);
        }
      }
      
      plotsWithClaims.sort((a, b) => {
        const daysA = getDaysRemaining(a.currentClaim.endDate);
        const daysB = getDaysRemaining(b.currentClaim.endDate);
        return daysA - daysB;
      });
      
      setPlots(plotsWithClaims);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiringPlots();
  }, [user]);

  const handleRenew = (plot: PlotWithClaim) => {
    setSelectedPlot(plot);
    setShowRenewModal(true);
    reset({ durationMonths: 1 });
  };

  const handleRelease = (plot: PlotWithClaim) => {
    setSelectedPlot(plot);
    setShowReleaseModal(true);
  };

  const onRenewSubmit = async (data: RenewFormData) => {
    if (!selectedPlot) return;
    setActionLoading(selectedPlot.id);
    try {
      await claimsApi.renewClaim(selectedPlot.currentClaim.id, {
        durationMonths: data.durationMonths
      });
      showToast('续期成功', 'success');
      setShowRenewModal(false);
      fetchExpiringPlots();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '续期失败', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmRelease = async () => {
    if (!selectedPlot) return;
    setActionLoading(selectedPlot.id);
    try {
      await claimsApi.releaseClaim(selectedPlot.currentClaim.id);
      showToast('地块已释放成功', 'success');
      setShowReleaseModal(false);
      fetchExpiringPlots();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '释放失败', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendReminder = (plot: PlotWithClaim) => {
    showToast(`已向 ${plot.currentClaim.user?.username || '用户'} 发送续期提醒`, 'success');
  };

  const closeModals = () => {
    setShowRenewModal(false);
    setShowReleaseModal(false);
    setSelectedPlot(null);
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 0) return 'bg-red-500';
    if (days <= 7) return 'bg-red-400';
    if (days <= 14) return 'bg-orange-400';
    return 'bg-yellow-400';
  };

  const getUrgencyBg = (days: number) => {
    if (days <= 0) return 'border-red-200 bg-red-50';
    if (days <= 7) return 'border-red-100 bg-red-50/50';
    if (days <= 14) return 'border-orange-100 bg-orange-50/50';
    return 'border-yellow-100 bg-yellow-50/50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Bell className="w-8 h-8 text-green-600" />
            续期提醒
          </h1>
          <p className="text-gray-500">
            {user?.role === 'admin' ? '管理所有即将到期的地块' : '管理您即将到期的地块'}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : plots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">暂无到期地块</h3>
            <p className="text-gray-400 text-sm">
              {user?.role === 'admin' ? '当前没有即将到期的地块' : '您认领的地块都在有效期内'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plots.map((plot) => {
              const daysRemaining = getDaysRemaining(plot.currentClaim.endDate);
              return (
                <div
                  key={plot.id}
                  className={cn(
                    'bg-white rounded-2xl shadow-sm border-2 p-6 hover:shadow-md transition-all',
                    getUrgencyBg(daysRemaining)
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', getUrgencyColor(daysRemaining))}>
                        <CalendarClock className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          {plot.plotNumber}
                        </h3>
                        <p className="text-sm text-gray-500">{plot.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {daysRemaining <= 0 ? (
                        <div className="flex items-center gap-1 px-3 py-1 bg-red-100 rounded-full">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium text-red-600">已到期</span>
                        </div>
                      ) : daysRemaining <= 7 ? (
                        <div className="flex items-center gap-1 px-3 py-1 bg-red-100 rounded-full">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium text-red-600">紧急</span>
                        </div>
                      ) : (
                        <StatusBadge status="pending" />
                      )}
                    </div>
                  </div>

                  {user?.role === 'admin' && plot.currentClaim.user && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-white/60 rounded-xl">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        园丁：{plot.currentClaim.user.username}
                      </span>
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">到期日期</span>
                      <span className="font-medium text-gray-800">
                        {formatDate(plot.currentClaim.endDate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">剩余天数</span>
                      <span className={cn(
                        'text-2xl font-bold',
                        daysRemaining <= 0 ? 'text-red-500' :
                        daysRemaining <= 7 ? 'text-red-500' :
                        daysRemaining <= 14 ? 'text-orange-500' : 'text-yellow-500'
                      )}>
                        {daysRemaining <= 0 ? '已过期' : `${daysRemaining} 天`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">开始日期</span>
                      <span className="text-gray-600">
                        {formatDate(plot.currentClaim.startDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {user?.role === 'admin' ? (
                      <>
                        <button
                          onClick={() => handleSendReminder(plot)}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          发送提醒
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRelease(plot)}
                          disabled={actionLoading === plot.id}
                          className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          不续期
                        </button>
                        <button
                          onClick={() => handleRenew(plot)}
                          disabled={actionLoading === plot.id}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {actionLoading === plot.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              处理中
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              立即续期
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showRenewModal && selectedPlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">确认续期</h2>
                <button
                  onClick={closeModals}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-white/80 mt-1">
                {selectedPlot.plotNumber} - {selectedPlot.location}
              </p>
            </div>
            <form onSubmit={handleSubmit(onRenewSubmit)} className="p-6 space-y-6">
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">当前到期日</span>
                  <span className="font-medium text-gray-800">
                    {formatDate(selectedPlot.currentClaim.endDate)}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  选择续期时长
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {durationOptions.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all',
                        Number(durationMonths) === option.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        className="sr-only"
                        {...register('durationMonths')}
                      />
                      <span className="font-semibold text-gray-800">{option.label}</span>
                      <span className="text-sm text-green-600 mt-1">{option.price}</span>
                    </label>
                  ))}
                </div>
                {errors.durationMonths && (
                  <p className="mt-2 text-sm text-red-500">{errors.durationMonths.message}</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === selectedPlot.id}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading === selectedPlot.id ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      续期中...
                    </>
                  ) : (
                    '确认续期'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReleaseModal && selectedPlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">确认释放</h2>
                <button
                  onClick={closeModals}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-white/80 mt-1">
                {selectedPlot.plotNumber} - {selectedPlot.location}
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-center py-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-800 font-medium mb-2">确定要释放此地块吗？</p>
                <p className="text-gray-500 text-sm">释放后您将失去该地块的使用权，此操作不可撤销。</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeModals}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={confirmRelease}
                  disabled={actionLoading === selectedPlot.id}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-medium hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading === selectedPlot.id ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    '确认释放'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
