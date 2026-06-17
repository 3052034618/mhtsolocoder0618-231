import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '@/lib/utils';

const toastStyles = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: XCircle,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Info,
  },
};

const toastIconColors: Record<string, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
};

export default function Toast() {
  const { toast, hideToast } = useStore();

  if (!toast) return null;

  const style = toastStyles[toast.type as keyof typeof toastStyles];
  const Icon = style.icon;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm">
      <div
        className={cn(
          'flex items-start gap-3 p-4 rounded-xl border shadow-lg animate-slideIn',
          style.bg,
          style.border
        )}
      >
        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', toastIconColors[toast.type])} />
        <p className="flex-1 text-sm text-gray-700">{toast.message}</p>
        <button
          onClick={hideToast}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
