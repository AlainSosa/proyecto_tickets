import { ReactNode } from 'react';

interface DashboardChartProps {
  title: string;
  children: ReactNode;
  isEmpty?: boolean;
}

export function DashboardChart({ title, children, isEmpty }: DashboardChartProps) {
  return (
    <section className="card min-w-0 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-primary-900 dark:text-white">{title}</h2>
      </div>
      <div className="h-72 min-h-72 min-w-0">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Sin datos para mostrar
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
