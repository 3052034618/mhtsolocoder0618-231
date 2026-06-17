import { cn } from '@/lib/utils';

type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'pending' | 'default';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  pending: 'bg-orange-100 text-orange-700 border-orange-200',
  default: 'bg-gray-100 text-gray-700 border-gray-200',
};

const statusMap: Record<string, { label: string; variant: StatusVariant }> = {
  available: { label: '空闲', variant: 'success' },
  claimed: { label: '已认领', variant: 'info' },
  maintenance: { label: '维护中', variant: 'warning' },
  pending: { label: '待审核', variant: 'pending' },
  approved: { label: '已通过', variant: 'success' },
  rejected: { label: '已拒绝', variant: 'error' },
  waiting: { label: '等待中', variant: 'pending' },
  expired: { label: '已过期', variant: 'default' },
  unpaid: { label: '未支付', variant: 'warning' },
  paid: { label: '已支付', variant: 'success' },
  active: { label: '进行中', variant: 'success' },
  completed: { label: '已完成', variant: 'info' },
  reserved: { label: '已预订', variant: 'pending' },
};

export default function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const mapped = statusMap[status.toLowerCase()] || { label: status, variant: 'default' };
  const finalVariant = variant || mapped.variant;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border',
        variantStyles[finalVariant],
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          finalVariant === 'success' && 'bg-green-500',
          finalVariant === 'warning' && 'bg-yellow-500',
          finalVariant === 'error' && 'bg-red-500',
          finalVariant === 'info' && 'bg-blue-500',
          finalVariant === 'pending' && 'bg-orange-500',
          finalVariant === 'default' && 'bg-gray-500'
        )}
      />
      {mapped.label}
    </span>
  );
}
