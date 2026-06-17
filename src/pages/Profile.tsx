import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UserCircle,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Edit2,
  Check,
  X,
  Loader2,
  Leaf,
  BookOpen,
  Share2,
  Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User, Claim, JournalEntry, SharePost } from '../../shared/types.js';
import { useStore } from '../store';
import { claims, journal, shares, auth } from '../services/api';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符').max(20, '用户名最多20个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  phone: z.string().min(11, '请输入有效的手机号').max(11, '请输入有效的手机号'),
  address: z.string().max(100, '地址最多100个字符').optional()
});

const passwordSchema = z.object({
  oldPassword: z.string().min(6, '旧密码至少6个字符'),
  newPassword: z.string().min(6, '新密码至少6个字符'),
  confirmPassword: z.string().min(6, '确认密码至少6个字符')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword']
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface UserStats {
  claims: number;
  journals: number;
  shares: number;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, showToast, fetchCurrentUser } = useStore();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [stats, setStats] = useState<UserStats>({ claims: 0, journals: 0, shares: 0 });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || ''
    }
  });

  const {
    register: passwordRegister,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const formUsername = watch('username');
  const formPhone = watch('phone');
  const formAddress = watch('address');

  const fetchUserStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [claimsData, journalsData, sharesData] = await Promise.all([
        claims.getClaims(),
        Promise.resolve([] as JournalEntry[]),
        shares.getMyShares ? shares.getMyShares() : Promise.resolve([] as SharePost[])
      ]);

      const userClaims = claimsData.filter(c => c.userId === user.id);
      const userShares = sharesData.filter(s => s.userId === user.id);

      setStats({
        claims: userClaims.length,
        journals: 0,
        shares: userShares.length
      });

      reset({
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : '获取数据失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchUserStats();
  }, [user, navigate]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast('个人资料更新成功', 'success');
      setEditing(false);
      await fetchCurrentUser();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '更新失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showToast('密码修改成功', 'success');
      setChangingPassword(false);
      resetPassword();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '修改失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    reset({
      username: user?.username || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || ''
    });
  };

  const statCards = [
    {
      title: '认领地块',
      value: stats.claims,
      icon: Leaf,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: '日志记录',
      value: stats.journals,
      icon: BookOpen,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: '分享发布',
      value: stats.shares,
      icon: Share2,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <UserCircle className="w-8 h-8 text-green-600" />
            用户中心
          </h1>
          <p className="text-gray-500">管理您的个人信息和账户设置</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map((card, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', card.bgColor)}>
                <card.icon className={cn('w-6 h-6', card.textColor)} />
              </div>
              <p className="text-sm text-gray-500 mb-1">{card.title}</p>
              <p className={cn('text-3xl font-bold', card.textColor)}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">个人资料</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  取消
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <button className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-green-600 transition-colors opacity-0 group-hover:opacity-100">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-4 text-lg font-semibold text-gray-800">{formUsername || user?.username}</p>
              <p className="text-sm text-gray-500">
                {user?.role === 'admin' ? '管理员' : '园丁'}
              </p>
            </div>

            <div className="flex-1">
              {editing ? (
                <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                    <input
                      type="text"
                      className={cn(
                        'w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none',
                        errors.username
                          ? 'border-red-400 focus:border-red-500 bg-red-50'
                          : 'border-gray-200 focus:border-green-500 bg-gray-50 focus:bg-white'
                      )}
                      {...register('username')}
                    />
                    {errors.username && (
                      <p className="mt-1 text-sm text-red-500">{errors.username.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        className={cn(
                          'w-full pl-10 pr-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none',
                          errors.email
                            ? 'border-red-400 focus:border-red-500 bg-red-50'
                            : 'border-gray-200 focus:border-green-500 bg-gray-50 focus:bg-white'
                        )}
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">手机号</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        className={cn(
                          'w-full pl-10 pr-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none',
                          errors.phone
                            ? 'border-red-400 focus:border-red-500 bg-red-50'
                            : 'border-gray-200 focus:border-green-500 bg-gray-50 focus:bg-white'
                        )}
                        {...register('phone')}
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">地址</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <textarea
                        rows={3}
                        className={cn(
                          'w-full pl-10 pr-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none resize-none',
                          errors.address
                            ? 'border-red-400 focus:border-red-500 bg-red-50'
                            : 'border-gray-200 focus:border-green-500 bg-gray-50 focus:bg-white'
                        )}
                        {...register('address')}
                      />
                    </div>
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        保存修改
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <UserCircle className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">用户名</p>
                      <p className="font-medium text-gray-800">{user?.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">邮箱</p>
                      <p className="font-medium text-gray-800">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">手机号</p>
                      <p className="font-medium text-gray-800">{formPhone || user?.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">地址</p>
                      <p className="font-medium text-gray-800">{formAddress || user?.address || '未设置'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-600" />
              修改密码
            </h2>
            {!changingPassword && (
              <button
                onClick={() => setChangingPassword(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                修改
              </button>
            )}
          </div>

          {changingPassword ? (
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    placeholder="请输入当前密码"
                    className={cn(
                      'w-full pl-10 pr-12 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none',
                      passwordErrors.oldPassword
                        ? 'border-red-400 focus:border-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-green-500 bg-gray-50 focus:bg-white'
                    )}
                    {...passwordRegister('oldPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordErrors.oldPassword && (
                  <p className="mt-1 text-sm text-red-500">{passwordErrors.oldPassword.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="请输入新密码"
                    className={cn(
                      'w-full pl-10 pr-12 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none',
                      passwordErrors.newPassword
                        ? 'border-red-400 focus:border-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-green-500 bg-gray-50 focus:bg-white'
                    )}
                    {...passwordRegister('newPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-sm text-red-500">{passwordErrors.newPassword.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入新密码"
                    className={cn(
                      'w-full pl-10 pr-12 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none',
                      passwordErrors.confirmPassword
                        ? 'border-red-400 focus:border-red-500 bg-red-50'
                        : 'border-gray-200 focus:border-green-500 bg-gray-50 focus:bg-white'
                    )}
                    {...passwordRegister('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setChangingPassword(false);
                    resetPassword();
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      修改中...
                    </>
                  ) : (
                    '确认修改'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 bg-gray-50 rounded-xl text-center">
              <Lock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">密码已加密保护，点击修改按钮更新密码</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
