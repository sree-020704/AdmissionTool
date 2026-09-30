import { GraduationCap } from 'lucide-react';
import { PORTAL_BRAND } from '@/constants/portalBranding';

export function AuthBrandMark({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
        <GraduationCap className="h-4 w-4" />
      </div>
      <span className="text-sm font-bold text-heading">{PORTAL_BRAND.student.name}</span>
    </div>
  );
}
