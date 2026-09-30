import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock3,
  FileWarning,
  Sparkles,
} from 'lucide-react';
import { StudentLayout } from '@/components/StudentLayout';
import { useAuthStore } from '@/store/auth.store';
import { studentApi } from '@/api/student.api';
import { DashboardSkeleton } from '@/components/skeletons';
import { DashboardInsights } from '@/components/dashboard/DashboardInsights';
import { PageHeader, PageShell } from '@/components/ui/PortalCard';
import { getApplicationStatusLabel } from '@/utils/studentJourney';
import { useSocketEvent } from '@/contexts/SocketContext';
import { WS_EVENTS } from '@/lib/socket';

const STATUS_TONES = {
  draft: 'border-divider bg-white text-label',
  submitted: 'border-input-border bg-input-bg text-primary',
  in_review: 'border-info-border bg-info-bg text-info-text',
  needs_correction: 'border-warning-border bg-warning-bg text-warning-text',
  admitted: 'border-success-border bg-success-bg text-primary',
  rejected: 'border-error-border bg-error-bg text-error-text',
};

function RequestCard({ application }) {
  const tone = STATUS_TONES[application.status] ?? STATUS_TONES.draft;
  const statusLabel = getApplicationStatusLabel(application.status);

  return (
    <Link
      to={`/services/${application.serviceId}`}
      className="block rounded-2xl border border-divider bg-white p-5 shadow-sm transition hover:border-input-border hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">
            {application.serviceName}
          </p>
          <h3 className="mt-1 text-lg font-bold text-heading">{application.offeringName}</h3>
          <p className="mt-2 text-sm text-label">
            Last updated {new Date(application.updatedAt).toLocaleString()}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>
          {statusLabel}
        </span>
      </div>

      {application.status === 'needs_correction' && application.correctionNote ? (
        <p className="mt-4 rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-sm text-warning-text">
          {application.correctionNote}
        </p>
      ) : null}

      {application.status === 'draft' && application.requiredDocumentCount > 0 ? (
        <p className="mt-4 text-sm text-label">
          Documents uploaded: {application.uploadedRequiredCount} of{' '}
          {application.requiredDocumentCount}
        </p>
      ) : null}

      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
        Open request
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadApplications = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    studentApi
      .listApplications()
      .then(({ data }) => setApplications(data.data.applications ?? []))
      .catch(() => setApplications([]))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useSocketEvent(WS_EVENTS.APPLICATION_UPDATED, () => {
    loadApplications({ silent: true });
  }, [loadApplications]);

  const activeApplications = applications.filter((item) => item.status !== 'admitted');
  const completedApplications = applications.filter((item) => item.status === 'admitted');

  return (
    <StudentLayout>
      <PageShell>
        <PageHeader
          eyebrow="Dashboard"
          title={`Welcome, ${user?.name}`}
          description={`Track your service requests, documents, and visits in one place.`}
        />

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-input-border bg-input-bg p-5">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">
                  Active requests
                </p>
                <p className="mt-1 text-2xl font-bold text-heading">{activeApplications.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-divider bg-white p-5">
            <div className="flex items-center gap-3">
              <Clock3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">
                  Needs your action
                </p>
                <p className="mt-1 text-2xl font-bold text-heading">
                  {applications.filter((item) => ['draft', 'needs_correction'].includes(item.status)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-divider bg-white p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">
                  Completed
                </p>
                <p className="mt-1 text-2xl font-bold text-heading">{completedApplications.length}</p>
              </div>
            </div>
          </div>
        </div>

        <DashboardInsights applications={applications} />

        <section className="rounded-2xl border border-divider bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-heading">Your requests</h2>
              <p className="mt-1 text-sm text-label">
                Tap any request to upload documents, fix issues, or book a visit.
              </p>
            </div>
            <Link
              to="/services"
              className="inline-flex h-10 items-center rounded-xl border border-input-border bg-input-bg px-4 text-sm font-semibold text-primary"
            >
              Browse services
            </Link>
          </div>

          {applications.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-input-border bg-row-hover px-6 py-10 text-center">
              <FileWarning className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 text-sm font-semibold text-heading">No requests yet</p>
              <p className="mt-2 text-sm text-label">
                Browse institute services and start your first request when you are ready.
              </p>
              <Link
                to="/services"
                className="mt-5 inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Find a service
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {applications.map((application) => (
                <RequestCard key={application.id} application={application} />
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Link
            to="/services"
            className="rounded-2xl border border-divider bg-row-hover p-5 transition hover:border-input-border"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-bold text-heading">Need to book a visit?</p>
                <p className="mt-1 text-sm text-label">
                  Open your service request and use the visit planning section after submission.
                </p>
              </div>
            </div>
          </Link>
          <Link
            to="/guidance"
            className="rounded-2xl border border-divider bg-row-hover p-5 transition hover:border-input-border"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-bold text-heading">Need help understanding steps?</p>
                <p className="mt-1 text-sm text-label">
                  Read simple guidance or use the help chat button at the bottom-right corner.
                </p>
              </div>
            </div>
          </Link>
        </div>
          </>
        )}
      </PageShell>
    </StudentLayout>
  );
}
