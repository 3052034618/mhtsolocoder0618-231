import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Calendar,
  Sprout,
  Droplets,
  Bug,
  FileText,
  Loader2,
  X,
  Upload,
  Image,
} from 'lucide-react';
import type { JournalEntry } from '../../shared/types.js';
import { useStore } from '../store';
import { journal, upload } from '../services/api';
import { cn } from '@/lib/utils';

const journalSchema = z.object({
  date: z.string().min(1, '请选择日期'),
  planting: z.string().min(1, '请输入种植内容'),
  fertilized: z.boolean(),
  fertilizerType: z.string(),
  pests: z.string(),
  notes: z.string(),
  photos: z.array(z.string()),
});

type JournalForm = z.infer<typeof journalSchema>;

export default function JournalNew() {
  const { plotId, id } = useParams<{ plotId?: string; id?: string }>();
  const navigate = useNavigate();
  const { user, showToast } = useStore();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [existingEntry, setExistingEntry] = useState<JournalEntry | null>(null);

  const isEdit = !!id;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<JournalForm>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      planting: '',
      fertilized: false,
      fertilizerType: '',
      pests: '',
      notes: '',
      photos: [],
    },
  });

  const fertilized = watch('fertilized');
  const photos = watch('photos');

  const fetchEntry = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const entries = await journal.getJournal(parseInt(plotId || '0'));
      const entry = entries.find((e) => e.id === parseInt(id));
      if (entry) {
        setExistingEntry(entry);
        reset({
          date: entry.date.split('T')[0],
          planting: entry.planting,
          fertilized: entry.fertilized,
          fertilizerType: entry.fertilizerType,
          pests: entry.pests,
          notes: entry.notes,
          photos: entry.photos,
        });
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取日志详情失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEdit) {
      fetchEntry();
    }
  }, [id, isEdit]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const fileArray = Array.from(files);
      const result = await upload.uploadPhotos(fileArray);
      const newPhotos = [...photos, ...result.urls];
      setValue('photos', newPhotos);
      showToast(`成功上传 ${result.urls.length} 张照片`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '上传失败', 'error');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setValue('photos', newPhotos);
  };

  const onSubmit = async (data: JournalForm) => {
    if (!plotId) return;

    setLoading(true);
    try {
      const submitData = {
        date: data.date,
        planting: data.planting,
        fertilized: data.fertilized,
        fertilizerType: data.fertilizerType,
        pests: data.pests,
        notes: data.notes,
        photos: data.photos,
        plotId: parseInt(plotId),
      };

      if (isEdit && id) {
        await journal.updateJournal(parseInt(id), submitData);
        showToast('日志更新成功', 'success');
      } else {
        await journal.createJournal(submitData);
        showToast('日志创建成功', 'success');
      }

      navigate(`/journal/${plotId}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '保存失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 pb-8">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(`/journal/${plotId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回日志列表
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {isEdit ? '编辑种植日志' : '新增种植日志'}
          </h1>
          <p className="text-gray-500">
            {isEdit ? '修改这条种植记录的详细信息' : '记录今天的种植情况和发现'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              基本信息
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border',
                    errors.date
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                    'focus:outline-none focus:ring-2 transition-all'
                  )}
                  {...register('date')}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.date.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  种植内容 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0 mt-1">
                    <Sprout className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <textarea
                      rows={3}
                      placeholder="今天种植了什么作物？生长情况如何？"
                      className={cn(
                        'w-full px-4 py-3 rounded-xl border',
                        errors.planting
                          ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                          : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                        'focus:outline-none focus:ring-2 transition-all resize-none'
                      )}
                      {...register('planting')}
                    />
                    {errors.planting && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.planting.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-amber-600" />
              施肥管理
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">是否施肥</p>
                    <p className="text-sm text-gray-500">今天是否给作物施肥了吗？</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setValue('fertilized', !fertilized)}
                  className={cn(
                    'relative w-14 h-8 rounded-full transition-colors duration-200',
                    fertilized ? 'bg-green-500' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200',
                      fertilized ? 'translate-x-7' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {fertilized && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    肥料类型
                  </label>
                  <input
                    type="text"
                    placeholder="例如：有机肥、复合肥、尿素等"
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border',
                      'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                      'focus:outline-none focus:ring-2 transition-all'
                    )}
                    {...register('fertilizerType')}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Bug className="w-5 h-5 text-red-600" />
              虫害情况
            </h2>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0 mt-1">
                <Bug className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <textarea
                  rows={2}
                  placeholder="是否发现虫害？如何处理的？"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border',
                    'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                    'focus:outline-none focus:ring-2 transition-all resize-none'
                  )}
                  {...register('pests')}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              备注
            </h2>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-1">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <textarea
                  rows={3}
                  placeholder="其他需要记录的内容..."
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border',
                    'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                    'focus:outline-none focus:ring-2 transition-all resize-none'
                  )}
                  {...register('notes')}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Image className="w-5 h-5 text-purple-600" />
              照片记录
            </h2>

            <div className="mb-4">
              <label className={cn(
                'flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer',
                'border-gray-300 hover:border-green-500 hover:bg-green-50',
                'transition-all duration-200',
                uploading && 'opacity-50 cursor-not-allowed'
              )}>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-2" />
                    <span className="text-sm text-gray-500">上传中...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">点击或拖拽上传照片</span>
                    <span className="text-xs text-gray-400 mt-1">支持多图上传</span>
                  </div>
                )}
              </label>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt=""
                      className="w-full aspect-square object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(`/journal/${plotId}`)}
              className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'flex-1 py-3 bg-green-600 text-white rounded-xl font-medium',
                'hover:bg-green-700 transition-colors',
                'flex items-center justify-center gap-2',
                loading && 'opacity-70 cursor-not-allowed'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  保存中...
                </>
              ) : isEdit ? (
                '保存修改'
              ) : (
                '创建日志'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
