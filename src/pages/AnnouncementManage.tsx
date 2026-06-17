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
  AlertCircle,
  Calendar,
  Infinity,
} from 'lucide-react';
import type { Announcement } from '../../shared/types.js';
import { useStore } from '../store';
import { announcements } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { cn } from '@/lib/utils';

const announcementSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  type: z.enum(['maintenance', 'rule', 'event', 'general']),
  priority: z.enum(['normal', 'important', 'urgent']),
  validUntil: z.string().optional(),
  permanent: z.boolean().optional(),
});

type AnnouncementForm = Required<Pick<z.infer<typeof announcementSchema>, 'title' | 'content' | 'type' | 'priority'>> & {
  validUntil?: string;
  permanent?: boolean;
};

const typeOptions = [
  { value: 'maintenance', label: '维护排班' },
  { value: 'rule', label: '规则说明' },
  { value: 'event', label: '活动通知' },
  { value: 'general', label: '一般公告' },
];

const priorityOptions = [
  { value: 'urgent', label: '紧急' },
  { value: 'important', label: '重要' },
  { value: 'normal', label: '普通' },
];

const typeLabels: Record<string, string> = {
  maintenance: '维护排班',
  rule: '规则说明',
  event: '活动通知',
  general: '一般公告',
};

const priorityLabels: Record<string, string> = {
  urgent: '紧急',
  important: '重要',
  normal: '普通',
};

export default function AnnouncementManage() {
  const { user, showToast } = useStore();
  const [announcementList, setAnnouncementList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AnnouncementForm>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      content: '',
      type: 'general',
      priority: 'normal',
      validUntil: '',
      permanent: true,
    },
  });

  const isPermanent = watch('permanent');

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await announcements.getAnnouncements();
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setAnnouncementList(sorted);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取公告列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin') {
      showToast('您没有权限访问此页面', 'error');
      return;
    }
    fetchAnnouncements();
  }, [user]);

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    reset({
      title: '',
      content: '',
      type: 'general',
      priority: 'normal',
      validUntil: '',
      permanent: true,
    });
    setShowModal(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setValue('title', announcement.title);
    setValue('content', announcement.content);
    setValue('type', announcement.type);
    setValue('priority', announcement.priority);
    const isPerm = !announcement.validUntil;
    setValue('permanent', isPerm);
    setValue('validUntil', isPerm ? '' : announcement.validUntil.split('T')[0]);
    setShowModal(true);
  };

  const onSubmit = async (data: AnnouncementForm) => {
    setSubmitting(true);
    try {
      const payload = {
        title: data.title,
        content: data.content,
        type: data.type,
        priority: data.priority,
        validUntil: data.permanent ? '' : (data.validUntil || ''),
      };
      if (editingAnnouncement) {
        await announcements.updateAnnouncement(editingAnnouncement.id, payload);
        showToast('公告更新成功', 'success');
      } else {
        await announcements.createAnnouncement(payload);
        showToast('公告创建成功', 'success');
      }
      setShowModal(false);
      fetchAnnouncements();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个公告吗？')) return;
    setDeletingId(id);
    try {
      await announcements.deleteAnnouncement(id);
      showToast('公告删除成功', 'success');
      fetchAnnouncements();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'error');
    } finally {
      setDeletingId(null);
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
              公告管理
            </h1>
            <p className="text-gray-500">管理所有公告信息</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            新增公告
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : announcementList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Settings className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">暂无公告</h3>
              <p className="text-gray-400 text-sm mb-4">点击上方按钮创建第一个公告</p>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增公告
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      标题
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      类型
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      优先级
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      发布时间
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      有效期至
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {announcementList.map((announcement) => (
                    <tr key={announcement.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-800">{announcement.title}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {typeLabels[announcement.type]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge
                          status={announcement.priority}
                          variant={
                            announcement.priority === 'urgent'
                              ? 'error'
                              : announcement.priority === 'important'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {new Date(announcement.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {announcement.validUntil ? (
                          new Date(announcement.validUntil).toLocaleDateString('zh-CN')
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                            <Infinity className="w-3 h-3" />
                            长期有效
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(announcement)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(announcement.id)}
                            disabled={deletingId === announcement.id}
                            className={cn(
                              'p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors',
                              deletingId === announcement.id && 'opacity-50 cursor-not-allowed'
                            )}
                            title="删除"
                          >
                            {deletingId === announcement.id ? (
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
                <h2 className="text-xl font-semibold text-gray-800">
                  {editingAnnouncement ? '编辑公告' : '新增公告'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标题
                  </label>
                  <input
                    type="text"
                    placeholder="请输入公告标题"
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border',
                      errors.title
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                      'focus:outline-none focus:ring-2 transition-all'
                    )}
                    {...register('title')}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      类型
                    </label>
                    <select
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border bg-white',
                        errors.type
                          ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                        'focus:outline-none focus:ring-2 transition-all'
                      )}
                      {...register('type')}
                    >
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.type && (
                      <p className="mt-1 text-sm text-red-500">{errors.type.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      优先级
                    </label>
                    <select
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border bg-white',
                        errors.priority
                          ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                        'focus:outline-none focus:ring-2 transition-all'
                      )}
                      {...register('priority')}
                    >
                      {priorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.priority && (
                      <p className="mt-1 text-sm text-red-500">{errors.priority.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    有效期设置
                  </label>
                  <div className="flex items-start gap-3 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border-2 transition-all flex-1"
                      style={{
                        borderColor: isPermanent ? '#16a34a' : '#e5e7eb',
                        backgroundColor: isPermanent ? '#f0fdf4' : '#ffffff'
                      }}>
                      <input
                        type="radio"
                        className="sr-only"
                        checked={isPermanent}
                        onChange={(e) => {
                          setValue('permanent', e.target.checked);
                          if (e.target.checked) {
                            setValue('validUntil', '');
                          }
                        }}
                      />
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: isPermanent ? '#16a34a' : '#d1d5db' }}>
                        {isPermanent && <div className="w-3 h-3 rounded-full bg-green-600" />}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 flex items-center gap-1">
                          <Infinity className="w-4 h-4 text-green-600" />
                          长期有效
                        </div>
                        <div className="text-xs text-gray-500">适合规则说明、长期公告</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border-2 transition-all flex-1"
                      style={{
                        borderColor: !isPermanent ? '#16a34a' : '#e5e7eb',
                        backgroundColor: !isPermanent ? '#f0fdf4' : '#ffffff'
                      }}>
                      <input
                        type="radio"
                        className="sr-only"
                        checked={!isPermanent}
                        onChange={(e) => {
                          setValue('permanent', !e.target.checked);
                          if (!e.target.checked) {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 30);
                            setValue('validUntil', tomorrow.toISOString().split('T')[0]);
                          }
                        }}
                      />
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: !isPermanent ? '#16a34a' : '#d1d5db' }}>
                        {!isPermanent && <div className="w-3 h-3 rounded-full bg-green-600" />}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-600" />
                          设置截止日期
                        </div>
                        <div className="text-xs text-gray-500">适合活动通知、临时公告</div>
                      </div>
                    </label>
                  </div>
                  {!isPermanent && (
                    <input
                      type="date"
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border',
                        errors.validUntil
                          ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                        'focus:outline-none focus:ring-2 transition-all'
                      )}
                      {...register('validUntil')}
                    />
                  )}
                  {errors.validUntil && (
                    <p className="mt-1 text-sm text-red-500">{errors.validUntil.message as string}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    内容
                  </label>
                  <textarea
                    rows={6}
                    placeholder="请输入公告内容..."
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border',
                      errors.content
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                      'focus:outline-none focus:ring-2 transition-all resize-none'
                    )}
                    {...register('content')}
                  />
                  {errors.content && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.content.message}
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
