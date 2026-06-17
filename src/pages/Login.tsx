import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Leaf,
  Eye,
  EyeOff,
  User,
  Loader2,
  Info
} from 'lucide-react';
import { useStore } from '../store';

const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符')
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, loading, showToast } = useStore();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch {
      // Error is already handled in store
    }
  };

  const fillDemoAccount = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
    showToast('已填充演示账号', 'info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <svg className="absolute bottom-0 left-0 w-full h-64 opacity-20" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <path d="M0,100 Q300,50 600,100 T1200,100 L1200,200 L0,200 Z" fill="white" />
        </svg>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 shadow-lg">
            <Leaf className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">社区共享花园</h1>
          <p className="text-white/80">欢迎回来，请登录您的账户</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 animate-fadeIn delay-200">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="请输入邮箱"
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none ${
                    errors.email
                      ? 'border-red-400 focus:border-red-500 bg-red-50'
                      : 'border-gray-200 focus:border-secondary bg-gray-50 focus:bg-white'
                  }`}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl transition-all duration-200 focus:outline-none ${
                    errors.password
                      ? 'border-red-400 focus:border-red-500 bg-red-50'
                      : 'border-gray-200 focus:border-secondary bg-gray-50 focus:bg-white'
                  }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white py-3.5 rounded-xl font-medium
                       hover:from-secondary hover:to-primary transition-all duration-300 shadow-lg shadow-primary/30
                       hover:shadow-xl hover:shadow-primary/40 transform hover:-translate-y-0.5
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  登录中...
                </>
              ) : (
                '登 录'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              还没有账户？{' '}
              <Link to="/register" className="text-secondary font-medium hover:text-primary transition-colors">
                立即注册
              </Link>
            </p>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-accent/10 to-secondary/10 rounded-xl border border-accent/20">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-800 mb-2">演示账号</p>
                <div className="space-y-2 text-sm">
                  <button
                    onClick={() => fillDemoAccount('admin@garden.com', 'admin123')}
                    className="flex items-center gap-2 w-full text-left text-gray-600 hover:text-secondary transition-colors p-1.5 rounded-lg hover:bg-white/50"
                  >
                    <User className="w-4 h-4" />
                    <span>管理员：admin@garden.com / admin123</span>
                  </button>
                  <button
                    onClick={() => fillDemoAccount('zhang@garden.com', '123456')}
                    className="flex items-center gap-2 w-full text-left text-gray-600 hover:text-secondary transition-colors p-1.5 rounded-lg hover:bg-white/50"
                  >
                    <Leaf className="w-4 h-4" />
                    <span>园丁：zhang@garden.com / 123456</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
