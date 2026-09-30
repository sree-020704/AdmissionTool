import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Hand, RefreshCw, Eye, ClipboardList } from 'lucide-react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { applicationLifecycleApi } from '@/api/applications.lifecycle.api';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_BADGE_VARIANT,
} from '@/constants/applicationManagement.constants';

export function StaffUnassignedPoolPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await applicationLifecycleApi.listUnassigned();
      setApplications(data.data.applications ?? []);
    } catch (err) {
      toast.error(err.message || 'Failed to load pool');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const claim = async (id) => {
    setClaimingId(id);
    try {
      await applicationLifecycleApi.claim(id);
      toast.success('Request claimed');
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to claim');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <DashboardLayout
      title="Unassigned pool"
      subtitle="Claim requests waiting for a staff owner"
    >
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-label">
          {applications.length} request{applications.length !== 1 ? 's' : ''} available to claim
        </p>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-xl border border-input-border bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-input-bg"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-label">Loading pool...</p>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-input-border bg-row-hover px-6 py-16 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-placeholder" />
          <p className="mt-4 text-sm font-semibold text-heading">Pool is empty</p>
          <p className="mt-1 text-sm text-label">No unassigned requests right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-input-border bg-white/85 px-5 py-4 shadow-[0_2px_12px_rgba(10,102,64,0.05)] transition-all duration-300 hover:border-mint hover:shadow-[0_4px_20px_rgba(10,102,64,0.10)]"
            >
              <div className="min-w-0">
                <p className="font-semibold text-heading">{app.applicantName}</p>
                <p className="mt-0.5 text-sm text-label">{app.applicantEmail}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {app.serviceName} · {app.offeringName}
                </p>
                <Badge
                  variant={APPLICATION_STATUS_BADGE_VARIANT[app.status] ?? app.status}
                  className="mt-2"
                >
                  {APPLICATION_STATUS_LABELS[app.status] ?? app.status}
                </Badge>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={claimingId === app.id}
                  onClick={() => claim(app.id)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] transition hover:opacity-95 disabled:opacity-60"
                >
                  <Hand className="h-4 w-4" />
                  {claimingId === app.id ? 'Claiming...' : 'Claim'}
                </button>
                <Link
                  to={`/staff/applications/${app.id}`}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-input-border bg-white px-4 text-sm font-semibold text-primary transition hover:bg-input-bg"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
