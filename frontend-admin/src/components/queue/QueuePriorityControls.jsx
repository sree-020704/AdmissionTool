import { toast } from 'sonner';
import { queueApi } from '@/api/operations.api';

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

export function QueuePrioritySelect({ ticket, disabled, onUpdated }) {
  if (ticket.status !== 'waiting') return null;

  return (
    <select
      value={ticket.priority ?? 'normal'}
      disabled={disabled}
      onChange={async (e) => {
        try {
          await queueApi.updatePriority(ticket.id, { priority: e.target.value });
          toast.success('Priority updated');
          await onUpdated?.();
        } catch (err) {
          toast.error(err.message || 'Could not update priority');
        }
      }}
      className="h-8 rounded-lg border border-divider px-2 text-xs font-semibold"
    >
      {PRIORITY_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function QueuePriorityBadge({ ticket }) {
  if (!ticket?.priority || ticket.priority === 'normal') return null;
  const tone =
    ticket.priority === 'urgent'
      ? 'bg-error-chip text-error-text'
      : ticket.priority === 'high'
        ? 'bg-warning-chip text-warning-text'
        : 'bg-input-bg text-label';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>
      {ticket.priorityLabel ?? ticket.priority}
    </span>
  );
}
