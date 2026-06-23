import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  tone: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'gray';
  helper?: string;
}

const toneClasses = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700 ring-blue-200 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-200 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
  yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700 ring-yellow-300 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 dark:ring-yellow-800',
  orange: 'border-orange-200 bg-orange-50 text-orange-700 ring-orange-200 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-800',
  red: 'border-red-200 bg-red-50 text-red-700 ring-red-200 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-800',
  gray: 'border-slate-200 bg-slate-50 text-slate-600 ring-slate-200 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:ring-slate-700',
};

export function StatCard({ title, value, icon: Icon, tone, helper }: StatCardProps) {
  return (
    <div className={`min-h-36 min-w-0 rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900 ${toneClasses[tone].split(' ').filter((item) => item.startsWith('border-') || item.startsWith('dark:border-')).join(' ')}`}>
      <div className="flex h-full items-start justify-between gap-3">
        <div className="flex min-h-24 min-w-0 flex-1 flex-col justify-between">
          <p className="min-h-10 break-words text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">{title}</p>
          <p className="mt-3 text-3xl font-bold leading-none text-primary-900 dark:text-white">{value.toLocaleString()}</p>
          {helper && <p className="mt-3 break-words text-xs leading-4 text-slate-400">{helper}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
