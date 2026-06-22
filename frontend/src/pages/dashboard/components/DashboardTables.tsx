import { Asset, NetworkPoint, Ticket } from '../../../types';

const statusLabels: Record<Ticket['status'], string> = {
  open: 'Abierto',
  pending_assignment: 'Pendiente de asignación',
  assigned: 'Asignado',
  pending: 'Pendiente',
  in_progress: 'En proceso',
  on_hold: 'En espera',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  canceled: 'Cancelado',
};

const priorityLabels: Record<NonNullable<Ticket['priority']>, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

const statusBadge: Record<Ticket['status'], string> = {
  open: 'badge-blue',
  pending_assignment: 'badge-blue',
  assigned: 'badge-blue',
  pending: 'badge-blue',
  in_progress: 'badge-yellow',
  on_hold: 'badge-yellow',
  resolved: 'badge-green',
  closed: 'badge-gray',
  canceled: 'badge-gray',
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
  return (
    <TableShell title="Últimos tickets creados">
      <table className="min-w-[560px] w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="px-4 py-3">Título</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Prioridad</th>
            <th className="px-4 py-3">Solicitante</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tickets.length === 0 ? <EmptyRow colSpan={4} message="No hay tickets recientes." /> : tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-brand-50/50 dark:hover:bg-slate-800/50">
              <td className="max-w-xs px-4 py-3 font-medium">{ticket.title}</td>
              <td className="px-4 py-3"><span className={statusBadge[ticket.status]}>{statusLabels[ticket.status]}</span></td>
              <td className="px-4 py-3">{ticket.priority ? priorityLabels[ticket.priority] : 'Por definir'}</td>
              <td className="px-4 py-3">{ticket.requester?.name || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

export function CriticalTicketsTable({ tickets }: { tickets: Ticket[] }) {
  return (
    <TableShell title="Tickets críticos pendientes">
      <table className="min-w-[560px] w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="px-4 py-3">Título</th>
            <th className="px-4 py-3">Prioridad</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Técnico</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tickets.length === 0 ? <EmptyRow colSpan={4} message="No hay tickets críticos pendientes." /> : tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-brand-50/50 dark:hover:bg-slate-800/50">
              <td className="max-w-xs px-4 py-3 font-medium">{ticket.title}</td>
              <td className="px-4 py-3"><span className="badge-red">{ticket.priority ? priorityLabels[ticket.priority] : 'Por definir'}</span></td>
              <td className="px-4 py-3"><span className={statusBadge[ticket.status]}>{statusLabels[ticket.status]}</span></td>
              <td className="px-4 py-3">{ticket.technician?.name || 'Sin asignar'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

export function MaintenanceAssetsTable({ assets }: { assets: Asset[] }) {
  return (
    <TableShell title="Activos en mantenimiento">
      <table className="min-w-[560px] w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Equipo</th>
            <th className="px-4 py-3">Ubicación</th>
            <th className="px-4 py-3">Asignado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {assets.length === 0 ? <EmptyRow colSpan={4} message="No hay activos en mantenimiento." /> : assets.map((asset) => (
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
  return (
    <TableShell title="Puntos de red inactivos">
      <table className="min-w-[560px] w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="px-4 py-3">Etiqueta</th>
            <th className="px-4 py-3">Ubicación</th>
            <th className="px-4 py-3">Patch panel</th>
            <th className="px-4 py-3">Switch</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {points.length === 0 ? <EmptyRow colSpan={4} message="No hay puntos de red inactivos." /> : points.map((point) => (
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
