import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { paymentsApi } from '@/api/payments.api';

const PAYMENT_STATUS_BADGE = {
  paid: 'complete',
  created: 'draft',
  failed: 'disabled',
};

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN');
}

export function ApplicationPaymentsPanel({ applicationId }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!applicationId) return;
    setLoading(true);
    paymentsApi
      .list({ applicationId, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' })
      .then(({ data }) => setPayments(data.data.payments ?? []))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [applicationId]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-divider bg-white p-5">
        <p className="text-sm text-label">Loading payments...</p>
      </section>
    );
  }

  if (payments.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-divider bg-white p-5">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-heading">Payments</h3>
      </div>
      <div className="mt-4 space-y-3">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-divider bg-row-hover px-3 py-3"
          >
            <div>
              <p className="font-semibold text-heading">{payment.label}</p>
              <p className="mt-0.5 text-xs text-label">
                {formatDateTime(payment.paidAt ?? payment.createdAt)} · {payment.purposeLabel}
              </p>
              {payment.razorpayPaymentId ? (
                <p className="mt-1 font-mono text-[11px] text-text-muted">{payment.razorpayPaymentId}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={PAYMENT_STATUS_BADGE[payment.status] ?? 'default'}>
                {payment.statusLabel}
              </Badge>
              <span className="font-bold text-heading">{payment.amountDisplay}</span>
            </div>
          </div>
        ))}
      </div>
      <Link
        to={`/admin/payments?applicationId=${applicationId}`}
        className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
      >
        View all payment details
      </Link>
    </section>
  );
}
