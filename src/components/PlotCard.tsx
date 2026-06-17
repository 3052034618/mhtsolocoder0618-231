import { MapPin, Maximize2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Plot } from '../../shared/types.js';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';

interface PlotCardProps {
  plot: Plot;
  onClick?: () => void;
  className?: string;
}

const statusBorderColors: Record<string, string> = {
  available: 'border-l-green-500 hover:border-green-300',
  claimed: 'border-l-blue-500 hover:border-blue-300',
  maintenance: 'border-l-orange-500 hover:border-orange-300',
};

const statusBgColors: Record<string, string> = {
  available: 'bg-green-50',
  claimed: 'bg-blue-50',
  maintenance: 'bg-orange-50',
};

export default function PlotCard({ plot, onClick, className }: PlotCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/plots/${plot.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'card cursor-pointer border-l-4 transition-all duration-300 animate-hoverLift',
        statusBorderColors[plot.status] || 'border-l-gray-300',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            地块 {plot.plotNumber}
          </h3>
          <StatusBadge status={plot.status} />
        </div>
        <div
          className={cn(
            'p-2 rounded-lg',
            statusBgColors[plot.status] || 'bg-gray-50'
          )}
        >
          <Maximize2
            className={cn(
              'w-5 h-5',
              plot.status === 'available' && 'text-green-600',
              plot.status === 'claimed' && 'text-blue-600',
              plot.status === 'maintenance' && 'text-orange-600'
            )}
          />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Maximize2 className="w-4 h-4 text-secondary" />
          <span className="text-sm">
            <span className="font-medium">面积：</span>
            {plot.area} ㎡
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4 text-secondary" />
          <span className="text-sm">
            <span className="font-medium">位置：</span>
            {plot.location}
          </span>
        </div>
      </div>

      {plot.description && (
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
          {plot.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          创建于 {new Date(plot.createdAt).toLocaleDateString('zh-CN')}
        </span>
        <div className="flex items-center gap-1 text-primary font-medium text-sm group">
          查看详情
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </div>
  );
}
