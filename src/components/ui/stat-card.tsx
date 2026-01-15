'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'text-blue-700',
  trend,
  className,
}: StatCardProps) {
  const isTrendPositive = trend && trend.value > 0;
  const isTrendNegative = trend && trend.value < 0;

  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-6 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  'text-sm font-medium',
                  isTrendPositive && 'text-green-600',
                  isTrendNegative && 'text-red-600',
                  !isTrendPositive && !isTrendNegative && 'text-slate-600'
                )}
              >
                {isTrendPositive && '+'}
                {trend.value}%
              </span>
              <span className="text-sm text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="rounded-lg bg-slate-100 p-3">
            <Icon className={cn('h-6 w-6', iconColor)} />
          </div>
        )}
      </div>
    </div>
  );
}
