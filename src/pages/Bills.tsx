import { useState, useEffect } from 'react';
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
  CircleDollarSign
} from 'lucide-react';
import type { Bill } from '../../shared/types.js';
import { useStore } from '../store';
import { bills as billsApi } from '../services/api';
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

interface BillStats {
  unpaid: { count: number; total: number };
  paid: { count: number; total: number };
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
  const [billList, setBillList] = useState<Bill[]>([]);
  const [stats, setStats] = useState<BillStats>({
    unpaid: { count: 0, total: 0 },
    paid: { count: 0, total: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);

  const { register, watch, handleSubmit, reset } = useForm<FilterForm>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
      month: ''
    }
  });

  const {
    register: payRegister,
    handleSubmit: handlePaySubmit,
    formState: { errors: payErrors },
    reset: resetPay,
    watch: payWatch
  } = useForm<PayForm>({
    resolver: zodResolver(paySchema),
    defaultValues: {
      paymentMethod: 'wechat',
      password: ''
    }
  });

  const monthFilter = watch('month');
  const paymentMethod = payWatch('paymentMethod');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, billsData] = await Promise.all([
        billsApi.getBillStats(),
        billsApi.getBills(monthFilter ? { month: monthFilter } : undefined)
      ]);
      setStats(statsData);
      setBillList(billsData);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取账单数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [monthFilter]);

  const handlePay = (bill: Bill) => {
    if (user?.role === 'admin') {
      showToast('管理员无需缴费', 'info');
      return;
    }
    setSelectedBill(bill);
    setShowPayModal(true);
  };

  const onPaySubmit = async (data: PayForm) => {
    if (!selectedBill) return;
    setPaying(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await billsApi.payBill(selectedBill.id);
      showToast('支付成功', 'success');
      setShowPayModal(false);
      resetPay();
      fetchData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '支付失败', 'error');
    } finally {
      setPaying(false);
    }
  };

  const closePayModal = () => {
    setShowPayModal(false);
    setSelectedBill(null);
    resetPay();
  };

  const statCards = [
    {
      title: '待缴账单',
      count: stats.unpaid.count,
      amount: stats.unpaid.total,
      icon: AlertCircle,
      color: 'from-orange-500 to-red-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: '待缴金额',
      count: null,
      amount: stats.unpaid.total,
      icon: CircleDollarSign,
      color: 'from-red-500 to-pink-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: '已缴账单',
      count: stats.paid.count,
      amount: stats.paid.total,
      icon: CheckCircle2,
      color: 'from-green-500 to-emerald-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: '已缴金额',
      count: null,
      amount: stats.paid.total,
      icon: Receipt,
      color: 'from-blue-500 to-cyan-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <Receipt className="w-8 h-8 text-green-600" />
            费用中心
          </h1>
          <p className="text-gray-500">管理您的水电费用账单</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', card.bgColor)}>
                  <card.icon className={cn('w-6 h-6', card.textColor)} />
                </div>
                <div className={cn('w-2 h-2 rounded-full bg-gradient-to-r', card.color)} />
              </div>
              <p className="text-sm text-gray-500 mb-1">{card.title}</p>
              <p className={cn('text-2xl font-bold', card.textColor)}>
                {card.count !== null ? (
                  <>{card.count} 笔</>
                ) : (
                  <>¥{card.amount.toFixed(2)}</>
                )}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <form className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                className={cn(
                  'px-4 py-3 rounded-xl border border-gray-200 bg-white',
                  'focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500',
                  'transition-all duration-200 min-w-[180px]'
                )}
                {...register('month')}
              >
                <option value="">全部月份</option>
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => reset({ month: '' })}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              重置筛选
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : billList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Receipt className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">暂无账单</h3>
            <p className="text-gray-400 text-sm">没有找到符合条件的账单记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {billList.map((bill) => (
              <div
                key={bill.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">{bill.month} 账单</h3>
                          <StatusBadge status={bill.status} />
                        </div>
                        <p className="text-sm text-gray-500">
                          地块编号：{bill.plot?.plotNumber || '-'}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Droplets className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">用水量</p>
                          <p className="text-sm font-medium text-gray-800">{bill.waterUsage} 吨</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                          <Zap className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">用电量</p>
                          <p className="text-sm font-medium text-gray-800">{bill.electricityUsage} 度</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">水费</p>
                        <p className="text-sm font-medium text-blue-600">¥{bill.waterFee.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">电费</p>
                        <p className="text-sm font-medium text-yellow-600">¥{bill.electricityFee.toFixed(2)}</p>
                      </div>
                    </div>
                    {bill.status === 'paid' && bill.paidAt && (
                      <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>支付时间：{new Date(bill.paidAt).toLocaleString('zh-CN')}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-500 mb-1">应付金额</p>
                      <p className="text-3xl font-bold text-gray-800">¥{bill.totalAmount.toFixed(2)}</p>
                    </div>
                    {bill.status === 'unpaid' ? (
                      <button
                        onClick={() => handlePay(bill)}
                        className={cn(
                          'px-6 py-2.5 rounded-xl font-medium',
                          'bg-red-500 text-white',
                          'hover:bg-red-600 active:scale-95',
                          'transition-all duration-200',
                          'flex items-center gap-2'
                        )}
                      >
                        <CreditCard className="w-4 h-4" />
                        立即缴费
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="text-green-600 font-medium">已支付</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPayModal && selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">确认支付</h2>
                <button
                  onClick={closePayModal}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-white/80 mt-1">
                {selectedBill.month} - {selectedBill.plot?.plotNumber}
              </p>
            </div>
            <form onSubmit={handlePaySubmit(onPaySubmit)} className="p-6 space-y-6">
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-1">支付金额</p>
                <p className="text-4xl font-bold text-gray-800">¥{selectedBill.totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  选择支付方式
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.value}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all',
                        paymentMethod === method.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="radio"
                        value={method.value}
                        className="sr-only"
                        {...payRegister('paymentMethod')}
                      />
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', method.color)}>
                        <CreditCard className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs mt-2 text-gray-600">{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  支付密码
                </label>
                <input
                  type="password"
                  placeholder="请输入6位支付密码"
                  className={cn(
                    'w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none',
                    payErrors.password
                      ? 'border-red-400 focus:border-red-500 bg-red-50'
                      : 'border-gray-200 focus:border-green-500 bg-gray-50 focus:bg-white'
                  )}
                  maxLength={6}
                  {...payRegister('password')}
                />
                {payErrors.password && (
                  <p className="mt-1 text-sm text-red-500">{payErrors.password.message}</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePayModal}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      支付中...
                    </>
                  ) : (
                    '确认支付'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
