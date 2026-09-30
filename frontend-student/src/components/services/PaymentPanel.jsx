import { useState } from 'react';
import { CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { paymentsApi } from '@/api/payments.api';
import { loadRazorpayScript } from '@/utils/payment';

function isAtWorkflowFeeStep(application, offering) {
  if (offering?.paymentConfig?.timing !== 'workflow_step') return false;
  const stepId = offering?.paymentConfig?.workflowStepId;
  if (!stepId) return false;
  return application?.workflow?.currentStep?.stepId === stepId;
}

export function PaymentPanel({
  serviceId,
  offeringId,
  offering,
  application,
  onPaid,
  forceShow = false,
}) {
  const [paying, setPaying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const payment = application?.payment;
  const config = offering?.paymentConfig;

  if (!config?.enabled) return null;

  const label = payment?.label || config.label || 'Service fee';
  const amountDisplay =
    payment?.amountDisplay ||
    (config.amount ? `₹${Number(config.amount).toLocaleString('en-IN')}` : '');

  const atWorkflowFeeStep = isAtWorkflowFeeStep(application, offering);
  const paymentDue =
    payment?.required === true || forceShow || atWorkflowFeeStep;

  if (payment?.status === 'paid') {
    return (
      <div className="rounded-xl border border-success-border bg-success-bg-2 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-solid" />
          <div>
            <p className="text-sm font-semibold text-success-text-deepest">{label} paid</p>
            <p className="mt-1 text-xs text-success-solid-deep">
              {amountDisplay} received. You can continue with your request.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentDue && application) {
    return null;
  }

  const paymentsConfigured =
    forceShow || atWorkflowFeeStep
      ? true
      : payment?.configured !== false;
  const canPay = Boolean(application?.id) && paymentsConfigured && payment?.status !== 'paid';

  const showFeePreview = !application && config.timing === 'before_submit';

  const handlePay = async () => {
    if (!application?.id) {
      toast.error('Start your request first');
      return;
    }

    setPaying(true);
    try {
      const { data } = await paymentsApi.createOrder(serviceId, offeringId);
      const order = data.data;
      const Razorpay = await loadRazorpayScript();

      await new Promise((resolve, reject) => {
        const checkout = new Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'EduPortal',
          description: order.label,
          order_id: order.orderId,
          prefill: order.prefill,
          theme: { color: 'var(--color-primary)' },
          handler: async (response) => {
            setPaying(false);
            setProcessing(true);
            try {
              await paymentsApi.verify(serviceId, offeringId, {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              toast.success('Payment successful');
              await onPaid?.();
              resolve();
            } catch (err) {
              toast.error(err.message || 'Payment verification failed');
              reject(err);
            } finally {
              setProcessing(false);
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        });
        checkout.on('payment.failed', (event) => {
          toast.error(event.error?.description || 'Payment failed');
          reject(new Error('Payment failed'));
        });
        checkout.open();
      });
    } catch (err) {
      if (err.message !== 'Payment cancelled') {
        toast.error(err.message || 'Could not start payment');
      }
    } finally {
      setPaying(false);
      setProcessing(false);
    }
  };

  if (showFeePreview) {
    return (
      <div className="rounded-xl border border-info-border bg-info-bg p-4">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-info-text" />
          <div>
            <p className="text-sm font-semibold text-info-text-deepest">{label}</p>
            <p className="mt-1 text-lg font-bold text-info-text-deep">{amountDisplay}</p>
            <p className="mt-2 text-xs text-info-text">
              Start your request first, then pay this fee before submitting.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const helperText =
    config.timing === 'before_submit'
      ? 'Pay this fee before you submit your request for review.'
      : 'Your visit is complete. Pay now to continue your admission.';

  const isBusy = paying || processing;
  const buttonLabel = processing
    ? 'Processing payment...'
    : paying
      ? 'Opening checkout...'
      : `Pay now — ${amountDisplay}`;

  return (
    <div className="rounded-xl border border-info-border bg-info-bg p-4">
      <div className="flex items-start gap-3">
        <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-info-text" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-info-text-deepest">{label}</p>
          <p className="mt-1 text-lg font-bold text-info-text-deep">{amountDisplay}</p>
          <p className="mt-2 text-xs text-info-text">{helperText}</p>
          {!paymentsConfigured ? (
            <p className="mt-2 text-xs text-warning-text">
              Online payments are not configured yet. Contact your institute office.
            </p>
          ) : canPay ? (
            <button
              type="button"
              onClick={handlePay}
              disabled={isBusy}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-info-text text-sm font-semibold text-white hover:bg-info-text-deep disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:min-w-[200px] sm:px-6"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {buttonLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
