import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { ConfirmContext } from '@/components/ui/confirm-context';

export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);

  const confirm = useMemo(
    () => (nextOptions) =>
      new Promise((resolve) => {
        setOptions({
          title: 'Are you sure?',
          description: 'Please confirm before continuing.',
          confirmLabel: 'Confirm',
          cancelLabel: 'Cancel',
          variant: 'default',
          ...nextOptions,
          resolve,
        });
      }),
    [],
  );

  const close = (value) => {
    options?.resolve(value);
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-heading/35 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-mint-border/80 bg-white/95 p-6 shadow-[0_20px_70px_rgba(5,46,28,0.20)]">
              <div className="flex items-start gap-4">
                <div
                  className={
                    options.variant === 'danger'
                      ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-error'
                      : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-input-bg text-primary'
                  }
                >
                  <AlertTriangle className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold tracking-tight text-heading">
                    {options.title}
                  </h2>
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-label">
                    {options.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-icon-disabled transition-colors hover:bg-input-bg hover:text-primary"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="rounded-xl border border-input-border bg-white px-4 py-2 text-sm font-semibold text-primary transition-all hover:border-mint hover:bg-input-bg"
                >
                  {options.cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={() => close(true)}
                  className={
                    options.variant === 'danger'
                      ? 'rounded-xl border border-error-border-strong bg-red-50 px-4 py-2 text-sm font-semibold text-error transition-all hover:border-error hover:bg-red-100'
                      : 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_18px_rgba(10,102,64,0.25)] transition-all hover:bg-primary-hover'
                  }
                >
                  {options.confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ConfirmContext.Provider>
  );
}
