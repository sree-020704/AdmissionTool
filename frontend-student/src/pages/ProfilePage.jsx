import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Save, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { StudentLayout } from '@/components/StudentLayout';
import { BackLink, softCardClassName, softFooterClassName, softHeroClassName } from '@/components/ui/back-link';
import { ProfileFormSkeleton } from '@/components/skeletons';
import { ProfileAvatarUpload } from '@/components/profile/ProfileAvatarUpload';
import { authApi } from '@/api/student.api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const inputClassName =
  'h-11 w-full rounded-xl border border-input-border bg-input-bg px-4 text-sm text-heading outline-none transition placeholder:text-icon-disabled focus:border-mint focus:bg-white disabled:cursor-not-allowed disabled:border-gray-border-2 disabled:bg-gray-bg disabled:text-text-muted';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  const nameChanged = name.trim() !== (user?.name ?? '').trim();
  const passwordTouched = Boolean(currentPassword || newPassword || confirmPassword);

  const passwordValid = useMemo(() => {
    if (!passwordTouched) return true;
    return (
      currentPassword.length > 0 &&
      newPassword.length >= 8 &&
      newPassword === confirmPassword
    );
  }, [passwordTouched, currentPassword, newPassword, confirmPassword]);

  const canSave = (nameChanged || passwordTouched) && passwordValid && name.trim().length >= 2;

  const handleSendResetLink = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      const { data } = await authApi.forgotPassword({ email: user.email });
      toast.success(data.message || 'Reset link sent to your email');
    } catch (err) {
      toast.error(err.message || 'Could not send reset link');
    } finally {
      setSendingReset(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!canSave) return;

    setSaving(true);
    try {
      const payload = { name: name.trim() };
      if (passwordTouched) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const { data } = await authApi.updateProfile(payload);
      setUser(data.data.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StudentLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <BackLink to="/dashboard" label="Back to dashboard" className="mb-6" />

        {!user ? (
          <ProfileFormSkeleton />
        ) : (
          <>
            <div className={cn(softHeroClassName, 'p-5 sm:p-6 lg:p-8')}>
              <ProfileAvatarUpload user={user} onUserUpdate={setUser} className="mb-5" />
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-bright">
                    Account settings
                  </p>
                  <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-heading sm:text-3xl">
                    Profile
                  </h1>
                  <p className="mt-1 text-sm text-label">
                    Manage your name, photo, and password. Email is managed by your institute.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <InfoPill icon={Mail} label={user?.email ?? '—'} />
                  <InfoPill
                    icon={UserRound}
                    label={user?.enrolledProgramme?.name ?? 'Student account'}
                  />
                </div>
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-6">
              <div className="grid gap-6 xl:grid-cols-2">
                <ProfileSection
                  icon={UserRound}
                  title="Account details"
                  description="Update how your name appears across the student portal."
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Full name" htmlFor="profile-name" className="sm:col-span-2">
                      <input
                        id="profile-name"
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className={inputClassName}
                        required
                      />
                    </Field>

                    <Field label="Email" htmlFor="profile-email" className="sm:col-span-2">
                      <input
                        id="profile-email"
                        type="email"
                        value={user?.email ?? ''}
                        disabled
                        className={inputClassName}
                      />
                      <p className="mt-1.5 text-xs text-text-muted">
                        Email cannot be changed from this page.
                      </p>
                    </Field>

                    <Field label="Programme" htmlFor="profile-programme">
                      <input
                        id="profile-programme"
                        type="text"
                        value={user?.enrolledProgramme?.name ?? 'Student account'}
                        disabled
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Institute" htmlFor="profile-institute">
                      <input
                        id="profile-institute"
                        type="text"
                        value={user?.institute?.name ?? ''}
                        disabled
                        className={inputClassName}
                      />
                    </Field>
                  </div>
                </ProfileSection>

                <ProfileSection
                  icon={Lock}
                  title="Change password"
                  description="Update here if you know your current password, or request an email reset link."
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-divider bg-bg-faint px-4 py-3">
                    <p className="text-xs text-label">
                      Forgot your current password? We will email a secure link valid for 10 minutes.
                    </p>
                    <button
                      type="button"
                      disabled={sendingReset}
                      onClick={handleSendResetLink}
                      className="shrink-0 rounded-full border border-input-border bg-white px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-mint-bg disabled:opacity-60"
                    >
                      {sendingReset ? 'Sending...' : 'Email reset link'}
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="current-password" className="text-sm font-medium text-heading">
                        Current password
                      </label>
                      <Link
                        to="/forgot-password"
                        className="rounded-full px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-mint-bg"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <PasswordField
                      id="current-password"
                      hideLabel
                      value={currentPassword}
                      onChange={setCurrentPassword}
                      show={showCurrentPassword}
                      onToggleShow={() => setShowCurrentPassword((value) => !value)}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <PasswordField
                        id="new-password"
                        label="New password"
                        value={newPassword}
                        onChange={setNewPassword}
                        show={showNewPassword}
                        onToggleShow={() => setShowNewPassword((value) => !value)}
                        placeholder="At least 8 characters"
                      />
                      <PasswordField
                        id="confirm-password"
                        label="Confirm new password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        show={showConfirmPassword}
                        onToggleShow={() => setShowConfirmPassword((value) => !value)}
                      />
                    </div>
                    {passwordTouched && !passwordValid ? (
                      <p className="rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-xs text-warning-text">
                        Enter your current password and choose a matching new password of at least 8
                        characters.
                      </p>
                    ) : null}
                  </div>
                </ProfileSection>
              </div>

              <div
                className={cn(
                  'sticky bottom-0 z-10 -mx-4 px-4 py-4 backdrop-blur-sm sm:static sm:mx-0 sm:px-6',
                  softFooterClassName,
                  'bg-page-bg/95 sm:bg-white',
                )}
              >
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-text-muted sm:max-w-xl">
                    Changes apply immediately after you save. Your institute manages your email address.
                  </p>
                  <button
                    type="submit"
                    disabled={!canSave || saving}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </StudentLayout>
  );
}

function ProfileSection({ icon: Icon, title, description, children }) {
  return (
    <section className={cn('h-full p-5 sm:p-6', softCardClassName)}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint-pale text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-heading">{title}</h2>
          <p className="mt-1 text-sm text-label">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function InfoPill({ icon: Icon, label }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-xl border border-divider bg-white px-3 py-2 text-xs font-medium text-label">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function Field({ label, htmlFor, children, className }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-heading">
        {label}
      </label>
      {children}
    </div>
  );
}

function PasswordField({ id, label, hideLabel = false, value, onChange, show, onToggleShow, placeholder }) {
  const field = (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${inputClassName} pr-11`}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-label transition-colors hover:bg-input-bg"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  if (hideLabel) {
    return field;
  }

  return (
    <Field label={label} htmlFor={id}>
      {field}
    </Field>
  );
}
