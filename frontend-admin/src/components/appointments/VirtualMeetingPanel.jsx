import { useEffect, useState } from 'react';
import { Video, Mail, RefreshCw, Copy, X, Users, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { appointmentLifecycleApi } from '@/api/appointments.lifecycle.api';

function MeetingStatusBadge({ meeting }) {
  if (!meeting?.link) {
    return (
      <span className="rounded-full bg-warning-chip px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warning-text">
        Setup needed
      </span>
    );
  }
  if (meeting.linkSentToStudent) {
    return (
      <span className="rounded-full bg-mint-pale px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
        Link sent
      </span>
    );
  }
  return (
    <span className="rounded-full bg-info-bg-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-info-text">
      Link ready
    </span>
  );
}

function VirtualMeetingModal({ appointment, maxAdditionalRecipients, onClose, onUpdated }) {
  const [extraEmails, setExtraEmails] = useState(
    (appointment.meeting?.additionalRecipients ?? []).join(', '),
  );
  const [includeStudent, setIncludeStudent] = useState(true);
  const [loading, setLoading] = useState(false);

  const meeting = appointment.meeting ?? {};
  const hasLink = Boolean(meeting.link);

  useEffect(() => {
    setExtraEmails((appointment.meeting?.additionalRecipients ?? []).join(', '));
  }, [appointment]);

  const parseEmails = () =>
    extraEmails
      .split(/[,;\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);

  const recipientCount = parseEmails().length;

  const run = async (action) => {
    setLoading(true);
    try {
      if (action === 'save') {
        await appointmentLifecycleApi.updateMeeting(appointment.id, {
          additionalRecipients: parseEmails(),
        });
        toast.success('Recipient list saved');
      } else if (action === 'generate') {
        const { data } = await appointmentLifecycleApi.generateMeeting(appointment.id);
        toast.success('Google Meet link created');
        if (data.data.appointment.meeting?.link) {
          toast.message('Review recipients, then send the link');
        }
      } else if (action === 'regenerate') {
        await appointmentLifecycleApi.regenerateMeeting(appointment.id);
        toast.success('New Google Meet link generated');
      } else if (action === 'send') {
        await appointmentLifecycleApi.sendMeetingLink(appointment.id, {
          includeStudent,
          additionalRecipients: parseEmails(),
        });
        toast.success('Meeting link emails queued');
      }
      await onUpdated?.();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!meeting.link) return;
    try {
      await navigator.clipboard.writeText(meeting.link);
      toast.success('Meet link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-heading/40 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-divider bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-divider bg-white px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">
              Virtual meeting
            </p>
            <h3 className="mt-1 text-lg font-bold text-heading">
              {appointment.applicantName || 'Student'}
            </h3>
            <p className="mt-1 text-sm text-label">
              {new Date(appointment.slotStart).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-label transition hover:bg-input-bg hover:text-heading"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-info-border bg-info-bg p-4">
            <p className="text-sm font-semibold text-heading">Google Meet</p>
            <p className="mt-1 text-xs leading-relaxed text-label">
              Only staff can generate and share links. Students cannot invite others.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => run(hasLink ? 'regenerate' : 'generate')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-info-border bg-white px-3 py-2 text-xs font-semibold text-info-text transition hover:bg-blue-faint disabled:opacity-60"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {hasLink ? 'Regenerate link' : 'Generate link'}
              </button>
              {hasLink ? (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={copyLink}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-divider bg-white px-3 py-2 text-xs font-semibold text-heading transition hover:bg-row-hover disabled:opacity-60"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                  <a
                    href={meeting.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-hover"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Meet
                  </a>
                </>
              ) : null}
            </div>
            {hasLink ? (
              <div className="mt-3 rounded-lg border border-info-border bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-info-text">
                  Meeting link
                </p>
                <p className="mt-1 break-all text-xs font-medium text-heading">{meeting.link}</p>
                {meeting.meetingId ? (
                  <p className="mt-2 text-xs text-label">
                    ID: <span className="font-mono font-semibold text-heading">{meeting.meetingId}</span>
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-xs text-label">
                Generate a link using your institute Google Calendar account.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-divider bg-row-hover p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-heading">
                <Users className="h-4 w-4 text-primary" />
                Recipients
              </p>
              <span className="text-xs font-semibold text-label">
                {recipientCount} / {maxAdditionalRecipients} extra
              </span>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm text-heading">
              <input
                type="checkbox"
                checked={includeStudent}
                onChange={(e) => setIncludeStudent(e.target.checked)}
                className="rounded border-input-border"
              />
              Send to student ({appointment.applicantEmail ?? 'applicant'})
            </label>

            <textarea
              value={extraEmails}
              onChange={(e) => setExtraEmails(e.target.value)}
              rows={3}
              placeholder="Additional emails (comma-separated): professor@college.edu, advisor@college.edu"
              className="mt-3 w-full resize-none rounded-xl border border-input-border bg-white px-3 py-2.5 text-sm text-heading placeholder:text-icon-disabled focus:border-mint focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
            <p className="mt-2 text-xs text-label">
              Add up to {maxAdditionalRecipients} additional participants for this service.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
            <p className="text-xs text-label">
              Status: {(meeting.status ?? 'pending').replace(/_/g, ' ')}
              {meeting.linkSentToStudent ? ' · Shared with student' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading || recipientCount > maxAdditionalRecipients}
                onClick={() => run('save')}
                className="rounded-xl border border-input-border bg-white px-4 py-2 text-xs font-semibold text-primary transition hover:bg-input-bg disabled:opacity-60"
              >
                Save recipients
              </button>
              <button
                type="button"
                disabled={
                  loading ||
                  !hasLink ||
                  (!includeStudent && !parseEmails().length) ||
                  recipientCount > maxAdditionalRecipients
                }
                onClick={() => run('send')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
              >
                <Mail className="h-3.5 w-3.5" />
                Send meeting link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VirtualMeetingPanel({ appointment, onUpdated, maxAdditionalRecipients = 50 }) {
  const [open, setOpen] = useState(false);

  if (appointment.visitMode !== 'virtual') return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-info-border bg-info-bg px-3 py-2 text-xs font-semibold text-info-text transition hover:bg-info-bg-2"
      >
        <Video className="h-3.5 w-3.5" />
        Configure meeting
        <MeetingStatusBadge meeting={appointment.meeting} />
      </button>

      {open ? (
        <VirtualMeetingModal
          appointment={appointment}
          maxAdditionalRecipients={maxAdditionalRecipients}
          onClose={() => setOpen(false)}
          onUpdated={async () => {
            await onUpdated?.();
          }}
        />
      ) : null}
    </>
  );
}
