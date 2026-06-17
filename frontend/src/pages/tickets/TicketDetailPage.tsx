import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Ticket, TicketComment } from '../../types';
import api from '../../services/api';
import { ArrowLeft, MessageSquare, Clock, User, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Proceso',
  resolved: 'Resuelto',
  closed: 'Cerrado',
};

const priorityLabels: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

const statusBadge: Record<string, string> = {
  pending: 'badge-yellow',
  in_progress: 'badge-blue',
  resolved: 'badge-green',
  closed: 'badge-gray',
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      api.get(`/tickets/${id}`)
        .then((res) => setTicket(res.data.data))
        .catch(() => toast.error('Error loading ticket'))
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
      toast.success('Comment added');
    } catch {
      toast.error('Error adding comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="card p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ticket not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => navigate('/tickets')} className="btn-secondary gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </button>

      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{ticket.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              #{ticket.id} &middot; Created {new Date(ticket.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <span className={statusBadge[ticket.status]}>{statusLabels[ticket.status]}</span>
            <span className={priorityBadge[ticket.priority]}>{priorityLabels[ticket.priority]}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500">Solicitante</p>
            <p className="text-sm font-medium flex items-center gap-1 mt-1">
              <User className="h-3.5 w-3.5" /> {ticket.requester?.name || '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Técnico Asignado</p>
            <p className="text-sm font-medium mt-1">{ticket.technician?.name || 'Sin asignar'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Última Actualización</p>
            <p className="text-sm font-medium flex items-center gap-1 mt-1">
              <Clock className="h-3.5 w-3.5" /> {new Date(ticket.updatedAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Resolución</p>
            <p className="text-sm font-medium mt-1">{ticket.resolutionDate ? new Date(ticket.resolutionDate).toLocaleDateString() : '-'}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-2">Descripción</h3>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{ticket.description}</p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comentarios ({ticket.comments?.length || 0})
        </h3>

        <div className="space-y-4 mb-6">
          {(ticket.comments || []).length === 0 && (
            <p className="text-sm text-gray-500">No hay comentarios aún.</p>
          )}
          {(ticket.comments || []).map((comment) => (
            <div key={comment.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">{comment.author?.name || 'Usuario'}</p>
                <p className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{comment.comment}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Añadir un comentario..."
            className="input min-h-[80px] flex-1"
          />
          <button
            onClick={handleAddComment}
            disabled={!comment.trim() || isSubmitting}
            className="btn-primary self-end"
          >
            {isSubmitting ? '...' : 'Enviar'}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Historial de Cambios
        </h3>
        {(ticket.histories || []).length === 0 && (
          <p className="text-sm text-gray-500">No hay historial.</p>
        )}
        <div className="space-y-3">
          {(ticket.histories || []).map((history) => (
            <div key={history.id} className="flex items-start gap-3 text-sm">
              <div className="h-2 w-2 mt-2 rounded-full bg-brand-500 flex-shrink-0" />
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-900 dark:text-white">{history.author?.name}</span>
                  {' '}changed <span className="font-medium">{history.field}</span>
                  {history.oldValue && <> from <span className="line-through text-gray-400">{history.oldValue}</span></>}
                  {' '}to <span className="font-medium">{history.newValue}</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{new Date(history.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
