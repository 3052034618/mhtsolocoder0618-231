import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  MapPin,
  Maximize2,
  User,
  Calendar,
  FileText,
  Droplets,
  Zap,
  BookOpen,
  Send,
  Loader2,
  History,
} from 'lucide-react';
import type { Plot, Claim, Bill, JournalEntry } from '../../shared/types.js';
import { useStore } from '../store';
import { plots, claims, bills, journal } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { cn } from '@/lib/utils';

const claimSchema = z.object({
  plantingPlan: z.string().min(10, '种植计划至少需要10个字符'),
});

type ClaimForm = z.infer<typeof claimSchema>;

export default function PlotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, showToast } = useStore();
  const [plot, setPlot] = useState<Plot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [claimHistory, setClaimHistory] = useState<Claim[]>([]);
  const [billStats, setBillStats] = useState<{ water: number; electricity: number } | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [showClaimForm, setShowClaimForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClaimForm>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      plantingPlan: '',
    },
  });

  const fetchPlotDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const plotId = parseInt(id);
      const [plotData, claimsData, billsData, journalData] = await Promise.all([
        plots.getPlot(plotId),
        claims.getClaims(),
        bills.getBills(),
        journal.getJournal(plotId),
      ]);

      setPlot(plotData);
      setClaimHistory(claimsData.filter((c) => c.plotId === plotId));
      setJournalEntries(journalData);

      const plotBills = billsData.filter((b) => b.plotId === plotId);
      const totalWater = plotBills.reduce((sum, b) => sum + b.waterUsage, 0);
      const totalElectricity = plotBills.reduce((sum, b) => sum + b.electricityUsage, 0);
      setBillStats({ water: totalWater, electricity: totalElectricity });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取地块详情失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlotDetail();
  }, [id]);

  const onSubmitClaim = async (data: ClaimForm) => {
    if (!plot || !user) return;
    setSubmitting(true);
    try {
      await claims.createClaim({
        plotId: plot.id,
        plantingPlan: data.plantingPlan,
      });
      showToast('认领申请已提交', 'success');
      setShowClaimForm(false);
      reset();
      fetchPlotDetail();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '提交申请失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveClaim = claimHistory.some(
    (c) => c.status === 'pending' || c.status === 'approved' || c.status === 'waiting'
  );

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

  if (!plot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">地块不存在</p>
          <button
            onClick={() => navigate('/plots')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/plots')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回列表
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">
                    地块 {plot.plotNumber}
                  </h1>
                  <StatusBadge status={plot.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">面积</p>
                    <p className="font-semibold text-gray-800">{plot.area} ㎡</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">位置</p>
                    <p className="font-semibold text-gray-800">{plot.location}</p>
                  </div>
                </div>
              </div>

              {plot.description && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-2">描述</p>
                  <p className="text-gray-700">{plot.description}</p>
                </div>
              )}
            </div>

            {plot.currentGardener && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  当前园丁
                </h2>
                <div className="flex items-center gap-4">
                  <img
                    src={plot.currentGardener.avatar || 'https://via.placeholder.com/64'}
                    alt={plot.currentGardener.username}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-gray-800">{plot.currentGardener.username}</p>
                    <p className="text-sm text-gray-500">{plot.currentGardener.email}</p>
                    <p className="text-sm text-gray-500">{plot.currentGardener.phone}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-green-600" />
                历史认领记录
              </h2>
              {claimHistory.length === 0 ? (
                <p className="text-gray-400 text-center py-8">暂无认领记录</p>
              ) : (
                <div className="space-y-3">
                  {claimHistory.map((claim) => (
                    <div
                      key={claim.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {claim.user?.username || '未知用户'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(claim.createdAt).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={claim.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {plot.status === 'available' && !hasActiveClaim && user && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-green-600" />
                  认领申请
                </h2>
                {!showClaimForm ? (
                  <button
                    onClick={() => setShowClaimForm(true)}
                    className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                  >
                    申请认领此地块
                  </button>
                ) : (
                  <form onSubmit={handleSubmit(onSubmitClaim)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        种植计划
                      </label>
                      <textarea
                        rows={4}
                        placeholder="请描述您的种植计划，包括打算种植的作物、管理方式等..."
                        className={cn(
                          'w-full px-4 py-3 rounded-xl border',
                          errors.plantingPlan
                            ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                            : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                          'focus:outline-none focus:ring-2 transition-all'
                        )}
                        {...register('plantingPlan')}
                      />
                      {errors.plantingPlan && (
                        <p className="mt-1 text-sm text-red-500">
                          {errors.plantingPlan.message}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowClaimForm(false)}
                        className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className={cn(
                          'flex-1 py-3 bg-green-600 text-white rounded-xl font-medium',
                          'hover:bg-green-700 transition-colors',
                          'flex items-center justify-center gap-2',
                          submitting && 'opacity-70 cursor-not-allowed'
                        )}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            提交中
                          </>
                        ) : (
                          '提交申请'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                水电用量统计
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Droplets className="w-6 h-6 text-blue-600" />
                    <span className="text-gray-700">累计用水</span>
                  </div>
                  <span className="font-bold text-blue-600">
                    {billStats?.water.toFixed(1) || '0'} 吨
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Zap className="w-6 h-6 text-yellow-600" />
                    <span className="text-gray-700">累计用电</span>
                  </div>
                  <span className="font-bold text-yellow-600">
                    {billStats?.electricity.toFixed(1) || '0'} 度
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/plots/${plot.id}/journal`)}
              className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:border-green-300 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <BookOpen className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">种植日志</p>
                    <p className="text-sm text-gray-500">{journalEntries.length} 条记录</p>
                  </div>
                </div>
                <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                基本信息
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">创建时间</span>
                  <span className="text-gray-800">
                    {new Date(plot.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">地块编号</span>
                  <span className="text-gray-800 font-mono">{plot.plotNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">当前状态</span>
                  <StatusBadge status={plot.status} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
