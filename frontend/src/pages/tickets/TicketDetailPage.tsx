import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Ticket, TicketComment } from '../../types';
import api from '../../services/api';
import { ArrowLeft, MessageSquare, Clock, User, AlertTriangle, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

const statusLabelKeys = { open: 'open', pending_assignment: 'pendingAssignment', assigned: 'assignedStatus', pending: 'pending', in_progress: 'inProgress', on_hold: 'onHold', resolved: 'resolved', closed: 'closed', canceled: 'canceled' } as const;

const priorityLabelKeys = { low: 'low', medium: 'medium', high: 'high', critical: 'critical' } as const;

const statusBadge: Record<string, string> = {
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

const priorityBadge: Record<string, string> = {
  low: 'badge-gray',
  medium: 'badge-blue',
  high: 'badge-yellow',
  critical: 'badge-red',
};

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<Ticket['status']>('in_progress');
  const [diagnosis, setDiagnosis] = useState('');
  const [solution, setSolution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const { t, locale } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      api.get(`/tickets/${id}`)
        .then((res) => setTicket(res.data.data))
        .catch(() => toast.error(t('ticketLoadError')))
        .finally(() => setIsLoading(false));
    }
  }, [id]);

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
            <span className={statusBadge[ticket.status]}>{t(statusLabelKeys[ticket.status])}</span>
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

        <div className="mb-6">
          <h3 className="font-semibold mb-2">{t('description')}</h3>
          <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">{ticket.description}</p>
        </div>
      </div>

      {(user?.role === 'admin' || user?.role === 'technician') && (
        <div className="card p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <ClipboardCheck className="h-5 w-5 text-brand-600" />
                Seguimiento operativo
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Registra el avance técnico y deja trazabilidad del proceso.
              </p>
            </div>
            <span className={statusBadge[ticket.status]}>
              {t(statusLabelKeys[ticket.status])}
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-sm font-semibold text-primary-900 dark:text-white">Estado del ticket</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Actualiza el punto del flujo en el que se encuentra la solicitud.
              </p>

              <label className="mb-1 mt-4 block text-sm font-medium">{t('status')}</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as Ticket['status'])} className="input">
                <option value="assigned">{t('assignedStatus')}</option>
                <option value="in_progress">{t('inProgress')}</option>
                <option value="on_hold">{t('onHold')}</option>
                <option value="resolved">{t('resolved')}</option>
                {user?.role === 'admin' && <option value="closed">{t('closed')}</option>}
                {user?.role === 'admin' && <option value="canceled">{t('canceled')}</option>}
              </select>

              <button type="button" onClick={handleStatusChange} disabled={isActionSubmitting} className="btn-primary mt-4 w-full">
                Actualizar estado
              </button>

              {user?.role === 'admin' && (
                <button type="button" onClick={handleClose} disabled={isActionSubmitting} className="btn-secondary mt-3 w-full">
                  Cerrar ticket
                </button>
              )}
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
                    Marcar resuelto
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
          <AlertTriangle className="h-5 w-5 text-brand-600" />
          {t('changeHistory')}
        </h3>
        {(ticket.histories || []).length === 0 && (
          <p className="text-sm text-slate-500">{t('noHistory')}</p>
        )}
        <div className="space-y-3">
          {(ticket.histories || []).map((history) => (
            <div key={history.id} className="flex items-start gap-3 text-sm">
              <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
              <div>
                <p className="text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-primary-900 dark:text-white">{history.author?.name}</span>
                  {' '}{history.action ? history.action.replace(/_/g, ' ') : t('changed')} <span className="font-medium">{history.field}</span>
                  {history.oldValue && <> {t('from')} <span className="text-slate-400 line-through">{history.oldValue}</span></>}
                  {' '}{t('to')} <span className="font-medium">{history.newValue}</span>
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
