import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Ticket, TicketComment, TicketPriority, User as UserType } from '../../types';
import api from '../../services/api';
import { ArrowLeft, MessageSquare, Clock, User, AlertTriangle, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getTicketStatusBadge, getTicketStatusLabelKey } from '../../constants/ticketStatuses';

const priorityLabelKeys = { low: 'low', medium: 'medium', high: 'high', critical: 'critical' } as const;

const priorityBadge: Record<string, string> = {
  low: 'badge-gray',
  medium: 'badge-blue',
  high: 'badge-yellow',
  critical: 'badge-red',
};

const historyActionLabels = {
  es: {
    ticket_created: 'Ticket creado',
    ticket_assigned: 'Ticket asignado',
    priority_defined: 'Prioridad definida',
    status_updated: 'Estado actualizado',
    comment_added: 'Comentario agregado',
    diagnosis_registered: 'Diagnóstico registrado',
    solution_registered: 'Solución registrada',
    ticket_resolved: 'Ticket resuelto',
    ticket_closed: 'Ticket cerrado',
    ticket_reassigned: 'Ticket reasignado',
    follow_up_added: 'Seguimiento agregado',
  },
  pt: {
    ticket_created: 'Ticket criado',
    ticket_assigned: 'Ticket atribuído',
    priority_defined: 'Prioridade definida',
    status_updated: 'Estado atualizado',
    comment_added: 'Comentário adicionado',
    diagnosis_registered: 'Diagnóstico registrado',
    solution_registered: 'Solução registrada',
    ticket_resolved: 'Ticket resolvido',
    ticket_closed: 'Ticket fechado',
    ticket_reassigned: 'Ticket reatribuído',
    follow_up_added: 'Acompanhamento adicionado',
  },
} as const;

const historyFieldLabels = {
  es: {
    title: 'título',
    description: 'descripción',
    category: 'categoría',
    location: 'ubicación',
    attachments: 'evidencias',
    status: 'estado',
    priority: 'prioridad',
    assignedTo: 'técnico asignado',
    comment: 'comentario',
    diagnosis: 'diagnóstico',
    solution: 'solución',
    requestedBy: 'solicitante',
  },
  pt: {
    title: 'título',
    description: 'descrição',
    category: 'categoria',
    location: 'localização',
    attachments: 'evidências',
    status: 'estado',
    priority: 'prioridade',
    assignedTo: 'técnico atribuído',
    comment: 'comentário',
    diagnosis: 'diagnóstico',
    solution: 'solução',
    requestedBy: 'solicitante',
  },
} as const;

const historyValueLabels = {
  es: {
    open: 'Abierto',
    pending_assignment: 'Pendiente de asignación',
    assigned: 'Asignado',
    pending: 'Pendiente',
    in_progress: 'En proceso',
    on_hold: 'En espera',
    resolved: 'Finalizado',
    closed: 'Cerrado',
    canceled: 'Cancelado',
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica',
    user: 'Usuario',
    technician: 'Técnico',
    admin: 'Administrador',
    undefined: 'Por definir',
    null: 'Por definir',
    'sin definir': 'Por definir',
    'sin asignar': 'Sin asignar',
  },
  pt: {
    open: 'Aberto',
    pending_assignment: 'Pendente de atribuição',
    assigned: 'Atribuído',
    pending: 'Pendente',
    in_progress: 'Em processo',
    on_hold: 'Em espera',
    resolved: 'Finalizado',
    closed: 'Fechado',
    canceled: 'Cancelado',
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
    user: 'Usuário',
    technician: 'Técnico',
    admin: 'Administrador',
    undefined: 'A definir',
    null: 'A definir',
    'sin definir': 'A definir',
    'sin asignar': 'Sem atribuição',
  },
} as const;

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<Ticket['status']>('in_progress');
  const [diagnosis, setDiagnosis] = useState('');
  const [solution, setSolution] = useState('');
  const [technicians, setTechnicians] = useState<UserType[]>([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const { t, locale, language } = useLanguage();
  const { user } = useAuth();

  const formatHistoryAction = (action?: string | null) => {
    if (!action) return t('changed');
    return historyActionLabels[language][action as keyof typeof historyActionLabels.es] || action;
  };

  const formatHistoryField = (field: string) => {
    return historyFieldLabels[language][field as keyof typeof historyFieldLabels.es] || field;
  };

  const formatHistoryValue = (value?: string | null) => {
    if (!value || value === 'sin definir') return t('undefinedPriority');
    const translated = historyValueLabels[language][value as keyof typeof historyValueLabels.es];
    if (translated) return translated;
    if (value in priorityLabelKeys) return t(priorityLabelKeys[value as keyof typeof priorityLabelKeys]);
    if (value === 'sin asignar') return t('withoutAssignment');
    return value;
  };

  const formatHistoryDescription = (history: NonNullable<Ticket['histories']>[number]) => {
    if (history.solution) return `Solución registrada: ${history.solution}`;
    if (history.comment) return `Detalle registrado: ${history.comment}`;
    const field = formatHistoryField(history.field);
    const oldValue = formatHistoryValue(history.oldValue);
    const newValue = formatHistoryValue(history.newValue);
    if (!history.oldValue || oldValue === t('undefinedPriority')) {
      return `Se registró ${field} como ${newValue}.`;
    }
    return `Se cambió ${field} de ${oldValue} a ${newValue}.`;
  };

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      api.get(`/tickets/${id}`)
        .then((res) => setTicket(res.data.data))
        .catch(() => toast.error(t('ticketLoadError')))
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/users', { params: { role: 'technician', limit: 100 } })
        .then((res) => setTechnicians(res.data?.data || []))
        .catch(() => {});
    }
  }, [user?.role]);

  useEffect(() => {
    if (ticket) {
      setAssignedTo(ticket.assignedTo ? String(ticket.assignedTo) : '');
      setPriority(ticket.priority || '');
      setStatus(ticket.status);
    }
  }, [ticket]);

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await api.post(`/tickets/${id}/comments`, { comment });
      setTicket((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: [...(prev.comments || []), res.data.data],
        };
      });
      setComment('');
      toast.success(t('commentAdded'));
    } catch {
      toast.error(t('commentError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const reloadTicket = async () => {
    const res = await api.get(`/tickets/${id}`);
    setTicket(res.data.data);
  };

  const handleStatusChange = async () => {
    setIsActionSubmitting(true);
    try {
      await api.patch(`/tickets/${id}/status`, { status, comment: comment || undefined });
      setComment('');
      await reloadTicket();
      toast.success(t('ticketUpdated'));
    } catch {
      toast.error(t('ticketSavedError'));
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleFollowUp = async (type: 'diagnosis' | 'solution') => {
    const value = type === 'diagnosis' ? diagnosis : solution;
    if (!value.trim()) return;
    setIsActionSubmitting(true);
    try {
      await api.post(`/tickets/${id}/follow-ups`, type === 'diagnosis' ? { diagnosis } : { solution });
      if (type === 'diagnosis') setDiagnosis('');
      else setSolution('');
      await reloadTicket();
      toast.success(t('commentAdded'));
    } catch {
      toast.error(t('genericError'));
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!solution.trim()) return;
    setIsActionSubmitting(true);
    try {
      await api.patch(`/tickets/${id}/resolve`, { solution });
      setSolution('');
      await reloadTicket();
      toast.success(t('ticketUpdated'));
    } catch {
      toast.error(t('ticketSavedError'));
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleClose = async () => {
    setIsActionSubmitting(true);
    try {
      await api.patch(`/tickets/${id}/close`, { comment: comment || undefined });
      setComment('');
      await reloadTicket();
      toast.success(t('ticketUpdated'));
    } catch {
      toast.error(t('ticketSavedError'));
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleTechnicianStatusChange = async (nextStatus: Ticket['status']) => {
    setIsActionSubmitting(true);
    try {
      await api.patch(`/tickets/${id}/status`, { status: nextStatus, comment: comment || undefined });
      setComment('');
      await reloadTicket();
      toast.success(t('ticketUpdated'));
    } catch {
      toast.error(t('ticketSavedError'));
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!assignedTo) return;
    setIsActionSubmitting(true);
    try {
      await api.patch(`/tickets/${id}/assign`, {
        assignedTo: parseInt(assignedTo),
        priority: priority || null,
      });
      await reloadTicket();
      toast.success(t('ticketUpdated'));
    } catch {
      toast.error(t('ticketSavedError'));
    } finally {
      setIsActionSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="card p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">{t('ticketNotFound')}</p>
      </div>
    );
  }

  const orderedHistories = [...(ticket.histories || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate('/tickets')} className="btn-secondary gap-2">
        <ArrowLeft className="h-4 w-4" />
        {t('backToTickets')}
      </button>

      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{ticket.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              #{ticket.id} &middot; {t('created')} {new Date(ticket.createdAt).toLocaleString(locale)}
            </p>
          </div>
          <div className="flex gap-2">
            <span className={getTicketStatusBadge(ticket.status)}>{t(getTicketStatusLabelKey(ticket.status))}</span>
            <span className={ticket.priority ? priorityBadge[ticket.priority] : 'badge-gray'}>
              {ticket.priority ? t(priorityLabelKeys[ticket.priority]) : t('undefinedPriority')}
            </span>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 md:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">{t('requester')}</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium">
              <User className="h-3.5 w-3.5 text-brand-600" /> {ticket.requester?.name || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('assignedTechnician')}</p>
            <p className="text-sm font-medium mt-1">{ticket.technician?.name || t('withoutAssignment')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('lastUpdate')}</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium">
              <Clock className="h-3.5 w-3.5 text-brand-600" /> {new Date(ticket.updatedAt).toLocaleString(locale)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('resolution')}</p>
            <p className="text-sm font-medium mt-1">{ticket.resolutionDate ? new Date(ticket.resolutionDate).toLocaleDateString(locale) : '-'}</p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Categoría</p>
            <p className="mt-1 text-sm font-medium">{ticket.category}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t('location')}</p>
            <p className="mt-1 text-sm font-medium">{ticket.location}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Evidencias</p>
            <p className="mt-1 text-sm font-medium">{(ticket.attachments || []).length} adjunto(s)</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-2">{t('description')}</h3>
          <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">{ticket.description}</p>
        </div>

        {(ticket.attachments || []).length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Evidencias</h3>
            <div className="space-y-2">
              {(ticket.attachments || []).map((attachment, index) => (
                <a key={attachment} href={attachment} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-brand-700 hover:underline">
                  Evidencia {index + 1}: {attachment}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {user?.role === 'admin' && (
        <div className="card p-6">
          <h3 className="mb-4 font-semibold">Asignación y prioridad</h3>
          <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('assignedTechnician')}</label>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="input">
                <option value="">{t('withoutAssignment')}</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>{technician.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('priority')}</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority | '')} className="input">
                <option value="">{t('undefinedPriority')}</option>
                <option value="low">{t('low')}</option>
                <option value="medium">{t('medium')}</option>
                <option value="high">{t('high')}</option>
                <option value="critical">{t('critical')}</option>
              </select>
            </div>
            <button type="button" onClick={handleAssign} disabled={!assignedTo || isActionSubmitting} className="btn-primary">
              Guardar asignación
            </button>
          </div>
        </div>
      )}

      {user?.role === 'technician' && (
        <div className="card p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <ClipboardCheck className="h-5 w-5 text-brand-600" />
                Seguimiento operativo
              </h3>
            </div>
            <span className={getTicketStatusBadge(ticket.status)}>
              {t(getTicketStatusLabelKey(ticket.status))}
            </span>
          </div>

          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => handleTechnicianStatusChange('in_progress')}
                disabled={isActionSubmitting || ticket.status === 'in_progress'}
                className={`rounded-lg border p-4 text-left transition ${
                  ticket.status === 'in_progress'
                    ? 'border-brand-500 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-900/20 dark:text-brand-200'
                    : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                <p className="text-sm font-semibold">{t('inProgress')}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">El trabajo técnico está activo.</p>
              </button>
              <button
                type="button"
                onClick={() => handleTechnicianStatusChange('pending')}
                disabled={isActionSubmitting || ticket.status === 'pending'}
                className={`rounded-lg border p-4 text-left transition ${
                  ticket.status === 'pending'
                    ? 'border-yellow-500 bg-yellow-50 text-yellow-800 dark:border-yellow-400 dark:bg-yellow-900/20 dark:text-yellow-200'
                    : 'border-slate-200 hover:border-yellow-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                <p className="text-sm font-semibold">Pendiente</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">La atención está pendiente de continuar.</p>
              </button>
              <button
                type="button"
                onClick={() => handleTechnicianStatusChange('resolved')}
                disabled={isActionSubmitting || ticket.status === 'resolved'}
                className={`rounded-lg border p-4 text-left transition ${
                  ticket.status === 'resolved'
                    ? 'border-green-500 bg-green-50 text-green-800 dark:border-green-400 dark:bg-green-900/20 dark:text-green-200'
                    : 'border-slate-200 hover:border-green-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                }`}
              >
                <p className="text-sm font-semibold">{t('finalized')}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">La atención técnica fue completada.</p>
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-primary-900 dark:text-white">Diagnóstico</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Describe la causa identificada o el análisis realizado.
                  </p>
                </div>
                <textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="input min-h-[140px]"
                  placeholder="Ejemplo: Se verificó conectividad, configuración o evidencia del error."
                />
                <button
                  type="button"
                  onClick={() => handleFollowUp('diagnosis')}
                  disabled={!diagnosis.trim() || isActionSubmitting}
                  className="btn-secondary mt-3 w-full"
                >
                  Registrar diagnóstico
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-primary-900 dark:text-white">Solución aplicada</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Indica la acción ejecutada para resolver o avanzar el caso.
                  </p>
                </div>
                <textarea
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  className="input min-h-[140px]"
                  placeholder="Ejemplo: Se reinstaló el driver, se cambió cableado o se corrigió configuración."
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleFollowUp('solution')}
                    disabled={!solution.trim() || isActionSubmitting}
                    className="btn-secondary"
                  >
                    Registrar solución
                  </button>
                  <button
                    type="button"
                    onClick={handleResolve}
                    disabled={!solution.trim() || isActionSubmitting}
                    className="btn-primary"
                  >
                    Marcar finalizado
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-brand-600" />
          {t('comments')} ({ticket.comments?.length || 0})
        </h3>

        <div className="space-y-4 mb-6">
          {(ticket.comments || []).length === 0 && (
            <p className="text-sm text-slate-500">{t('noComments')}</p>
          )}
          {(ticket.comments || []).map((comment) => (
            <div key={comment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{comment.author?.name || t('user')}</p>
                <p className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleString(locale)}</p>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">{comment.comment}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('addComment')}
            className="input min-h-[80px] flex-1"
          />
          <button
            onClick={handleAddComment}
            disabled={!comment.trim() || isSubmitting}
            className="btn-primary self-end"
          >
            {isSubmitting ? '...' : t('send')}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-brand-600" />
          {t('timeline')}
        </h3>
        {orderedHistories.length === 0 && (
          <p className="text-sm text-slate-500">{t('noHistory')}</p>
        )}
        <div className="space-y-4">
          {orderedHistories.map((history) => (
            <div key={history.id} className="border-l-2 border-brand-200 pl-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-primary-900 dark:text-white">
                  {formatHistoryAction(history.action)}
                </p>
                <p className="text-xs text-slate-500">{new Date(history.createdAt).toLocaleString(locale)}</p>
              </div>
              <p className="mt-1 text-slate-500">
                {formatHistoryDescription(history)}
              </p>
              <p className="mt-1 text-xs text-slate-400">{history.author?.name || '-'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-brand-600" />
          {t('changeHistory')}
        </h3>
        {orderedHistories.length === 0 && (
          <p className="text-sm text-slate-500">{t('noHistory')}</p>
        )}
        <div className="space-y-3">
          {orderedHistories.map((history) => (
            <div key={history.id} className="flex items-start gap-3 text-sm">
              <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
              <div>
                <p className="text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-primary-900 dark:text-white">{history.author?.name}</span>
                  {' '}{formatHistoryDescription(history)}
                </p>
                {(history.comment || history.solution) && (
                  <p className="mt-1 text-sm text-slate-500">{history.solution || history.comment}</p>
                )}
                <p className="mt-0.5 text-xs text-slate-500">{new Date(history.createdAt).toLocaleString(locale)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
