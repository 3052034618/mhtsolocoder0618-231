import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  ArrowUp,
  UserMinus,
  Zap,
  Info,
  MapPin,
  Leaf,
  Users,
  Timer,
} from 'lucide-react';
import { useStore } from '../store';
import { claims } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { cn } from '@/lib/utils';
import type { Claim, Plot, User } from '../../shared/types.js';

interface WaitingGroup {
  plot: Plot;
  queue: Array<Claim & { position: number }>;
}

export default function ClaimReview() {
  const { user, showToast } = useStore();
  const [pendingClaims, setPendingClaims] = useState<Claim[]>([]);
  const [waitingGroups, setWaitingGroups] = useState<WaitingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'waiting'>('pending');

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const [pendingData, waitingData] = await Promise.all([
        claims.getClaims({ status: 'pending' }),
        (claims as any).getWaitingGrouped(),
      ]);
      setPendingClaims(pendingData);
      setWaitingGroups(waitingData);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleApprove = async (claimId: number) => {
    setProcessingId(claimId);
    try {
      await claims.approveClaim(claimId);
      showToast('申请已通过', 'success');
      fetchClaims();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (claimId: number) => {
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

  const handleMoveUp = async (claimId: number) => {
    setProcessingId(claimId);
    try {
      await (claims as any).moveUpWaiting(claimId);
      showToast('已提前一位', 'success');
      fetchClaims();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveFromWaiting = async (claimId: number) => {
    setProcessingId(claimId);
    try {
      await (claims as any).removeFromWaiting(claimId);
      showToast('已移出等待队列', 'success');
      fetchClaims();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAssignNow = async (claimId: number) => {
    setProcessingId(claimId);
    try {
      const result = await (claims as any).assignNow(claimId);
      showToast(result?.message || '已直接分配', 'success');
      fetchClaims();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const totalWaiting = waitingGroups.reduce((sum, g) => sum + g.queue.length, 0);
  const totalPending = pendingClaims.length;
  const plotsWithWaiting = waitingGroups.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-green-600" />
            认领审核
          </h1>
          <p className="text-gray-500">审核居民的地块认领申请，管理等待队列</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalPending}</p>
                <p className="text-xs text-gray-500">待审核申请</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalWaiting}</p>
                <p className="text-xs text-gray-500">等待中人数</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{plotsWithWaiting}</p>
                <p className="text-xs text-gray-500">有等待的地块</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              'px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2',
              activeTab === 'pending'
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            )}
          >
            <Clock className="w-4 h-4" />
            待审核 ({totalPending})
          </button>
          <button
            onClick={() => setActiveTab('waiting')}
            className={cn(
              'px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2',
              activeTab === 'waiting'
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            )}
          >
            <Timer className="w-4 h-4" />
            等待列表 ({totalWaiting})
          </button>
          <button
            onClick={fetchClaims}
            className="ml-auto px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            刷新
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : activeTab === 'pending' ? (
          pendingClaims.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">暂无待审核申请</h3>
              <p className="text-gray-400 text-sm">所有申请都已处理完毕</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <StatusBadge status={claim.status} />
                        <span className="text-sm text-gray-500">
                          申请时间：{new Date(claim.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">地块编号</p>
                          <p className="font-semibold text-gray-800">
                            {claim.plot?.plotNumber || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">地块面积</p>
                          <p className="font-semibold text-gray-800">
                            {claim.plot?.area || '-'} ㎡
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">申请人</p>
                          <p className="font-semibold text-gray-800">
                            {claim.user?.username || '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">联系邮箱</p>
                          <p className="font-semibold text-gray-800 text-sm truncate">
                            {claim.user?.email || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-500 mb-1">种植计划</p>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {claim.plantingPlan || '未填写'}
                        </p>
                      </div>
                    </div>
                    <div className="flex lg:flex-col gap-2">
                      <button
                        onClick={() => handleApprove(claim.id)}
                        disabled={processingId === claim.id}
                        className="flex-1 lg:w-full px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium text-sm hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {processingId === claim.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                        通过
                      </button>
                      <button
                        onClick={() => handleMoveToWaiting(claim.id)}
                        disabled={processingId === claim.id}
                        className="flex-1 lg:w-full px-6 py-2.5 rounded-xl bg-amber-50 text-amber-700 font-medium text-sm hover:bg-amber-100 border border-amber-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        <Clock className="w-4 h-4" />
                        移入等待
                      </button>
                      <button
                        onClick={() => handleReject(claim.id)}
                        disabled={processingId === claim.id}
                        className="flex-1 lg:w-full px-6 py-2.5 rounded-xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 border border-red-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        <XCircle className="w-4 h-4" />
                        拒绝
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : waitingGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">暂无等待队列</h3>
            <p className="text-gray-400 text-sm">目前没有等待认领的申请</p>
          </div>
        ) : (
          <div className="space-y-6">
            {waitingGroups.map((group) => (
              <div
                key={group.plot.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-green-600/5 to-emerald-600/5 px-6 py-4 border-b border-green-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                        <Leaf className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                          地块 {group.plot.plotNumber}
                          <span className="text-sm font-normal text-gray-500">
                            {group.plot.area} ㎡
                          </span>
                        </h3>
                        <p className="text-sm text-gray-500">{group.plot.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">当前状态</p>
                        <StatusBadge status={group.plot.status} />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">等待人数</p>
                        <p className="text-xl font-bold text-green-600">{group.queue.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {group.queue.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'px-6 py-4 transition-colors',
                        item.position === 1 && 'bg-gradient-to-r from-amber-50/50 to-transparent'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0',
                            item.position === 1
                              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                              : 'bg-gray-100 text-gray-500'
                          )}
                        >
                          {item.position}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-1">
                            <p className="font-semibold text-gray-800">
                              {item.user?.username || '未知用户'}
                            </p>
                            <span className="text-xs text-gray-400">
                              {item.user?.email}
                            </span>
                            {item.position === 1 && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                下一位
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              申请时间：{new Date(item.createdAt).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-600 line-clamp-1">
                            <span className="text-gray-400 mr-1">种植计划：</span>
                            {item.plantingPlan}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleAssignNow(item.id)}
                            disabled={processingId === item.id}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-medium hover:from-green-700 hover:to-emerald-700 transition-all flex items-center gap-1 disabled:opacity-70"
                            title="直接分配"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            立即分配
                          </button>
                          <button
                            onClick={() => handleMoveUp(item.id)}
                            disabled={processingId === item.id || item.position === 1}
                            className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            title="提前一位"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveFromWaiting(item.id)}
                            disabled={processingId === item.id}
                            className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all disabled:opacity-70"
                            title="移出队列"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-5 border border-blue-100">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-800 mb-1">等待队列规则</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>当有园丁不续期或释放地块时，等待队列的第一位申请人将自动接手</li>
                <li>每位申请人在同一地块只能排在一个位置，排队顺序按申请时间确定</li>
                <li>管理员可以调整排队顺序、移出队列或直接分配给某位申请人</li>
                <li>被移出队列的申请将被标记为已拒绝，申请人需要重新提交申请</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
