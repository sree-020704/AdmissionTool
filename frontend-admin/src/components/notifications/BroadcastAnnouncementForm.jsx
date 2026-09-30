import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Send, Users, User, GraduationCap, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { Select } from '@/components/ui/select';
import { notificationsApi } from '@/api/notifications.api';
import { userApi } from '@/api/user.api';
import {
  ANNOUNCEMENT_TEMPLATES,
  AUDIENCE_LABELS,
  BROADCAST_AUDIENCE_OPTIONS,
  BROADCAST_CATEGORY_OPTIONS,
} from '@/constants/notifications.constants';

const inputClass =
  'w-full rounded-xl border border-input-border bg-input-bg px-4 py-2.5 text-sm text-heading placeholder-placeholder outline-none transition hover:border-mint hover:bg-input-hover-bg focus:border-mint focus:bg-white focus:ring-2 focus:ring-mint/20';

const AUDIENCE_ICONS = {
  all_staff: Users,
  staff: UserCog,
  all_students: GraduationCap,
  student: User,
};

/**
 * @param {{ onSent?: () => void }} props
 */
export function BroadcastAnnouncementForm({ onSent }) {
  const [audience, setAudience] = useState('all_students');
  const [targetUserId, setTargetUserId] = useState('');
  const [category, setCategory] = useState('general');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [staff, setStaff] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    userApi.listStaff().then(({ data }) => setStaff(data.data.staff ?? [])).catch(() => setStaff([]));
    userApi
      .listStudents({ page: 1, limit: 200 })
      .then(({ data }) => setStudents(data.data.students ?? data.data.items ?? []))
      .catch(() => setStudents([]));
  }, []);

  const recipientOptions = useMemo(() => {
    if (audience === 'staff') {
      return staff.map((member) => ({ value: member.id, label: `${member.name} (${member.email})` }));
    }
    if (audience === 'student') {
      return students.map((member) => ({
        value: member.id,
        label: `${member.name} (${member.email})`,
      }));
    }
    return [];
  }, [audience, staff, students]);

  const applyTemplate = (template) => {
    setCategory(template.category);
    setTitle(template.title);
    setBody(template.body);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message are required');
      return;
    }
    if (['staff', 'student'].includes(audience) && !targetUserId) {
      toast.error('Please select a recipient');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await notificationsApi.broadcast({
        audience,
        targetUserId: ['staff', 'student'].includes(audience) ? targetUserId : undefined,
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || undefined,
        category,
      });
      const count = data.data.broadcast?.recipientCount ?? 0;
      toast.success(`Announcement sent to ${count} recipient${count !== 1 ? 's' : ''}`);
      setTitle('');
      setBody('');
      setLink('');
      setTargetUserId('');
      onSent?.();
    } catch (err) {
      toast.error(err.message || 'Failed to send announcement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">Send to</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {BROADCAST_AUDIENCE_OPTIONS.map((option) => {
            const Icon = AUDIENCE_ICONS[option.value];
            const selected = audience === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setAudience(option.value);
                  setTargetUserId('');
                }}
                className={`rounded-xl border p-3 text-left transition ${
                  selected
                    ? 'border-primary bg-input-bg shadow-[0_0_0_1px_var(--color-primary)]'
                    : 'border-divider bg-white hover:border-input-border hover:bg-row-hover'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      selected ? 'bg-primary text-white' : 'bg-input-bg text-primary'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-heading">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-label">{option.description}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {['staff', 'student'].includes(audience) ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-label">
            Select {audience === 'staff' ? 'staff member' : 'student'}
          </p>
          <Select
            value={targetUserId}
            onChange={setTargetUserId}
            placeholder={`Choose a ${audience}`}
            options={recipientOptions}
          />
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-label">Category</p>
        <Select
          value={category}
          onChange={setCategory}
          options={BROADCAST_CATEGORY_OPTIONS.map((item) => ({
            value: item.value,
            label: item.label,
          }))}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-label">
          Quick templates
        </p>
        <div className="flex flex-wrap gap-2">
          {ANNOUNCEMENT_TEMPLATES.map((template) => (
            <button
              key={template.title}
              type="button"
              onClick={() => applyTemplate(template)}
              className="rounded-full border border-input-border bg-white px-3 py-1 text-xs font-semibold text-primary transition hover:bg-input-bg"
            >
              {template.title}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <input
          className={inputClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Announcement title"
          maxLength={160}
        />
        <textarea
          className={`${inputClass} min-h-[120px] resize-y`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write your message — deadlines, holidays, events, maintenance windows..."
          maxLength={2000}
        />
        <input
          className={inputClass}
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder="Optional link (e.g. /services or external URL)"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(10,102,64,0.28)] transition hover:opacity-95 disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {submitting ? 'Sending...' : `Send to ${AUDIENCE_LABELS[audience]}`}
      </button>
    </form>
  );
}
