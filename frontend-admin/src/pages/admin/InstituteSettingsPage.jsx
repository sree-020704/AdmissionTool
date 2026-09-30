import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Building2,
  Globe,
  Settings,
  RefreshCw,
  CalendarDays,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { instituteApi } from '@/api/institute.api';
import { settingsApi } from '@/api/settings.api';
import { erpApi } from '@/api/erp.api';
import { useAuthStore } from '@/store/auth.store';
import { useConfirm } from '@/components/ui/confirm-context';

const inputClass =
  'w-full rounded-xl border border-input-border bg-input-bg px-4 py-2.5 text-sm text-heading placeholder-placeholder outline-none transition-all duration-200 hover:border-mint hover:bg-input-hover-bg focus:border-mint focus:bg-white focus:ring-2 focus:ring-mint/20';

const instituteSchema = z.object({
  name: z.string().min(2, 'Institute name is required'),
});

const EMPTY_ERP = {
  enabled: false,
  hasKey: false,
  apiKeyPrefix: null,
  keyGeneratedAt: null,
  lastSyncAt: null,
};

export function InstituteSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [portalSubmitting, setPortalSubmitting] = useState(false);
  const [autoAssignConfig, setAutoAssignConfig] = useState({ enabled: true, strategy: 'least_loaded' });
  const [autoAssignSaving, setAutoAssignSaving] = useState(false);
  const [institute, setInstitute] = useState(null);
  const [operationsCalendar, setOperationsCalendar] = useState({
    defaultOperatingDays: [1, 2, 3, 4, 5],
    exceptions: [],
  });
  const [calendarSaving, setCalendarSaving] = useState(false);
  const [newException, setNewException] = useState({
    date: '',
    type: 'closed',
    reason: '',
    operatingHoursStart: '09:00',
    operatingHoursEnd: '13:00',
  });
  const [erpSync, setErpSync] = useState(EMPTY_ERP);
  const [erpBusy, setErpBusy] = useState(false);
  const [revealedApiKey, setRevealedApiKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(instituteSchema) });

  useEffect(() => {
    async function load() {
      if (!user?.instituteId) return;
      try {
        const [instituteRes, autoAssignRes, calendarRes, erpRes] = await Promise.all([
          instituteApi.get(user.instituteId),
          settingsApi.getAutoAssignment(user.instituteId).catch(() => null),
          settingsApi.getOperationsCalendar(user.instituteId).catch(() => null),
          erpApi.getStatus().catch(() => null),
        ]);
        const inst = instituteRes.data.data.institute;
        setInstitute(inst);
        reset({ name: inst.name });
        if (autoAssignRes?.data?.data?.autoAssignment) {
          setAutoAssignConfig(autoAssignRes.data.data.autoAssignment);
        }
        if (calendarRes?.data?.data?.operationsCalendar) {
          setOperationsCalendar(calendarRes.data.data.operationsCalendar);
        }
        if (erpRes?.data?.data?.erpSync) {
          setErpSync(erpRes.data.data.erpSync);
        }
      } catch (err) {
        toast.error(err.message || 'Failed to load institute settings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.instituteId, reset]);

  const onSaveInstitute = async (values) => {
    setSubmitting(true);
    try {
      const { data } = await instituteApi.update(user.instituteId, values);
      setInstitute(data.data.institute);
      setUser({ ...user, institute: data.data.institute });
      toast.success('Institute settings saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  };

  const onSetPortalHost = async () => {
    setPortalSubmitting(true);
    try {
      const { data } = await instituteApi.setStudentPortalHost(user.instituteId);
      setInstitute(data.data.institute ?? { ...institute, isStudentPortalHost: true });
      toast.success('This institute is now the student portal host');
    } catch (err) {
      toast.error(err.message || 'Failed to update portal host');
    } finally {
      setPortalSubmitting(false);
    }
  };

  const onSaveAutoAssignment = async () => {
    setAutoAssignSaving(true);
    try {
      const { data } = await settingsApi.updateAutoAssignment(user.instituteId, autoAssignConfig);
      setAutoAssignConfig(data.data.autoAssignment);
      toast.success('Auto-assignment rules saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save auto-assignment rules');
    } finally {
      setAutoAssignSaving(false);
    }
  };

  const onSaveOperationsCalendar = async () => {
    setCalendarSaving(true);
    try {
      const { data } = await settingsApi.updateOperationsCalendar(
        user.instituteId,
        operationsCalendar,
      );
      setOperationsCalendar(data.data.operationsCalendar);
      toast.success('Operations calendar saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save operations calendar');
    } finally {
      setCalendarSaving(false);
    }
  };

  const addCalendarException = () => {
    if (!newException.date) {
      toast.error('Choose a date for the exception');
      return;
    }
    setOperationsCalendar((current) => ({
      ...current,
      exceptions: [
        ...(current.exceptions ?? []),
        { ...newException, reason: newException.reason.trim() },
      ].sort((a, b) => a.date.localeCompare(b.date)),
    }));
    setNewException({
      date: '',
      type: 'closed',
      reason: '',
      operatingHoursStart: '09:00',
      operatingHoursEnd: '13:00',
    });
  };

  const onGenerateErpKey = async () => {
    const ok = await confirm({
      title: erpSync.hasKey ? 'Rotate ERP API key?' : 'Generate ERP API key?',
      description: erpSync.hasKey
        ? 'The current key will stop working immediately. Copy the new key now — it is shown only once.'
        : 'A new API key will be created for machine-to-machine ERP sync. Copy it now — it is shown only once.',
      confirmLabel: erpSync.hasKey ? 'Rotate key' : 'Generate key',
    });
    if (!ok) return;

    setErpBusy(true);
    try {
      const { data } = await erpApi.generateApiKey();
      setRevealedApiKey(data.data.apiKey);
      setCopied(false);
      setErpSync({
        enabled: true,
        hasKey: true,
        apiKeyPrefix: data.data.apiKeyPrefix,
        keyGeneratedAt: data.data.keyGeneratedAt,
        lastSyncAt: erpSync.lastSyncAt,
      });
      toast.success('API key generated — copy it now');
    } catch (err) {
      toast.error(err.message || 'Failed to generate ERP API key');
    } finally {
      setErpBusy(false);
    }
  };

  const onRevokeErpKey = async () => {
    const ok = await confirm({
      title: 'Revoke ERP API key?',
      description: 'ERP sync will be disabled and any existing key will stop working immediately.',
      confirmLabel: 'Revoke key',
    });
    if (!ok) return;

    setErpBusy(true);
    try {
      const { data } = await erpApi.revokeApiKey();
      setErpSync(data.data.erpSync ?? EMPTY_ERP);
      setRevealedApiKey(null);
      setCopied(false);
      toast.success('ERP API key revoked');
    } catch (err) {
      toast.error(err.message || 'Failed to revoke ERP API key');
    } finally {
      setErpBusy(false);
    }
  };

  const copyApiKey = async () => {
    if (!revealedApiKey) return;
    try {
      await navigator.clipboard.writeText(revealedApiKey);
      setCopied(true);
      toast.success('API key copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const erpApiBase =
    import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || `${window.location.origin}/api/v1`;
  const erpListUrl = `${erpApiBase}/erp/applications`;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-primary-bright">
            Configuration
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">
            Institute settings
          </h1>
          <p className="mt-1.5 text-sm text-label">
            Manage institute details, student portal host, assignment rules, and ERP sync
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-label">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading settings...
          </div>
        ) : (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-input-border bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)]">
              <div className="flex items-center gap-3 border-b border-divider px-6 py-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-input-bg text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-heading">Institute details</h2>
              </div>
              <form onSubmit={handleSubmit(onSaveInstitute)} className="space-y-4 px-6 py-5">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-label">
                    Institute name
                  </label>
                  <input id="name" className={inputClass} {...register('name')} />
                  {errors.name && <p className="text-xs text-error-text">{errors.name.message}</p>}
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Save changes'}
                </button>
              </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-input-border bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)]">
              <div className="flex items-center gap-3 border-b border-divider px-6 py-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-input-bg text-primary">
                  <Globe className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-heading">Student portal host</h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-label">
                  The portal host institute appears in the public enrollment directory.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Badge variant={institute?.isStudentPortalHost ? 'active' : 'draft'}>
                    {institute?.isStudentPortalHost ? 'Portal host' : 'Not portal host'}
                  </Badge>
                  {!institute?.isStudentPortalHost && (
                    <button
                      type="button"
                      onClick={onSetPortalHost}
                      disabled={portalSubmitting}
                      className="rounded-xl border border-input-border bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-input-bg disabled:opacity-60"
                    >
                      {portalSubmitting ? 'Updating...' : 'Set as portal host'}
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-input-border bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)]">
              <div className="flex items-center gap-3 border-b border-divider px-6 py-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-input-bg text-primary">
                  <Settings className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-heading">Auto-assignment rules</h2>
              </div>
              <div className="space-y-4 px-6 py-5">
                <p className="text-sm text-label">
                  Unassigned requests are automatically assigned when they reach a staff workflow step.
                </p>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={autoAssignConfig.enabled}
                    onChange={(e) => setAutoAssignConfig((c) => ({ ...c, enabled: e.target.checked }))}
                    className="h-4 w-4 rounded border-input-border accent-primary"
                  />
                  <span className="text-sm font-medium text-heading">Enable automatic assignment</span>
                </label>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-label">
                    Assignment strategy
                  </p>
                  <Select
                    value={autoAssignConfig.strategy}
                    onChange={(value) => setAutoAssignConfig((c) => ({ ...c, strategy: value }))}
                    options={[{ value: 'least_loaded', label: 'Least loaded staff member' }]}
                  />
                  <p className="text-xs text-text-muted">
                    Staff are filtered by workflow step role, with fallback to general staff.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onSaveAutoAssignment}
                  disabled={autoAssignSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] disabled:opacity-60"
                >
                  {autoAssignSaving ? 'Saving...' : 'Save assignment rules'}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-input-border bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)]">
              <div className="flex items-center gap-3 border-b border-divider px-6 py-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-input-bg text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-heading">Operations calendar</h2>
                  <p className="text-xs text-label">
                    Controls queue availability and appointment slot generation institute-wide
                  </p>
                </div>
              </div>
              <div className="space-y-4 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-label">
                    Default open days
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { value: 0, label: 'Sun' },
                      { value: 1, label: 'Mon' },
                      { value: 2, label: 'Tue' },
                      { value: 3, label: 'Wed' },
                      { value: 4, label: 'Thu' },
                      { value: 5, label: 'Fri' },
                      { value: 6, label: 'Sat' },
                    ].map((day) => {
                      const selected = (operationsCalendar.defaultOperatingDays ?? []).includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => {
                            setOperationsCalendar((current) => {
                              const days = current.defaultOperatingDays ?? [];
                              const next = selected
                                ? days.filter((value) => value !== day.value)
                                : [...days, day.value].sort((a, b) => a - b);
                              return { ...current, defaultOperatingDays: next };
                            });
                          }}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                            selected
                              ? 'border-primary bg-input-bg text-primary'
                              : 'border-input-border bg-white text-label'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-divider bg-row-hover p-4">
                  <p className="text-sm font-semibold text-heading">Add holiday or exception</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="date"
                      value={newException.date}
                      onChange={(e) => setNewException((c) => ({ ...c, date: e.target.value }))}
                      className={inputClass}
                    />
                    <select
                      value={newException.type}
                      onChange={(e) => setNewException((c) => ({ ...c, type: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="closed">Closed all day</option>
                      <option value="modified_hours">Modified hours</option>
                    </select>
                    <input
                      type="text"
                      value={newException.reason}
                      onChange={(e) => setNewException((c) => ({ ...c, reason: e.target.value }))}
                      placeholder="Reason (e.g. Public holiday)"
                      className={`sm:col-span-2 ${inputClass}`}
                    />
                    {newException.type === 'modified_hours' ? (
                      <>
                        <input
                          type="time"
                          value={newException.operatingHoursStart}
                          onChange={(e) =>
                            setNewException((c) => ({ ...c, operatingHoursStart: e.target.value }))
                          }
                          className={inputClass}
                        />
                        <input
                          type="time"
                          value={newException.operatingHoursEnd}
                          onChange={(e) =>
                            setNewException((c) => ({ ...c, operatingHoursEnd: e.target.value }))
                          }
                          className={inputClass}
                        />
                      </>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={addCalendarException}
                    className="mt-3 text-sm font-semibold text-primary hover:underline"
                  >
                    + Add exception
                  </button>
                </div>

                {(operationsCalendar.exceptions ?? []).length > 0 ? (
                  <ul className="space-y-2">
                    {(operationsCalendar.exceptions ?? []).map((exception) => (
                      <li
                        key={exception.date}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-divider bg-white px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-heading">{exception.date}</p>
                          <p className="text-xs text-label">
                            {exception.type === 'closed'
                              ? 'Closed'
                              : `Modified hours ${exception.operatingHoursStart}–${exception.operatingHoursEnd}`}
                            {exception.reason ? ` · ${exception.reason}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setOperationsCalendar((current) => ({
                              ...current,
                              exceptions: (current.exceptions ?? []).filter(
                                (item) => item.date !== exception.date,
                              ),
                            }))
                          }
                          className="text-xs font-semibold text-error-text"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-label">No calendar exceptions configured yet.</p>
                )}

                <button
                  type="button"
                  onClick={onSaveOperationsCalendar}
                  disabled={calendarSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] disabled:opacity-60"
                >
                  {calendarSaving ? 'Saving...' : 'Save operations calendar'}
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-input-border bg-white/85 shadow-[0_4px_24px_rgba(10,102,64,0.07)]">
              <div className="flex items-center gap-3 border-b border-divider px-6 py-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-input-bg text-primary">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-heading">ERP data sync</h2>
                  <p className="text-xs text-label">
                    Machine-to-machine feed of completed and in-progress service requests
                  </p>
                </div>
              </div>
              <div className="space-y-4 px-6 py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={erpSync.enabled ? 'active' : 'draft'}>
                    {erpSync.enabled ? 'Sync enabled' : 'Sync disabled'}
                  </Badge>
                  {erpSync.apiKeyPrefix ? (
                    <span className="text-xs text-label">
                      Key prefix{' '}
                      <code className="rounded bg-input-bg px-1.5 py-0.5 font-mono text-heading">
                        {erpSync.apiKeyPrefix}…
                      </code>
                    </span>
                  ) : null}
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-label">
                      Key generated
                    </dt>
                    <dd className="mt-1 text-heading">
                      {erpSync.keyGeneratedAt
                        ? new Date(erpSync.keyGeneratedAt).toLocaleString()
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-label">
                      Last sync poll
                    </dt>
                    <dd className="mt-1 text-heading">
                      {erpSync.lastSyncAt
                        ? new Date(erpSync.lastSyncAt).toLocaleString()
                        : 'Never'}
                    </dd>
                  </div>
                </dl>

                {revealedApiKey ? (
                  <div className="rounded-xl border border-amber-light bg-warning-bg p-4">
                    <p className="text-sm font-semibold text-warning-text">
                      Copy this API key now — it will not be shown again
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <code className="block flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-heading">
                        {revealedApiKey}
                      </code>
                      <button
                        type="button"
                        onClick={copyApiKey}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-light bg-white px-4 text-sm font-semibold text-warning-text hover:bg-warning-chip"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-xl border border-divider bg-row-hover p-4 text-sm text-label">
                  <p className="font-semibold text-heading">Sync endpoint</p>
                  <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-heading">
                    GET {erpListUrl}
                  </code>
                  <p className="mt-2 text-xs">
                    Authenticate with header{' '}
                    <code className="rounded bg-white px-1 py-0.5">x-api-key: &lt;key&gt;</code> or{' '}
                    <code className="rounded bg-white px-1 py-0.5">Authorization: Bearer &lt;key&gt;</code>.
                    Use <code className="rounded bg-white px-1 py-0.5">updatedSince</code> and{' '}
                    <code className="rounded bg-white px-1 py-0.5">cursor</code> for incremental sync.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onGenerateErpKey}
                    disabled={erpBusy}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] disabled:opacity-60"
                  >
                    {erpBusy ? 'Working...' : erpSync.hasKey ? 'Rotate API key' : 'Generate API key'}
                  </button>
                  {erpSync.hasKey ? (
                    <button
                      type="button"
                      onClick={onRevokeErpKey}
                      disabled={erpBusy}
                      className="inline-flex items-center gap-2 rounded-xl border border-error-border bg-white px-5 py-2.5 text-sm font-semibold text-error-text hover:bg-error-bg disabled:opacity-60"
                    >
                      Revoke key
                    </button>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
