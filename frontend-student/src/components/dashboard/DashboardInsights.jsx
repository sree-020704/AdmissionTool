import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarDays, Ticket, ArrowRight } from 'lucide-react';
import { notificationsApi, queueApi, appointmentsApi } from '@/api/operations.api';
import { getPrimaryAction } from '@/utils/studentJourney';

/**
 * Compact insight strip — matches dashboard stat card styling.
 * @param {{ applications: Array }} props
 */
export function DashboardInsights({ applications }) {
  const [notifications, setNotifications] = useState([]);
  const [queueTicket, setQueueTicket] = useState(null);
  const [appointment, setAppointment] = useState(null);

  const activeApp = applications.find((a) =>
    ['submitted', 'in_review', 'needs_correction'].includes(a.status),
  );

  const nextAction = applications
    .filter((a) => !['admitted', 'rejected', 'withdrawn', 'cancelled'].includes(a.status))
    .map((app) => ({
      ...app,
      action: getPrimaryAction({
        status: app.status,
        documentsComplete: app.documentsComplete,
        uploadedRequiredCount: app.uploadedRequiredCount,
        requiredDocumentCount: app.requiredDocumentCount,
      }),
    }))
    .find((app) => app.action?.type !== undefined);

  useEffect(() => {
    notificationsApi
      .list({ limit: 3 })
      .then(({ data }) => setNotifications(data.data.notifications ?? []))
      .catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    if (!activeApp?.id) return;
    queueApi
      .status(activeApp.id)
      .then(({ data }) => setQueueTicket(data.data.ticket ?? null))
      .catch(() => setQueueTicket(null));
    appointmentsApi
      .current(activeApp.id)
      .then(({ data }) => setAppointment(data.data.appointment ?? null))
      .catch(() => setAppointment(null));
  }, [activeApp?.id]);

  const hasContent = nextAction || queueTicket || appointment || notifications.length > 0;
  if (!hasContent) return null;

  return (
    <section className="mb-8 rounded-2xl border border-divider bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">At a glance</p>
          <h2 className="mt-1 text-base font-bold text-heading">What needs your attention</h2>
        </div>
        <Link
          to="/requests/history"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Full history
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {nextAction ? (
          <Link
            to={`/services/${nextAction.serviceId}`}
            className="rounded-xl border border-input-border bg-input-bg p-4 transition hover:border-mint"
          >
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">Next action</p>
            <p className="mt-2 font-semibold text-heading">{nextAction.offeringName}</p>
            <p className="mt-1 text-sm text-label">{nextAction.action?.label ?? 'Open request'}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        ) : null}

        {queueTicket ? (
          <div className="rounded-xl border border-input-border bg-input-bg p-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">Queue ticket</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-heading">#{queueTicket.ticketNumber}</p>
            <p className="text-sm capitalize text-label">{queueTicket.status}</p>
          </div>
        ) : null}

        {appointment && appointment.status !== 'completed' ? (
          <div className="rounded-xl border border-divider bg-white p-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">
                {appointment.status === 'booked' ? 'Upcoming visit' : 'Visit update'}
              </p>
            </div>
            <p className="mt-2 text-sm font-semibold text-heading">
              {new Date(appointment.slotStart).toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        ) : null}

        {notifications.length > 0 ? (
          <div className="rounded-xl border border-divider bg-white p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">Recent updates</p>
            </div>
            <ul className="mt-2 space-y-1.5">
              {notifications.slice(0, 2).map((n) => (
                <li key={n.id} className="truncate text-sm text-label">
                  {n.title}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
