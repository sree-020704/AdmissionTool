import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { ThemeSettingsContent } from '@/pages/admin/ThemeSettingsPage';

export function StaffThemeSettingsPage() {
  return (
    <DashboardLayout title="Theme & Colors" subtitle="Customize the app's colors">
      <ThemeSettingsContent />
    </DashboardLayout>
  );
}
