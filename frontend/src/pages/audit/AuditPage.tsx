import { useMemo, useState } from 'react';
import { FileClock, RefreshCw, ShieldCheck } from 'lucide-react';
import { AuditLog } from '../../types';
import { usePaginatedData } from '../../hooks/usePaginatedData';
import { SearchInput } from '../../components/ui/SearchInput';
import { DataTable, Column } from '../../components/ui/DataTable';
import { Pagination } from '../../components/ui/Pagination';
import { Language, useLanguage } from '../../context/LanguageContext';

const auditActionLabels = {
  es: {
    ticket_created: 'Ticket creado',
    ticket_updated: 'Ticket actualizado',
    ticket_comment_added: 'Comentario agregado',
    comment_added: 'Comentario agregado',
    ticket_assigned: 'Ticket asignado',
    ticket_reassigned: 'Ticket reasignado',
    priority_defined: 'Prioridad definida',
    status_updated: 'Estado actualizado',
    diagnosis_registered: 'Diagnóstico registrado',
    solution_registered: 'Solución registrada',
    ticket_resolved: 'Ticket finalizado',
    ticket_closed: 'Ticket cerrado',
  },
  pt: {
    ticket_created: 'Ticket criado',
    ticket_updated: 'Ticket atualizado',
    ticket_comment_added: 'Comentário adicionado',
    comment_added: 'Comentário adicionado',
    ticket_assigned: 'Ticket atribuído',
    ticket_reassigned: 'Ticket reatribuído',
    priority_defined: 'Prioridade definida',
    status_updated: 'Estado atualizado',
    diagnosis_registered: 'Diagnóstico registrado',
    solution_registered: 'Solução registrada',
    ticket_resolved: 'Ticket finalizado',
    ticket_closed: 'Ticket fechado',
  },
} as const;

const auditEntityLabels = {
  es: {
    ticket: 'Ticket',
    user: 'Usuario',
    asset: 'Activo',
    network_point: 'Punto de red',
    extension: 'Extensión',
    maintenance: 'Mantenimiento',
  },
  pt: {
    ticket: 'Ticket',
    user: 'Usuário',
    asset: 'Ativo',
    network_point: 'Ponto de rede',
    extension: 'Ramal',
    maintenance: 'Manutenção',
  },
} as const;

const auditFieldLabels = {
  es: {
    title: 'título',
    description: 'descripción',
    category: 'categoría',
    location: 'área',
    attachments: 'evidencias',
    status: 'estado',
    priority: 'prioridad',
    requestedBy: 'solicitante',
    assignedTo: 'técnico asignado',
    comment: 'comentario',
    solution: 'solución',
    diagnosis: 'diagnóstico',
  },
  pt: {
    title: 'título',
    description: 'descrição',
    category: 'categoria',
    location: 'área',
    attachments: 'evidências',
    status: 'estado',
    priority: 'prioridade',
    requestedBy: 'solicitante',
    assignedTo: 'técnico atribuído',
    comment: 'comentário',
    solution: 'solução',
    diagnosis: 'diagnóstico',
  },
} as const;

const auditValueLabels = {
  es: {
    pending: 'Pendiente',
    in_progress: 'En proceso',
    resolved: 'Finalizado',
    open: 'Abierto',
    pending_assignment: 'Pendiente de asignación',
    assigned: 'Asignado',
    on_hold: 'En espera',
    closed: 'Cerrado',
    canceled: 'Cancelado',
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica',
    user: 'Usuario',
    technician: 'Técnico',
    admin: 'Administrador',
    null: 'Sin definir',
  },
  pt: {
    pending: 'Pendente',
    in_progress: 'Em processo',
    resolved: 'Finalizado',
    open: 'Aberto',
    pending_assignment: 'Pendente de atribuição',
    assigned: 'Atribuído',
    on_hold: 'Em espera',
    closed: 'Fechado',
    canceled: 'Cancelado',
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
    user: 'Usuário',
    technician: 'Técnico',
    admin: 'Administrador',
    null: 'Sem definir',
  },
} as const;

const auditSummaryText = {
  es: {
    ticketCreated: 'Se registró un nuevo ticket en el sistema.',
    commentAdded: 'Se agregó un comentario al ticket.',
    noDataChanges: 'Se registró una acción sin cambios de datos asociados.',
    registeredAs: 'Se registró',
    changedFrom: 'Se cambió',
    as: 'como',
    from: 'de',
    to: 'a',
  },
  pt: {
    ticketCreated: 'Um novo ticket foi registrado no sistema.',
    commentAdded: 'Um comentário foi adicionado ao ticket.',
    noDataChanges: 'Foi registrada uma ação sem alterações de dados associadas.',
    registeredAs: 'Foi registrado',
    changedFrom: 'Foi alterado',
    as: 'como',
    from: 'de',
    to: 'para',
  },
} as const;

function translateAction(action: string, language: Language) {
  return auditActionLabels[language][action as keyof typeof auditActionLabels.es] || action.replace(/_/g, ' ');
}

function translateEntity(entity: string, language: Language) {
  return auditEntityLabels[language][entity as keyof typeof auditEntityLabels.es] || entity.replace(/_/g, ' ');
}

function translateField(field: string, language: Language) {
  return auditFieldLabels[language][field as keyof typeof auditFieldLabels.es] || field.replace(/_/g, ' ');
}

function translateValue(value: unknown, language: Language): string {
  if (value === null || value === undefined || value === '') return auditValueLabels[language].null;
  if (Array.isArray(value)) return value.length ? value.map((item) => translateValue(item, language)).join(', ') : '-';
  if (typeof value === 'object') return compactJson(value as Record<string, unknown>, language);
  const text = String(value);
  return auditValueLabels[language][text as keyof typeof auditValueLabels.es] || text;
}

function compactJson(value: Record<string, unknown> | null, language: Language) {
  if (!value) return '-';
  return Object.entries(value)
    .map(([key, item]) => `${translateField(key, language)}: ${translateValue(item, language)}`)
    .join(' | ');
}

function buildAuditSummary(row: AuditLog, language: Language) {
  const text = auditSummaryText[language];
  if (row.action === 'ticket_created') return text.ticketCreated;
  if (row.action === 'ticket_comment_added' || row.action === 'comment_added') return text.commentAdded;

  const oldData = row.oldData || {};
  const newData = row.newData || {};
  const changedFields = Object.keys(newData);

  if (!changedFields.length) return text.noDataChanges;

  return changedFields.map((field) => {
    const oldValue = oldData[field];
    const newValue = newData[field];
    const readableField = translateField(field, language);
    if (oldValue === undefined || oldValue === null || oldValue === '') {
      return `${text.registeredAs} ${readableField} ${text.as} ${translateValue(newValue, language)}.`;
    }
    return `${text.changedFrom} ${readableField} ${text.from} ${translateValue(oldValue, language)} ${text.to} ${translateValue(newValue, language)}.`;
  }).join(' ');
}

function ActionBadge({ action, language }: { action: string; language: Language }) {
  const tone = action.includes('created')
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
    : action.includes('comment')
      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300'
      : action.includes('resolved') || action.includes('closed')
        ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300'
        : 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300';

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {translateAction(action, language)}
    </span>
  );
}

export function AuditPage() {
  const { locale, language, t } = useLanguage();
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');

  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    if (search) next.search = search;
    if (entity) next.entity = entity;
    return next;
  }, [search, entity]);

  const { data, page, totalPages, isLoading, setPage, refetch } = usePaginatedData<AuditLog>({
    endpoint: '/audit',
    filters,
    limit: 20,
  });

  const columns: Column<AuditLog>[] = [
    { header: t('date'), accessor: (row) => new Date(row.createdAt).toLocaleString(locale) },
    { header: t('user'), accessor: (row) => row.user?.name || '-' },
    { header: t('action'), accessor: (row) => <ActionBadge action={row.action} language={language} /> },
    { header: t('entity'), accessor: (row) => `${translateEntity(row.entity, language)}${row.entityId ? ` #${row.entityId}` : ''}` },
    { header: t('summary'), accessor: (row) => <span className="text-slate-600 dark:text-slate-300">{buildAuditSummary(row, language)}</span> },
    { header: 'IP', accessor: (row) => row.ipAddress || '-' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-primary-900 dark:text-white">
            <ShieldCheck className="h-6 w-6 text-brand-600" />
            {t('audit')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('auditDescription')}
          </p>
        </div>
        <button onClick={refetch} className="btn-secondary gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('refresh')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder={t('searchAudit')} />
        </div>
        <select value={entity} onChange={(event) => setEntity(event.target.value)} className="input w-44">
          <option value="">{t('allEntities')}</option>
          <option value="ticket">Tickets</option>
        </select>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase text-slate-500">{t('visibleRecords')}</p>
          <p className="mt-2 text-2xl font-bold text-primary-900 dark:text-white">{data.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase text-slate-500">{t('filteredEntity')}</p>
          <p className="mt-2 text-lg font-semibold text-primary-900 dark:text-white">{entity ? translateEntity(entity, language) : t('allFem')}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase text-slate-500">{t('reading')}</p>
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{t('translatedActions')}</p>
        </div>
      </section>

      <DataTable columns={columns} data={data} isLoading={isLoading} emptyMessage={t('noAuditRecords')} />

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-900 dark:text-white">
          <FileClock className="h-4 w-4 text-brand-600" />
          {t('auditDetail')}
        </div>
        <div className="grid gap-3">
          {data.map((row) => (
            <article key={row.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <ActionBadge action={row.action} language={language} />
                  <p className="mt-2 text-sm font-semibold text-primary-900 dark:text-white">
                    {translateEntity(row.entity, language)}{row.entityId ? ` #${row.entityId}` : ''}
                  </p>
                </div>
                <p className="text-xs text-slate-500">{new Date(row.createdAt).toLocaleString(locale)}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{buildAuditSummary(row, language)}</p>
              <div className="mt-3 grid gap-3 text-xs md:grid-cols-3">
                <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800/70">
                  <p className="font-semibold text-slate-500">{t('user')}</p>
                  <p className="mt-1 text-slate-700 dark:text-slate-200">{row.user?.name || '-'}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800/70">
                  <p className="font-semibold text-slate-500">{t('previousData')}</p>
                  <p className="mt-1 break-words text-slate-700 dark:text-slate-200">{compactJson(row.oldData, language)}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-800/70">
                  <p className="font-semibold text-slate-500">{t('newData')}</p>
                  <p className="mt-1 break-words text-slate-700 dark:text-slate-200">{compactJson(row.newData, language)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
