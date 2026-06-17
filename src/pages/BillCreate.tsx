import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FilePlus,
  MapPin,
  Calendar,
  Droplets,
  Zap,
  Calculator,
  Loader2,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Plot } from '../../shared/types.js';
import { useStore } from '../store';
import { bills as billsApi, plots as plotsApi } from '../services/api';
import { cn } from '@/lib/utils';

const billSchema = z.object({
  plotId: z.coerce.number().min(1, '请选择地块'),
  month: z.string().min(1, '请选择月份'),
  waterUsage: z.coerce.number().min(0, '用水量不能为负数'),
  electricityUsage: z.coerce.number().min(0, '用电量不能为负数')
});

type BillFormData = z.infer<typeof billSchema>;

const WATER_PRICE = 5;
const ELECTRICITY_PRICE = 12;

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

export default function BillCreate() {
  const navigate = useNavigate();
  const { user, showToast } = useStore();
  const [plotList, setPlotList] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset
  } = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      plotId: 0,
      month: '',
      waterUsage: 0,
      electricityUsage: 0
    }
  });

  const waterUsage = watch('waterUsage') || 0;
  const electricityUsage = watch('electricityUsage') || 0;

  const fees = useMemo(() => {
    const waterFee = waterUsage * WATER_PRICE;
    const electricityFee = electricityUsage * ELECTRICITY_PRICE;
    const totalAmount = waterFee + electricityFee;
    return { waterFee, electricityFee, totalAmount };
  }, [waterUsage, electricityUsage]);

  const fetchPlots = async () => {
    setLoading(true);
    try {
      const data = await plotsApi.getPlots({ status: 'claimed' });
      setPlotList(data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取地块列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') {
      showToast('只有管理员可以生成账单', 'error');
      navigate('/bills');
      return;
    }
    fetchPlots();
  }, [user, navigate]);

  const onSubmit = async (data: BillFormData) => {
    if (data.waterUsage === 0 && data.electricityUsage === 0) {
      showToast('请输入用水量或用电量', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await billsApi.createBill({
        plotId: data.plotId,
        month: data.month,
        waterUsage: data.waterUsage,
        electricityUsage: data.electricityUsage
      });
      setSuccess(true);
      showToast('账单生成成功', 'success');
      setTimeout(() => {
        setSuccess(false);
        reset();
      }, 2000);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '生成账单失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/bills')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回费用中心</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <FilePlus className="w-8 h-8 text-green-600" />
            生成账单
          </h1>
          <p className="text-gray-500">为已认领地块生成水电费用账单</p>
        </div>

        {success ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">账单生成成功</h2>
            <p className="text-gray-500">账单已发送至用户账户</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <MapPin className="w-4 h-4 inline-block mr-2" />
                选择地块
              </label>
              <select
                className={cn(
                  'w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none',
                  errors.plotId
                    ? 'border-red-400 focus:border-red-500 bg-red-50'
                    : 'border-gray-200 focus:border-green-500 bg-gray-50 focus:bg-white'
                )}
                {...register('plotId')}
              >
                <option value={0}>请选择地块</option>
                {plotList.map((plot) => (
                  <option key={plot.id} value={plot.id}>
                    {plot.plotNumber} - {plot.location} ({plot.currentGardener?.username || '无'})
                  </option>
                ))}
              </select>
              {errors.plotId && (
                <p className="mt-1 text-sm text-red-500">{errors.plotId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Calendar className="w-4 h-4 inline-block mr-2" />
                选择月份
              </label>
              <select
                className={cn(
                  'w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none',
                  errors.month
                    ? 'border-red-400 focus:border-red-500 bg-red-50'
                    : 'border-gray-200 focus:border-green-500 bg-gray-50 focus:bg-white'
                )}
                {...register('month')}
              >
                <option value="">请选择月份</option>
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.month && (
                <p className="mt-1 text-sm text-red-500">{errors.month.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Droplets className="w-4 h-4 inline-block mr-2 text-blue-500" />
                  用水量（吨）
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="请输入用水量"
                  className={cn(
                    'w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none',
                    errors.waterUsage
                      ? 'border-red-400 focus:border-red-500 bg-red-50'
                      : 'border-gray-200 focus:border-green-500 bg-gray-50 focus:bg-white'
                  )}
                  {...register('waterUsage')}
                />
                {errors.waterUsage && (
                  <p className="mt-1 text-sm text-red-500">{errors.waterUsage.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <Zap className="w-4 h-4 inline-block mr-2 text-yellow-500" />
                  用电量（度）
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="请输入用电量"
                  className={cn(
                    'w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none',
                    errors.electricityUsage
                      ? 'border-red-400 focus:border-red-500 bg-red-50'
                      : 'border-gray-200 focus:border-green-500 bg-gray-50 focus:bg-white'
                  )}
                  {...register('electricityUsage')}
                />
                {errors.electricityUsage && (
                  <p className="mt-1 text-sm text-red-500">{errors.electricityUsage.message}</p>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-800">费用计算</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">水费（¥{WATER_PRICE}/吨 × {waterUsage}吨）</span>
                  <span className="font-medium text-blue-600">¥{fees.waterFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">电费（¥{ELECTRICITY_PRICE}/度 × {electricityUsage}度）</span>
                  <span className="font-medium text-yellow-600">¥{fees.electricityFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-green-200 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-800">合计金额</span>
                    <span className="text-2xl font-bold text-green-600">¥{fees.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FilePlus className="w-6 h-6" />
                  生成账单
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
