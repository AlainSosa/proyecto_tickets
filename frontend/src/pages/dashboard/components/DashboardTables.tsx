import { Asset, NetworkPoint, Ticket } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';

const statusLabelKeys: Record<Ticket['status'], 'pending' | 'inProgress' | 'finalized'> = {
  pending: 'pending',
  in_progress: 'inProgress',
  resolved: 'finalized',
};

const priorityLabelKeys: Record<NonNullable<Ticket['priority']>, 'low' | 'medium' | 'high' | 'critical'> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
};

const statusBadge: Record<Ticket['status'], string> = {
  pending: 'badge-yellow',
  in_progress: 'badge-blue',
  resolved: 'badge-green',
};

const priorityBadge: Record<NonNullable<Ticket['priority']>, string> = {
  low: 'badge-green',
  medium: 'badge-yellow',
  high: 'badge-orange',
  critical: 'badge-red',
};

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        {message}
      </td>
    </tr>
  );
}

function TableShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card min-w-0 overflow-hidden">
      <div className="border-b bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
        <h2 className="font-semibold text-primary-900 dark:text-white">{title}</h2>
      </div>
      <div className="min-w-0 overflow-x-auto">{children}</div>
    </section>
  );
}

export function RecentTicketsTable({ tickets }: { tickets: Ticket[] }) {
  const { t } = useLanguage();

  return (
    <TableShell title={t('recentRequests')}>
      <table className="min-w-[560px] w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="px-4 py-3">{t('title')}</th>
            <th className="px-4 py-3">{t('status')}</th>
            <th className="px-4 py-3">{t('priority')}</th>
            <th className="px-4 py-3">{t('requester')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tickets.length === 0 ? <EmptyRow colSpan={4} message={t('noTicketsFound')} /> : tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-brand-50/50 dark:hover:bg-slate-800/50">
              <td className="max-w-xs px-4 py-3 font-medium">{ticket.title}</td>
              <td className="px-4 py-3"><span className={statusBadge[ticket.status]}>{t(statusLabelKeys[ticket.status])}</span></td>
              <td className="px-4 py-3">
                {ticket.priority ? <span className={priorityBadge[ticket.priority]}>{t(priorityLabelKeys[ticket.priority])}</span> : <span className="badge-gray">{t('undefinedPriority')}</span>}
              </td>
              <td className="px-4 py-3">{ticket.requester?.name || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

export function CriticalTicketsTable({ tickets }: { tickets: Ticket[] }) {
  const { t } = useLanguage();

  return (
    <TableShell title={`${t('critical')} ${t('pendingTickets').toLowerCase()}`}>
      <table className="min-w-[560px] w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="px-4 py-3">{t('title')}</th>
            <th className="px-4 py-3">{t('priority')}</th>
            <th className="px-4 py-3">{t('status')}</th>
            <th className="px-4 py-3">{t('technician')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tickets.length === 0 ? <EmptyRow colSpan={4} message={t('noTicketsFound')} /> : tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-brand-50/50 dark:hover:bg-slate-800/50">
              <td className="max-w-xs px-4 py-3 font-medium">{ticket.title}</td>
              <td className="px-4 py-3">
                {ticket.priority ? <span className={priorityBadge[ticket.priority]}>{t(priorityLabelKeys[ticket.priority])}</span> : <span className="badge-gray">{t('undefinedPriority')}</span>}
              </td>
              <td className="px-4 py-3"><span className={statusBadge[ticket.status]}>{t(statusLabelKeys[ticket.status])}</span></td>
              <td className="px-4 py-3">{ticket.technician?.name || t('withoutAssignment')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

export function MaintenanceAssetsTable({ assets }: { assets: Asset[] }) {
  const { t } = useLanguage();

  return (
    <TableShell title={t('pendingMaintenance')}>
      <table className="min-w-[560px] w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="px-4 py-3">{t('code')}</th>
            <th className="px-4 py-3">{t('equipment')}</th>
            <th className="px-4 py-3">{t('location')}</th>
            <th className="px-4 py-3">{t('assigned')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {assets.length === 0 ? <EmptyRow colSpan={4} message={t('noAssetsFound')} /> : assets.map((asset) => (
            <tr key={asset.id} className="hover:bg-brand-50/50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3 font-medium">{asset.internalCode}</td>
              <td className="px-4 py-3">{asset.brand} {asset.model}</td>
              <td className="px-4 py-3">{asset.location || '-'}</td>
              <td className="px-4 py-3">{asset.assignedUser?.name || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

export function NetworkPointsTable({ points }: { points: NetworkPoint[] }) {
  const { t } = useLanguage();

  return (
    <TableShell title={t('networkInfrastructure')}>
      <table className="min-w-[560px] w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="px-4 py-3">{t('label')}</th>
            <th className="px-4 py-3">{t('location')}</th>
            <th className="px-4 py-3">Patch panel</th>
            <th className="px-4 py-3">Switch</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {points.length === 0 ? <EmptyRow colSpan={4} message={t('noNetworkFound')} /> : points.map((point) => (
            <tr key={point.id} className="hover:bg-brand-50/50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3 font-medium">{point.label}</td>
              <td className="px-4 py-3">{point.location}</td>
              <td className="px-4 py-3">{point.patchPanel || '-'}</td>
              <td className="px-4 py-3">{point.switch?.internalCode || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}
