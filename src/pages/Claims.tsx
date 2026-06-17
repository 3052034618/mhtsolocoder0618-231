import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Loader2,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Hourglass,
  User,
} from 'lucide-react';
import type { Claim } from '../../shared/types.js';
import { useStore } from '../store';
import { claims } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { cn } from '@/lib/utils';

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-5 h-5 text-orange-500" />,
  approved: <CheckCircle className="w-5 h-5 text-green-500" />,
  rejected: <XCircle className="w-5 h-5 text-red-500" />,
  waiting: <Hourglass className="w-5 h-5 text-yellow-500" />,
};

const statusDescriptions: Record<string, string> = {
  pending: '您的申请正在等待管理员审核，请耐心等待',
  approved: '恭喜！您的申请已通过，可以开始种植了',
  rejected: '很抱歉，您的申请未通过，请重新提交',
  waiting: '您正在排队等待中，前面还有其他申请者',
};

export default function Claims() {
  const navigate = useNavigate();
  const { user, showToast } = useStore();
  const [claimList, setClaimList] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await claims.getClaims();
      const myClaims = data.filter((c) => c.userId === user.id);
      myClaims.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setClaimList(myClaims);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取申请列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [user]);

  const getWaitingPosition = (claim: Claim): number => {
    if (claim.status !== 'waiting') return 0;
    const waitingClaims = claimList.filter(
      (c) =>
        c.status === 'waiting' &&
        c.plotId === claim.plotId &&
        new Date(c.createdAt) < new Date(claim.createdAt)
    );
    return waitingClaims.length + 1;
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
            <ClipboardList className="w-8 h-8 text-green-600" />
            我的认领申请
          </h1>
          <p className="text-gray-500">查看您的地块认领申请状态</p>
        </div>

        {claimList.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">暂无申请记录</h3>
            <p className="text-gray-400 text-sm mb-6">
              您还没有提交过任何地块认领申请
            </p>
            <button
              onClick={() => navigate('/plots')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              去浏览地块
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {claimList.map((claim) => {
              const waitingPosition = getWaitingPosition(claim);
              return (
                <div
                  key={claim.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:border-green-200 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center',
                          claim.status === 'approved' && 'bg-green-100',
                          claim.status === 'rejected' && 'bg-red-100',
                          claim.status === 'pending' && 'bg-orange-100',
                          claim.status === 'waiting' && 'bg-yellow-100'
                        )}
                      >
                        {statusIcons[claim.status] || <AlertCircle className="w-6 h-6 text-gray-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-800">
                            地块 {claim.plot?.plotNumber || '未知'}
                          </h3>
                          <StatusBadge status={claim.status} />
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {claim.plot?.location || '位置未知'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 flex items-center gap-1 justify-end">
                        <Calendar className="w-4 h-4" />
                        申请时间
                      </p>
                      <p className="text-gray-800 font-medium">
                        {new Date(claim.createdAt).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {claim.status === 'waiting' && (
                    <div className="mb-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                      <div className="flex items-center gap-3">
                        <Hourglass className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="font-medium text-yellow-800">排队中</p>
                          <p className="text-sm text-yellow-600">
                            您当前排在第 <span className="font-bold">{waitingPosition}</span> 位
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {claim.plantingPlan && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-2">种植计划</p>
                      <p className="text-gray-700 text-sm">{claim.plantingPlan}</p>
                    </div>
                  )}

                  {claim.status === 'approved' && (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-4 bg-green-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">开始日期</p>
                        <p className="font-semibold text-green-700">
                          {claim.startDate
                            ? new Date(claim.startDate).toLocaleDateString('zh-CN')
                            : '待确认'}
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">到期日期</p>
                        <p className="font-semibold text-green-700">
                          {claim.endDate
                            ? new Date(claim.endDate).toLocaleDateString('zh-CN')
                            : '待确认'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">{statusDescriptions[claim.status]}</p>
                    {claim.plot && (
                      <button
                        onClick={() => navigate(`/plots/${claim.plotId}`)}
                        className="text-sm text-green-600 font-medium hover:text-green-700 transition-colors flex items-center gap-1"
                      >
                        查看地块
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {claimList.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              申请状态说明
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">待审核</p>
                  <p className="text-sm text-gray-500">申请已提交，等待管理员审核</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Hourglass className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">等待中</p>
                  <p className="text-sm text-gray-500">申请通过但需排队等待地块</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">已通过</p>
                  <p className="text-sm text-gray-500">申请已通过，可以开始种植</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">已拒绝</p>
                  <p className="text-sm text-gray-500">申请未通过，请重新提交</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
