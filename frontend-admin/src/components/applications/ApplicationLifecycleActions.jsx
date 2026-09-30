import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowUpRight, RotateCcw, UserPlus, XCircle } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { useConfirm } from '@/components/ui/confirm-context';
import { applicationLifecycleApi } from '@/api/applications.lifecycle.api';
import { userApi } from '@/api/user.api';

const actionBtn =
  'inline-flex items-center gap-1.5 rounded-xl border border-input-border bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-input-bg disabled:opacity-60';
const actionBtnDanger =
  'inline-flex items-center gap-1.5 rounded-xl border border-error-border bg-white px-4 py-2 text-sm font-semibold text-error-text transition hover:bg-error-bg disabled:opacity-60';
const primaryBtn =
  'inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] disabled:opacity-60';

/**
 * @param {Object} props
 * @param {string} props.applicationId
 * @param {string} props.status
 * @param {'admin' | 'staff'} props.role
 * @param {() => void} props.onUpdated
 */
export function ApplicationLifecycleActions({ applicationId, status, role, onUpdated }) {
  const [note, setNote] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [transferStaffId, setTransferStaffId] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [loading, setLoading] = useState(false);
  const confirm = useConfirm();

  const loadStaff = async () => {
    if (staffList.length) {
      setShowTransfer(true);
      return;
    }
    const { data } = await userApi.listStaff();
    setStaffList(data.data.staff ?? []);
    setShowTransfer(true);
  };

  const runAction = async (label, fn) => {
    const ok = await confirm({
      title: `${label} this request?`,
      description: note ? `Note: ${note}` : undefined,
      confirmLabel: label,
      variant: label === 'Cancel' ? 'danger' : 'default',
    });
    if (!ok) return;

    setLoading(true);
    try {
      await fn();
      toast.success(`Request ${label.toLowerCase()}d`);
      setNote('');
      setShowTransfer(false);
      onUpdated?.();
    } catch (err) {
      toast.error(err.message || `Failed to ${label.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const terminal = ['admitted', 'rejected', 'withdrawn', 'cancelled'].includes(status);
  const canCancel = ['submitted', 'in_review', 'needs_correction'].includes(status);
  const canReopen = ['rejected', 'cancelled', 'withdrawn'].includes(status);

  return (
    <div className="mt-8 space-y-4 rounded-2xl border border-divider bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-bold text-heading">Request actions</h2>
        <p className="mt-1 text-sm text-label">
          Cancel, reopen, escalate, or transfer this request. Notes are saved to the audit log.
        </p>
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for audit log"
        className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-2.5 text-sm text-heading placeholder-placeholder outline-none transition focus:border-mint focus:bg-white focus:ring-2 focus:ring-mint/20"
      />

      <div className="flex flex-wrap gap-2">
        {canCancel && (
          <button
            type="button"
            disabled={loading}
            className={actionBtnDanger}
            onClick={() => runAction('Cancel', () => applicationLifecycleApi.cancel(applicationId, { note }, role))}
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </button>
        )}
        {canReopen && role === 'admin' && (
          <button
            type="button"
            disabled={loading}
            className={actionBtn}
            onClick={() => runAction('Reopen', () => applicationLifecycleApi.reopen(applicationId, { note }))}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reopen
          </button>
        )}
        {!terminal && (
          <button
            type="button"
            disabled={loading}
            className={actionBtn}
            onClick={() =>
              runAction('Escalate', () => applicationLifecycleApi.escalate(applicationId, { note }, role))
            }
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Escalate
          </button>
        )}
        {role === 'admin' && !terminal && (
          <button type="button" className={actionBtn} onClick={loadStaff}>
            <UserPlus className="h-3.5 w-3.5" />
            Transfer
          </button>
        )}
      </div>

      {showTransfer && staffList.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-input-border bg-row-hover p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-label">
              Transfer to staff
            </p>
            <Select
              value={transferStaffId}
              onChange={setTransferStaffId}
              placeholder="Select staff member"
              options={staffList.map((s) => ({ value: s.id, label: `${s.name} (${s.email})` }))}
            />
          </div>
          <button
            type="button"
            disabled={!transferStaffId || loading}
            className={primaryBtn}
            onClick={() =>
              runAction('Transfer', () =>
                applicationLifecycleApi.transfer(applicationId, {
                  staffUserId: transferStaffId,
                  note,
                }),
              )
            }
          >
            Confirm transfer
          </button>
        </div>
      )}
    </div>
  );
}
