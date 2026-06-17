import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
  MapPin,
  Phone,
  Package,
  Sprout,
  Wrench,
  MoreHorizontal,
  Send,
} from 'lucide-react';
import { useStore } from '../store';
import { shares, upload } from '../services/api';
import { cn } from '@/lib/utils';

const shareSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(50, '标题不能超过50个字符'),
  description: z.string().min(1, '描述不能为空').max(500, '描述不能超过500个字符'),
  category: z.enum(['seeds', 'seedling', 'tool', 'other']),
  quantity: z.coerce.number().min(1, '数量至少为1').max(999, '数量不能超过999'),
  location: z.string().min(1, '位置不能为空').max(100, '位置不能超过100个字符'),
  contact: z.string().min(1, '联系方式不能为空').max(50, '联系方式不能超过50个字符'),
});

type ShareForm = Required<z.infer<typeof shareSchema>>;

const categoryOptions = [
  { value: 'seeds', label: '种子', icon: <Sprout className="w-4 h-4" /> },
  { value: 'seedling', label: '幼苗', icon: <Package className="w-4 h-4" /> },
  { value: 'tool', label: '工具', icon: <Wrench className="w-4 h-4" /> },
  { value: 'other', label: '其他', icon: <MoreHorizontal className="w-4 h-4" /> },
];

export default function ShareNew() {
  const navigate = useNavigate();
  const { showToast, setLoading } = useStore();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShareForm>({
    resolver: zodResolver(shareSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'seeds',
      quantity: 1,
      location: '',
      contact: '',
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (selectedFiles.length + files.length > 9) {
      showToast('最多只能上传9张照片', 'error');
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        showToast('只能上传图片文件', 'error');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('图片大小不能超过10MB', 'error');
        return false;
      }
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (selectedFiles.length === 0) return [];

    setUploadingPhotos(true);
    try {
      const result = await upload.uploadPhotos(selectedFiles);
      return result.urls;
    } finally {
      setUploadingPhotos(false);
    }
  };

  const onSubmit = async (data: ShareForm) => {
    setSubmitting(true);
    setLoading(true);
    try {
      const uploadedUrls = await uploadPhotos();

      await shares.createShare({
        ...data,
        photos: uploadedUrls,
      });

      showToast('发布成功', 'success');
      navigate('/shares');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '发布失败', 'error');
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/shares')}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">发布分享</h1>
            <p className="text-gray-500 text-sm">分享您的闲置物品给社区</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">基本信息</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例如：多余的番茄种子分享"
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
                  <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  类别 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {categoryOptions.map((option) => (
                    <label
                      key={option.value}
                      className="relative cursor-pointer"
                    >
                      <input
                        type="radio"
                        value={option.value}
                        className="sr-only peer"
                        {...register('category')}
                      />
                      <div className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 peer-checked:border-green-500 peer-checked:bg-green-50 transition-all">
                        <div className="text-gray-500 peer-checked:text-green-600">
                          {option.icon}
                        </div>
                        <span className="text-sm font-medium text-gray-600 peer-checked:text-green-700">
                          {option.label}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-500">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  描述 <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="详细描述您要分享的物品..."
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Package className="w-4 h-4 inline mr-1" />
                    数量 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border',
                      errors.quantity
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                      'focus:outline-none focus:ring-2 transition-all'
                    )}
                    {...register('quantity')}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.quantity.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  位置 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例如：社区东门保安室"
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
                  <Phone className="w-4 h-4 inline mr-1" />
                  联系方式 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="手机号或微信号"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border',
                    errors.contact
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-gray-200 focus:ring-green-500/20 focus:border-green-500',
                    'focus:outline-none focus:ring-2 transition-all'
                  )}
                  {...register('contact')}
                />
                {errors.contact && (
                  <p className="mt-1 text-sm text-red-500">{errors.contact.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              <ImageIcon className="w-5 h-5 inline mr-2" />
              照片上传
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              最多可上传9张照片，单张不超过10MB
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {previewUrls.map((url, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
                >
                  <img
                    src={url}
                    alt={`预览 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {previewUrls.length < 9 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">上传照片</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/shares')}
              className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingPhotos}
              className={cn(
                'flex-1 py-3 bg-green-600 text-white rounded-xl font-medium',
                'hover:bg-green-700 transition-colors',
                'flex items-center justify-center gap-2',
                (submitting || uploadingPhotos) && 'opacity-70 cursor-not-allowed'
              )}
            >
              {submitting || uploadingPhotos ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {uploadingPhotos ? '上传照片中...' : '发布中...'}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  发布
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
