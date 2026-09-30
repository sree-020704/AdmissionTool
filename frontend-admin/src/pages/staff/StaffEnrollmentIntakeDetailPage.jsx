import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Mail, Phone, UserCheck, UserRound } from 'lucide-react';
import { BackLink, softCardClassName, softHeroClassName } from '@/components/ui/back-link';
import { IntakeDetailSkeleton } from '@/components/skeletons';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { staffEnrollmentIntakesApi } from '@/api/enrollmentIntakes.api';
import { IntakeDocumentsSection } from '@/components/enrollment/IntakeDocumentsSection';
import { cn } from '@/lib/utils';

export function StaffEnrollmentIntakeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadIntake = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await staffEnrollmentIntakesApi.get(id);
      setIntake(data.data.intake);
    } catch (err) {
      toast.error(err.message || 'Failed to load enrollment intake');
      navigate('/staff/enrollment-intakes');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadIntake();
  }, [loadIntake]);

  const isPending = intake?.status === 'pending_authorization';
  const isRejected = intake?.status === 'rejected';
  const initials = (intake?.applicantName ?? 'NA')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <DashboardLayout
      title="Enrollment intake"
      subtitle={
        isPending
          ? 'Awaiting admin authorization'
          : isRejected
            ? 'Authorization was rejected'
            : 'Applicant authorized'
      }
    >
      <BackLink to="/staff/enrollment-intakes" label="Back to intakes" className="mb-6" />

      {loading ? (
        <IntakeDetailSkeleton />
      ) : intake ? (
        <div className="space-y-6">
          <div className={cn(softHeroClassName, 'p-5 sm:p-6 lg:p-8')}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-bright text-xl font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">
                    Enrollment intake
                  </p>
                  <h1 className="mt-1 truncate text-2xl font-bold text-heading sm:text-3xl">
                    {intake.applicantName}
                  </h1>
                  <p className="mt-1 text-sm text-label">{intake.applicantEmail}</p>
                </div>
              </div>

              <Badge
                variant={isPending ? 'incomplete' : isRejected ? 'disabled' : 'active'}
                className="self-start"
              >
                {isPending ? 'Awaiting authorization' : isRejected ? 'Rejected' : 'Authorized'}
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <section className={cn('p-5 sm:p-6', softCardClassName)}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint-pale text-primary">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-heading">Application summary</h2>
                  <p className="mt-1 text-sm text-label">
                    Programme and submission details for this intake request.
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <DetailItem label="Programme" value={intake.offeringName} />
                <DetailItem
                  label="Submitted"
                  value={new Date(intake.createdAt).toLocaleString()}
                  icon={CalendarDays}
                />
                <DetailItem label="Applicant email" value={intake.applicantEmail} icon={Mail} />
                <DetailItem label="Applicant name" value={intake.applicantName} icon={UserRound} />
                {intake.applicantMobile ? (
                  <DetailItem label="Mobile number" value={intake.applicantMobile} icon={Phone} />
                ) : null}
              </dl>

              <IntakeDocumentsSection intake={intake} api={staffEnrollmentIntakesApi} />

              {isPending ? (
                <div className="mt-5 rounded-xl border border-warning-border bg-warning-bg p-4 text-sm text-warning-text">
                  An admin must authorize this applicant before they can sign in and continue their
                  application.
                </div>
              ) : null}

              {isRejected && intake.correctionNote ? (
                <div className="mt-5 rounded-xl border border-error-border bg-error-bg p-4">
                  <p className="text-sm font-semibold text-error-text-strong">Rejection reason</p>
                  <p className="mt-2 text-sm text-error-text-deep">{intake.correctionNote}</p>
                </div>
              ) : null}
            </section>

            <section className={cn('p-5 sm:p-6', softCardClassName)}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint-pale text-primary">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-heading">Applicant information</h2>
                  <p className="mt-1 text-sm text-label">
                    Personal details submitted with the enrollment request.
                  </p>
                </div>
              </div>

              {intake.applicantDetails?.length > 0 ? (
                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  {intake.applicantDetails.map((item) => (
                    <div
                      key={item.fieldKey}
                      className="rounded-xl border border-divider bg-row-hover px-4 py-3"
                    >
                      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-icon-disabled">
                        {item.label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-heading">
                        {String(item.value ?? '—')}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-5 rounded-xl border border-dashed border-input-border bg-row-hover px-4 py-8 text-center text-sm text-label">
                  No additional applicant details were collected for this programme.
                </p>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function DetailItem({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-divider bg-row-hover px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-icon-disabled">{label}</dt>
      <dd className="mt-1 flex items-start gap-2 text-sm font-medium text-heading">
        {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : null}
        <span className="min-w-0 break-words">{value}</span>
      </dd>
    </div>
  );
}
