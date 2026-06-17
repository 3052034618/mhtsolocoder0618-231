import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Receipt,
  CreditCard,
  Calendar,
  Droplets,
  Zap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  CircleDollarSign,
  ChevronRight,
  TrendingUp,
  FileWarning,
  CheckSquare,
  PieChart,
} from 'lucide-react';
import type { Bill, Plot, Claim } from '../../shared/types.js';
import { useStore } from '../store';
import { bills as billsApi, plots as plotsApi, claims as claimsApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { cn } from '@/lib/utils';

const filterSchema = z.object({
  month: z.string()
});

type FilterForm = z.infer<typeof filterSchema>;

const paySchema = z.object({
  paymentMethod: z.enum(['wechat', 'alipay', 'bank']),
  password: z.string().min(6, '支付密码至少6位')
});

type PayForm = z.infer<typeof paySchema>;

interface MonthBillStats {
  month: string;
  monthLabel: string;
  totalPlots: number;
  generatedBills: number;
  missingBills: { plot: Plot; claim?: Claim }[];
  unpaid: { count: number; total: number };
  paid: { count: number; total: number };
  bills: Bill[];
}

function generateMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = `${date.getFullYear()}年${date.getMonth() + 1}月`;
    options.push({ value, label });
  }
  return options;
}

const monthOptions = generateMonthOptions();

const paymentMethods = [
  { value: 'wechat', label: '微信支付', color: 'bg-green-500' },
  { value: 'alipay', label: '支付宝', color: 'bg-blue-500' },
  { value: 'bank', label: '银行卡', color: 'bg-purple-500' }
];

export default function Bills() {
  const { user, showToast } = useStore();
  const isAdmin = user?.role === 'admin';
  const [billList, setBillList] = useState<Bill[]>([]);
  const [allPlots, setAllPlots] = useState<Plot[]>([]);
  const [allClaims, setAllClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0]?.value || '');

  const { register, handleSubmit, reset, watch } = useForm<PayForm>({
    resolver: zodResolver(paySchema),
    defaultValues: {
      paymentMethod: 'wechat',
      password: ''
    }
  });

  const {
    register: registerFilter,
    watch: watchFilter,
    handleSubmit: handleSubmitFilter
  } = useForm<FilterForm>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      month: monthOptions[0]?.value || ''
    }
  });

  const filterMonth = watchFilter('month') || selectedMonth;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [billsData, plotsData, claimsData] = await Promise.all([
        billsApi.getBills(),
        isAdmin ? plotsApi.getPlots() : Promise.resolve([]),
        isAdmin ? claimsApi.getClaims() : Promise.resolve([])
      ]);
      setBillList(billsData);
      setAllPlots(plotsData || []);
      setAllClaims(claimsData || []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const monthStats = useMemo((): MonthBillStats[] => {
    const result: MonthBillStats[] = [];
    const approvedClaims = allClaims.filter(c => c.status === 'approved');

    for (const opt of monthOptions) {
      const monthBills = billList.filter(b => b.month === opt.value);
      const plotIdsWithBill = new Set(monthBills.map(b => b.plotId));

      let missingBills: MonthBillStats['missingBills'] = [];
      if (isAdmin) {
        missingBills = allPlots
          .filter(plot => {
            if (plotIdsWithBill.has(plot.id)) return false;
            const claim = approvedClaims.find(c => c.plotId === plot.id);
            if (!claim) return false;
            if (claim.startDate && opt.value < claim.startDate.slice(0, 7)) return false;
            if (claim.endDate && opt.value > claim.endDate.slice(0, 7)) return false;
            return true;
          })
          .map(plot => ({
            plot,
            claim: approvedClaims.find(c => c.plotId === plot.id)
          }));
      }

      const unpaidBills = monthBills.filter(b => b.status === 'unpaid');
      const paidBills = monthBills.filter(b => b.status === 'paid');

      result.push({
        month: opt.value,
        monthLabel: opt.label,
        totalPlots: isAdmin ? allPlots.filter(p => {
          const claim = approvedClaims.find(c => c.plotId === p.id);
          if (!claim) return false;
          if (claim.startDate && opt.value < claim.startDate.slice(0, 7)) return false;
          if (claim.endDate && opt.value > claim.endDate.slice(0, 7)) return false;
          return true;
        }).length : monthBills.length,
        generatedBills: monthBills.length,
        missingBills,
        unpaid: {
          count: unpaidBills.length,
          total: Math.round(unpaidBills.reduce((sum, b) => sum + b.totalAmount, 0) * 100) / 100
        },
        paid: {
          count: paidBills.length,
          total: Math.round(paidBills.reduce((sum, b) => sum + b.totalAmount, 0) * 100) / 100
        },
        bills: monthBills
      });
    }

    return result;
  }, [billList, allPlots, allClaims, isAdmin]);

  const currentMonthStats = monthStats.find(m => m.month === filterMonth) || monthStats[0];

  const totalStats = useMemo(() => {
    const myBills = isAdmin ? billList : billList;
    const unpaid = myBills.filter(b => b.status === 'unpaid');
    const paid = myBills.filter(b => b.status === 'paid');
    return {
      unpaid: {
        count: unpaid.length,
        total: Math.round(unpaid.reduce((sum, b) => sum + b.totalAmount, 0) * 100) / 100
      },
      paid: {
        count: paid.length,
        total: Math.round(paid.reduce((sum, b) => sum + b.totalAmount, 0) * 100) / 100
      }
    };
  }, [billList, isAdmin]);

  const handlePay = async (data: PayForm) => {
    if (!selectedBill) return;
    setPaying(true);
    try {
      await billsApi.payBill(selectedBill.id);
      showToast('支付成功！', 'success');
      setShowPayModal(false);
      reset();
      fetchData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '支付失败', 'error');
    } finally {
      setPaying(false);
    }
  };

  const handleGenerateMissing = async (month: string) => {
    try {
      await billsApi.getBills();
      showToast('已触发账单自动生成', 'success');
      fetchData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    }
  };

  const getProgressColor = (generated: number, total: number) => {
    const ratio = total > 0 ? generated / total : 1;
    if (ratio >= 1) return 'bg-green-500';
    if (ratio >= 0.7) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Receipt className="w-8 h-8 text-green-600" />
            费用中心
          </h1>
          <p className="text-gray-500">
            {isAdmin ? '管理月度账单生成进度，查看缴费情况' : '查看并缴纳您的水电费用账单'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  ¥{totalStats.unpaid.total.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">待缴金额（{totalStats.unpaid.count} 笔）</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  ¥{totalStats.paid.total.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">已缴金额（{totalStats.paid.count} 笔）</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  ¥{(totalStats.unpaid.total + totalStats.paid.total).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">累计总费用</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-700">选择月份：</label>
            </div>
            <select
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              value={filterMonth}
              {...registerFilter('month')}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={fetchData}
              className="ml-auto px-4 py-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all flex items-center gap-2 text-sm font-medium"
            >
              <Loader2 className={cn('w-4 h-4', loading && 'animate-spin')} />
              刷新数据
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {currentMonthStats && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-white">{currentMonthStats.monthLabel}</h2>
                      <p className="text-green-100 text-sm">月度账单总览</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                      {isAdmin && (
                        <>
                          <div className="text-right">
                            <p className="text-xs text-green-100">生成进度</p>
                            <p className="text-white font-bold">
                              {currentMonthStats.generatedBills} / {currentMonthStats.totalPlots}
                            </p>
                          </div>
                          <div className="w-32 h-2 bg-white/30 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-500',
                                getProgressColor(currentMonthStats.generatedBills, currentMonthStats.totalPlots)
                              )}
                              style={{
                                width: `${currentMonthStats.totalPlots > 0 ? (currentMonthStats.generatedBills / currentMonthStats.totalPlots) * 100 : 100}%`
                              }}
                            />
                          </div>
                        </>
                      )}
                      <div className="text-right">
                        <p className="text-xs text-green-100">待缴金额</p>
                        <p className="text-white font-bold">¥{currentMonthStats.unpaid.total.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-green-100">已缴金额</p>
                        <p className="text-white font-bold">¥{currentMonthStats.paid.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {isAdmin && currentMonthStats.missingBills.length > 0 && (
                  <div className="bg-amber-50 border-b border-amber-100 px-6 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center flex-shrink-0">
                          <FileWarning className="w-4 h-4 text-amber-700" />
                        </div>
                        <div>
                          <p className="font-medium text-amber-800 mb-1">
                            有 {currentMonthStats.missingBills.length} 个地块尚未生成账单
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {currentMonthStats.missingBills.slice(0, 5).map(m => (
                              <span key={m.plot.id} className="px-2 py-1 bg-white rounded text-xs text-gray-600">
                                {m.plot.plotNumber} ({m.claim?.user?.username || '未知园丁'})
                              </span>
                            ))}
                            {currentMonthStats.missingBills.length > 5 && (
                              <span className="px-2 py-1 bg-white rounded text-xs text-gray-500">
                                +{currentMonthStats.missingBills.length - 5} 个
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleGenerateMissing(currentMonthStats.month)}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-all flex items-center gap-2 flex-shrink-0"
                      >
                        <Zap className="w-4 h-4" />
                        自动生成
                      </button>
                    </div>
                  </div>
                )}

                {currentMonthStats.bills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <PieChart className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      {currentMonthStats.monthLabel} 暂无账单
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {isAdmin ? '系统将在新月份自动为已认领地块生成账单' : '请耐心等待管理员生成您的账单'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">地块</th>}
                          {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">园丁</th>}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用水量</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">电费</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">合计</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">缴费时间</th>
                          {!isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {currentMonthStats.bills.map(bill => (
                          <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                            {isAdmin && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-800">{bill.plot?.plotNumber || '-'}</div>
                                <div className="text-xs text-gray-400">{bill.plot?.area} ㎡</div>
                              </td>
                            )}
                            {isAdmin && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-800">{bill.user?.username || '-'}</div>
                                <div className="text-xs text-gray-400">{bill.user?.email}</div>
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={bill.status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1 text-gray-700">
                                <Droplets className="w-4 h-4 text-blue-500" />
                                <span>{bill.waterUsage} 吨</span>
                              </div>
                              <div className="text-xs text-gray-400">¥{bill.waterFee.toFixed(2)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1 text-gray-700">
                                <Zap className="w-4 h-4 text-amber-500" />
                                <span>{bill.electricityUsage} 度</span>
                              </div>
                              <div className="text-xs text-gray-400">¥{bill.electricityFee.toFixed(2)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-bold text-gray-800 text-lg">¥{bill.totalAmount.toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                              {bill.paidAt ? new Date(bill.paidAt).toLocaleString('zh-CN') : '-'}
                            </td>
                            {!isAdmin && (
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                {bill.status === 'unpaid' && (
                                  <button
                                    onClick={() => {
                                      setSelectedBill(bill);
                                      setShowPayModal(true);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium hover:from-green-700 hover:to-emerald-700 transition-all flex items-center gap-2 ml-auto"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    去支付
                                  </button>
                                )}
                                {bill.status === 'paid' && (
                                  <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                                    <CheckSquare className="w-4 h-4" />
                                    已支付
                                  </span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {currentMonthStats.bills.length > 0 && (
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CheckSquare className="w-4 h-4 text-green-600" />
                        <span>本月已支付 {currentMonthStats.paid.count} 笔</span>
                        <span className="mx-2">|</span>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span>待支付 {currentMonthStats.unpaid.count} 笔</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-sm text-gray-500">本月合计：</span>
                          <span className="text-2xl font-bold text-green-600 ml-2">
                            ¥{(currentMonthStats.unpaid.total + currentMonthStats.paid.total).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  近12个月月度汇总
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {monthStats.slice(0, 6).map(stats => (
                  <div
                    key={stats.month}
                    className={cn(
                      'px-6 py-4 cursor-pointer transition-colors hover:bg-gray-50',
                      stats.month === filterMonth && 'bg-green-50/50'
                    )}
                    onClick={() => setSelectedMonth(stats.month)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 text-center">
                          <p className="font-bold text-gray-800">{stats.monthLabel.split('年')[1]}</p>
                          <p className="text-xs text-gray-400">{stats.monthLabel.split('年')[0]}年</p>
                        </div>
                        <div className="w-px h-8 bg-gray-100" />
                        <div>
                          <div className="flex items-center gap-4 text-sm">
                            {isAdmin && (
                              <span className="text-gray-600">
                                生成 <span className="font-medium text-gray-800">{stats.generatedBills}</span>/{stats.totalPlots}
                              </span>
                            )}
                            <span className="text-amber-600">
                              待缴 ¥{stats.unpaid.total.toFixed(2)}
                            </span>
                            <span className="text-green-600">
                              已缴 ¥{stats.paid.total.toFixed(2)}
                            </span>
                          </div>
                          {isAdmin && stats.missingBills.length > 0 && (
                            <p className="text-xs text-amber-600 mt-1">
                              缺 {stats.missingBills.length} 个账单
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-gray-800">
                            ¥{(stats.unpaid.total + stats.paid.total).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-400">合计</p>
                        </div>
                        <ChevronRight className={cn(
                          'w-5 h-5 text-gray-400 transition-transform',
                          stats.month === filterMonth && 'rotate-90 text-green-600'
                        )} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showPayModal && selectedBill && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slideIn overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">支付账单</h3>
                  <p className="text-green-100 text-sm">{selectedBill.month.replace('-', '年')}月 水电费</p>
                </div>
                <button
                  onClick={() => {
                    setShowPayModal(false);
                    reset();
                  }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="p-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 mb-6 text-center border border-green-100">
                  <p className="text-sm text-gray-500 mb-2">应付金额</p>
                  <p className="text-4xl font-bold text-green-600">
                    ¥{selectedBill.totalAmount.toFixed(2)}
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">地块编号</span>
                    <span className="font-medium text-gray-800">{selectedBill.plot?.plotNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">水费</span>
                    <span className="font-medium text-gray-800">¥{selectedBill.waterFee.toFixed(2)} ({selectedBill.waterUsage}吨)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">电费</span>
                    <span className="font-medium text-gray-800">¥{selectedBill.electricityFee.toFixed(2)} ({selectedBill.electricityUsage}度)</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit(handlePay)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">支付方式</label>
                    <div className="grid grid-cols-3 gap-3">
                      {paymentMethods.map(method => (
                        <label key={method.value} className="cursor-pointer">
                          <input
                            type="radio"
                            className="sr-only"
                            value={method.value}
                            {...register('paymentMethod')}
                          />
                          <div className={cn(
                            'p-3 rounded-xl border-2 text-center transition-all',
                            watch('paymentMethod') === method.value
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          )}>
                            <div className={cn('w-6 h-6 rounded-full mx-auto mb-1', method.color)} />
                            <p className="text-xs font-medium text-gray-700">{method.label}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">支付密码</label>
                    <input
                      type="password"
                      placeholder="请输入6位支付密码"
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border',
                        'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                        'focus:outline-none focus:ring-2 transition-all'
                      )}
                      {...register('password')}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPayModal(false);
                        reset();
                      }}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={paying}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {paying ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          支付中
                        </>
                      ) : (
                        <>
                          <CircleDollarSign className="w-5 h-5" />
                          确认支付
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
    </div>
  );
}
