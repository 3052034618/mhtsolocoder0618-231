import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ClipboardCheck,
  Loader2,
  User,
  Calendar,
  MapPin,
  FileText,
  Check,
  X,
  AlertCircle,
  Clock,
  Hourglass,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Claim } from '../../shared/types.js';
import { useStore } from '../store';
import { claims } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { cn } from '@/lib/utils';

const approveSchema = z.object({
  startDate: z.string().min(1, '请选择开始日期'),
  durationMonths: z.coerce.number().min(1, '期限至少1个月').max(24, '期限最多24个月'),
});

type ApproveForm = z.infer<typeof approveSchema>;

export default function ClaimReview() {
  const { user, showToast } = useStore();
  const [pendingClaims, setPendingClaims] = useState<Claim[]>([]);
  const [waitingClaims, setWaitingClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClaimId, setExpandedClaimId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [showWaitingList, setShowWaitingList] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ApproveForm>({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      startDate: '',
      durationMonths: 6,
    },
  });

  const fetchClaims = async () => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    try {
      const [pendingData, waitingData] = await Promise.all([
        claims.getClaims({ status: 'pending' }),
        claims.getClaims({ status: 'waiting' }),
      ]);

      const sortedPending = pendingData.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const sortedWaiting = waitingData.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setPendingClaims(sortedPending);
      setWaitingClaims(sortedWaiting);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取申请列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') {
      showToast('您没有权限访问此页面', 'error');
      return;
    }
    fetchClaims();
  }, [user]);

  const handleExpand = (claimId: number) => {
    if (expandedClaimId === claimId) {
      setExpandedClaimId(null);
      reset();
    } else {
      setExpandedClaimId(claimId);
      const today = new Date();
      today.setDate(today.getDate() + 1);
      setValue('startDate', today.toISOString().split('T')[0]);
      setValue('durationMonths', 6);
    }
  };

  const onApprove = async (claimId: number, data: ApproveForm) => {
    setProcessingId(claimId);
    try {
      await claims.approveClaim(claimId, {
        startDate: data.startDate,
        durationMonths: data.durationMonths,
      });
      showToast('申请已通过', 'success');
      setExpandedClaimId(null);
      reset();
      fetchClaims();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (claimId: number) => {
    if (!confirm('确定要拒绝这个申请吗？')) return;
    setProcessingId(claimId);
    try {
      await claims.rejectClaim(claimId);
      showToast('申请已拒绝', 'success');
      fetchClaims();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMoveToWaiting = async (claimId: number) => {
    setProcessingId(claimId);
    try {
      await claims.moveToWaiting(claimId);
      showToast('已移入等待列表，可在下方等待列表中查看排队顺序', 'success');
      fetchClaims();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">无权限访问</h2>
          <p className="text-gray-500">此页面仅管理员可访问</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-green-600" />
            认领审核
          </h1>
          <p className="text-gray-500">审核用户的地块认领申请</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  待审核申请
                  <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-sm rounded-full">
                    {pendingClaims.length}
                  </span>
                </h2>
              </div>

              {pendingClaims.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-gray-500">暂无待审核申请</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingClaims.map((claim, index) => (
                    <div
                      key={claim.id}
                      className={cn(
                        'border rounded-xl overflow-hidden transition-all duration-200',
                        expandedClaimId === claim.id
                          ? 'border-green-300 bg-green-50/30'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      )}
                    >
                      <div
                        className="p-5 cursor-pointer"
                        onClick={() => handleExpand(claim.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-lg font-bold text-orange-600">
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-semibold text-gray-800">
                                  {claim.user?.username || '未知用户'}
                                </h3>
                                <StatusBadge status={claim.status} />
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  地块 {claim.plot?.plotNumber || '未知'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(claim.createdAt).toLocaleDateString('zh-CN')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {processingId === claim.id ? (
                              <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                            ) : expandedClaimId === claim.id ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedClaimId === claim.id && (
                        <div className="px-5 pb-5 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
                            <div>
                              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                <User className="w-4 h-4 text-green-600" />
                                申请人信息
                              </h4>
                              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={claim.user?.avatar || 'https://via.placeholder.com/48'}
                                    alt={claim.user?.username}
                                    className="w-12 h-12 rounded-full object-cover"
                                  />
                                  <div>
                                    <p className="font-medium text-gray-800">
                                      {claim.user?.username}
                                    </p>
                                    <p className="text-sm text-gray-500">{claim.user?.email}</p>
                                  </div>
                                </div>
                                {claim.user?.phone && (
                                  <p className="text-sm text-gray-600">
                                    电话：{claim.user.phone}
                                  </p>
                                )}
                                {claim.user?.address && (
                                  <p className="text-sm text-gray-600">
                                    地址：{claim.user.address}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-blue-600" />
                                地块信息
                              </h4>
                              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">地块编号：</span>
                                  {claim.plot?.plotNumber || '未知'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">位置：</span>
                                  {claim.plot?.location || '未知'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">面积：</span>
                                  {claim.plot?.area || '未知'} ㎡
                                </p>
                              </div>
                            </div>
                          </div>

                          {claim.plantingPlan && (
                            <div className="mt-5">
                              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-purple-600" />
                                种植计划
                              </h4>
                              <div className="bg-purple-50 rounded-xl p-4">
                                <p className="text-gray-700">{claim.plantingPlan}</p>
                              </div>
                            </div>
                          )}

                          <form
                            onSubmit={handleSubmit((data) => onApprove(claim.id, data))}
                            className="mt-6 pt-5 border-t border-gray-100"
                          >
                            <h4 className="font-medium text-gray-800 mb-4">审核通过设置</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  开始日期
                                </label>
                                <input
                                  type="date"
                                  className={cn(
                                    'w-full px-4 py-3 rounded-xl border',
                                    errors.startDate
                                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                                      : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                                    'focus:outline-none focus:ring-2 transition-all'
                                  )}
                                  {...register('startDate')}
                                />
                                {errors.startDate && (
                                  <p className="mt-1 text-sm text-red-500">
                                    {errors.startDate.message}
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  认领期限（月）
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="24"
                                  className={cn(
                                    'w-full px-4 py-3 rounded-xl border',
                                    errors.durationMonths
                                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                                      : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                                    'focus:outline-none focus:ring-2 transition-all'
                                  )}
                                  {...register('durationMonths')}
                                />
                                {errors.durationMonths && (
                                  <p className="mt-1 text-sm text-red-500">
                                    {errors.durationMonths.message}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <button
                                type="submit"
                                disabled={processingId === claim.id}
                                className={cn(
                                  'flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium',
                                  'hover:bg-green-700 transition-colors',
                                  processingId === claim.id && 'opacity-70 cursor-not-allowed'
                                )}
                              >
                                <Check className="w-5 h-5" />
                                通过申请
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(claim.id)}
                                disabled={processingId === claim.id}
                                className={cn(
                                  'flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-medium',
                                  'hover:bg-red-700 transition-colors',
                                  processingId === claim.id && 'opacity-70 cursor-not-allowed'
                                )}
                              >
                                <X className="w-5 h-5" />
                                拒绝
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveToWaiting(claim.id)}
                                disabled={processingId === claim.id}
                                className={cn(
                                  'flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-xl font-medium',
                                  'hover:bg-yellow-600 transition-colors',
                                  processingId === claim.id && 'opacity-70 cursor-not-allowed'
                                )}
                              >
                                <Hourglass className="w-5 h-5" />
                                移入等待
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowWaitingList(!showWaitingList)}
                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Hourglass className="w-5 h-5 text-yellow-500" />
                  等待列表
                  <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-sm rounded-full">
                    {waitingClaims.length}
                  </span>
                </h2>
                {showWaitingList ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showWaitingList && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  {waitingClaims.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">暂无等待中的申请</p>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-5">
                      {waitingClaims.map((claim, index) => (
                        <div
                          key={claim.id}
                          className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl border border-yellow-100"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center font-bold text-yellow-700">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">
                                {claim.user?.username || '未知用户'}
                              </p>
                              <p className="text-sm text-gray-500">
                                地块 {claim.plot?.plotNumber || '未知'} ·{' '}
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
