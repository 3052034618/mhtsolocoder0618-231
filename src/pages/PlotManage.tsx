import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Settings,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { Plot } from '../../shared/types.js';
import { useStore } from '../store';
import { plots } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { cn } from '@/lib/utils';

const plotSchema = z.object({
  plotNumber: z.string().min(1, '地块编号不能为空'),
  area: z.coerce.number().min(0.1, '面积必须大于0'),
  status: z.enum(['available', 'claimed', 'maintenance']),
  location: z.string().min(1, '位置不能为空'),
  description: z.string().min(1, '描述不能为空'),
});

type PlotForm = Required<z.infer<typeof plotSchema>>;

const statusOptions = [
  { value: 'available', label: '空闲' },
  { value: 'claimed', label: '已认领' },
  { value: 'maintenance', label: '维护中' },
];

export default function PlotManage() {
  const { user, showToast } = useStore();
  const [plotList, setPlotList] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<PlotForm>({
    resolver: zodResolver(plotSchema),
    defaultValues: {
      plotNumber: '',
      area: 0,
      status: 'available',
      location: '',
      description: '',
    },
  });

  const fetchPlots = async () => {
    setLoading(true);
    try {
      const data = await plots.getPlots();
      setPlotList(data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取地块列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') {
      showToast('您没有权限访问此页面', 'error');
      return;
    }
    fetchPlots();
  }, [user]);

  const openCreateModal = () => {
    setEditingPlot(null);
    reset({
      plotNumber: '',
      area: 0,
      status: 'available',
      location: '',
      description: '',
    });
    setShowModal(true);
  };

  const openEditModal = (plot: Plot) => {
    setEditingPlot(plot);
    setValue('plotNumber', plot.plotNumber);
    setValue('area', plot.area);
    setValue('status', plot.status);
    setValue('location', plot.location);
    setValue('description', plot.description);
    setShowModal(true);
  };

  const onSubmit = async (data: PlotForm) => {
    setSubmitting(true);
    try {
      if (editingPlot) {
        await plots.updatePlot(editingPlot.id, data);
        showToast('地块更新成功', 'success');
      } else {
        await plots.createPlot(data);
        showToast('地块创建成功', 'success');
      }
      setShowModal(false);
      fetchPlots();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个地块吗？')) return;
    setDeletingId(id);
    try {
      await plots.deletePlot(id);
      showToast('地块删除成功', 'success');
      fetchPlots();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (plot: Plot, newStatus: 'available' | 'claimed' | 'maintenance') => {
    setChangingStatusId(plot.id);
    try {
      await plots.updatePlot(plot.id, {
        plotNumber: plot.plotNumber,
        area: plot.area,
        status: newStatus,
        location: plot.location,
        description: plot.description || '',
      });
      showToast('状态更新成功', 'success');
      fetchPlots();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '状态更新失败', 'error');
    } finally {
      setChangingStatusId(null);
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
              <Settings className="w-8 h-8 text-green-600" />
              地块管理
            </h1>
            <p className="text-gray-500">管理所有地块信息</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            新增地块
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : plotList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Settings className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">暂无地块</h3>
              <p className="text-gray-400 text-sm mb-4">点击上方按钮创建第一个地块</p>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增地块
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      地块编号
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      面积
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      位置
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      当前园丁
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      状态变更
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {plotList.map((plot) => (
                    <tr key={plot.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono font-semibold text-gray-800">
                          {plot.plotNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {plot.area} ㎡
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {plot.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={plot.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {plot.currentGardener?.username || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {changingStatusId === plot.id ? (
                            <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
                          ) : (
                            <>
                              {plot.status !== 'available' && (
                                <button
                                  onClick={() => handleStatusChange(plot, 'available')}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="设为空闲"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              {plot.status !== 'maintenance' && (
                                <button
                                  onClick={() => handleStatusChange(plot, 'maintenance')}
                                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                  title="设为维护中"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(plot)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(plot.id)}
                            disabled={deletingId === plot.id}
                            className={cn(
                              'p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors',
                              deletingId === plot.id && 'opacity-50 cursor-not-allowed'
                            )}
                            title="删除"
                          >
                            {deletingId === plot.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800">
                  {editingPlot ? '编辑地块' : '新增地块'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      地块编号
                    </label>
                    <input
                      type="text"
                      placeholder="例如：A-01"
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border',
                        errors.plotNumber
                          ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                        'focus:outline-none focus:ring-2 transition-all'
                      )}
                      {...register('plotNumber')}
                    />
                    {errors.plotNumber && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.plotNumber.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      面积 (㎡)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="例如：20.5"
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border',
                        errors.area
                          ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                        'focus:outline-none focus:ring-2 transition-all'
                      )}
                      {...register('area')}
                    />
                    {errors.area && (
                      <p className="mt-1 text-sm text-red-500">{errors.area.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    位置
                  </label>
                  <input
                    type="text"
                    placeholder="例如：东区第3排"
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border',
                      errors.location
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                      'focus:outline-none focus:ring-2 transition-all'
                    )}
                    {...register('location')}
                  />
                  {errors.location && (
                    <p className="mt-1 text-sm text-red-500">{errors.location.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    状态
                  </label>
                  <select
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border bg-white',
                      errors.status
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                      'focus:outline-none focus:ring-2 transition-all'
                    )}
                    {...register('status')}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.status && (
                    <p className="mt-1 text-sm text-red-500">{errors.status.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    描述
                  </label>
                  <textarea
                    rows={3}
                    placeholder="地块描述信息..."
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border',
                      errors.description
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                      'focus:outline-none focus:ring-2 transition-all resize-none'
                    )}
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
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
                        保存中
                      </>
                    ) : (
                      '保存'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
