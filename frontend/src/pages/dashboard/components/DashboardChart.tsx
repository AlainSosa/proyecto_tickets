import { ReactNode } from 'react';

interface DashboardChartProps {
  title: string;
  children: ReactNode;
  isEmpty?: boolean;
  description?: string;
  height?: 'regular' | 'large';
  className?: string;
}

export function DashboardChart({ title, children, isEmpty, description, height = 'regular', className = '' }: DashboardChartProps) {
  return (
    <section className={`card min-w-0 overflow-hidden p-5 sm:p-6 ${className}`}>
      <div className="mb-5 min-h-14">
        <h2 className="text-base font-semibold leading-6 text-primary-900 dark:text-white">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className={`${height === 'large' ? 'h-80 min-h-80' : 'h-72 min-h-72'} min-w-0`}>
        {isEmpty ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Sin datos para mostrar
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
