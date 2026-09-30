import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ClipboardList, FileWarning } from 'lucide-react';
import { StudentLayout } from '@/components/StudentLayout';
import { PageHeader, PageShell } from '@/components/ui/PortalCard';
import { studentApi } from '@/api/student.api';
import { getApplicationStatusLabel } from '@/utils/studentJourney';

const STATUS_TONES = {
  draft: 'border-divider bg-white text-label',
  submitted: 'border-input-border bg-input-bg text-primary',
  in_review: 'border-info-border bg-info-bg text-info-text',
  needs_correction: 'border-warning-border bg-warning-bg text-warning-text',
  admitted: 'border-success-border bg-success-bg text-primary',
  rejected: 'border-error-border bg-error-bg text-error-text',
  withdrawn: 'border-divider bg-row-hover text-text-muted',
  cancelled: 'border-divider bg-row-hover text-text-muted',
};

export function RequestHistoryPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi
      .listApplications()
      .then(({ data }) => setApplications(data.data.applications ?? []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <StudentLayout>
      <PageShell>
        <Link
          to="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <PageHeader
          eyebrow="History"
          title="Request history"
          description="All your service requests, including completed and closed ones."
        />

        {loading ? (
          <p className="text-sm text-label">Loading history...</p>
        ) : applications.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-input-border bg-row-hover px-6 py-12 text-center">
            <FileWarning className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 text-sm font-semibold text-heading">No requests yet</p>
            <p className="mt-2 text-sm text-label">
              Your service requests will appear here once you start one.
            </p>
            <Link
              to="/services"
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Browse services
            </Link>
          </div>
        ) : (
          <section className="mt-6 rounded-2xl border border-divider bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-primary" />
              <p className="text-sm text-label">
                {applications.length} request{applications.length !== 1 ? 's' : ''} total
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {applications.map((app) => {
                const tone = STATUS_TONES[app.status] ?? STATUS_TONES.draft;
                return (
                  <Link
                    key={app.id}
                    to={`/services/${app.serviceId}`}
                    className="block rounded-2xl border border-divider bg-white p-5 shadow-sm transition hover:border-input-border hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">
                          {app.serviceName}
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-heading">{app.offeringName}</h3>
                        <p className="mt-2 text-sm text-label">
                          Updated {new Date(app.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>
                        {getApplicationStatusLabel(app.status)}
                      </span>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      Open request
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </PageShell>
    </StudentLayout>
  );
}
