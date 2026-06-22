import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  tone: 'blue' | 'green' | 'yellow' | 'red';
  helper?: string;
}

const toneClasses = {
  blue: 'bg-blue-50 text-primary-600 ring-blue-200 dark:bg-primary-900/30 dark:text-blue-300 dark:ring-primary-700',
  green: 'bg-emerald-50 text-brand-600 ring-emerald-200 dark:bg-brand-900/30 dark:text-brand-300 dark:ring-brand-700',
  yellow: 'bg-yellow-50 text-yellow-600 ring-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:ring-yellow-700',
  red: 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800',
};

export function StatCard({ title, value, icon: Icon, tone, helper }: StatCardProps) {
  return (
    <div className="card min-h-32 min-w-0 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-primary-900 dark:text-white">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {helper && <p className="mt-3 text-xs text-slate-400">{helper}</p>}
    </div>
  );
}
