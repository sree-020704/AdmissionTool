import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

function getInstituteInitials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'IN';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function InstituteCard({ institute, index }) {
  const initials = getInstituteInitials(institute.name);
  const hasProgrammes = institute.openProgrammeCount > 0;

  return (
    <Link
      to={`/${institute.id}`}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-divider bg-white',
        'shadow-[0_2px_16px_rgba(10,102,64,0.05)] transition duration-200',
        'hover:-translate-y-0.5 hover:border-mint-mid hover:shadow-[0_12px_32px_rgba(10,102,64,0.10)]',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-28 w-36 bg-gradient-to-br from-mint-light/70 via-mint-pale/35 to-transparent"
      />

      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
              hasProgrammes
                ? 'bg-success-bg text-success-text-deep ring-1 ring-mint-light/60'
                : 'bg-gray-bg text-text-muted',
            )}
          >
            {hasProgrammes ? 'Enrollment open' : 'Portal ready'}
          </span>
          {index != null && (
            <span
              aria-hidden
              className="text-5xl font-bold leading-none text-mint-bg-2 select-none"
            >
              {String(index).padStart(2, '0')}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-start gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
              'bg-gradient-to-br from-primary to-primary-bright text-white shadow-sm',
            )}
          >
            {initials}
          </div>
          <h3 className="min-w-0 flex-1 pt-0.5 text-lg font-bold leading-snug tracking-tight text-heading group-hover:text-primary">
            {institute.name}
          </h3>
        </div>

        <div className="mt-5 flex items-center gap-2 text-sm text-label">
          <BookOpen className="h-4 w-4 shrink-0 text-primary-bright" />
          {institute.hasEnrollment ? (
            <span>
              {hasProgrammes
                ? `${institute.openProgrammeCount} programme${institute.openProgrammeCount === 1 ? '' : 's'} accepting applications`
                : 'No programmes open right now'}
            </span>
          ) : (
            <span>Enrollment setup in progress</span>
          )}
        </div>
      </div>

      <div className="relative border-t border-mist-alt-3 bg-bg-faint-5/80 px-5 py-3.5 sm:px-6">
        <span
          className={cn(
            'inline-flex h-10 max-w-[140px] items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition',
            'bg-primary text-white group-hover:bg-primary-hover',
          )}
        >
          Continue
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
