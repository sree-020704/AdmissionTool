import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileUp, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { buildAcceptAttribute, validateFileForRequirement } from '@/utils/applicationDocuments';

/**
 * @param {{
 *   intakeDocument: {
 *     label: string;
 *     helpText?: string;
 *     required?: boolean;
 *     allowedTypes?: string[];
 *     maxSizeMb?: number;
 *   };
 *   file: File | null;
 *   onChange: (file: File | null) => void;
 *   error?: string | null;
 * }} props
 */
export function IntakeDocumentInput({ intakeDocument, file, onChange, error }) {
  const inputRef = useRef(null);

  if (!intakeDocument?.label) {
    return null;
  }

  const handleChoose = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    // Clear native value so the same file can be re-selected; keep File in React state.
    event.target.value = '';

    if (!nextFile) {
      return;
    }

    const validationError = validateFileForRequirement(nextFile, {
      name: intakeDocument.label,
      allowedTypes: intakeDocument.allowedTypes,
      maxSizeMb: intakeDocument.maxSizeMb,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    onChange(nextFile);
  };

  // Keep the native file input outside the <form> so browser constraint
  // validation can never block submit (hidden + required = not focusable).
  const fileInput =
    typeof document !== 'undefined'
      ? createPortal(
          <input
            ref={inputRef}
            id="intake-document"
            type="file"
            accept={buildAcceptAttribute(intakeDocument.allowedTypes)}
            onChange={handleFileChange}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
            }}
            tabIndex={-1}
            aria-hidden="true"
          />,
          document.body,
        )
      : null;

  return (
    <div>
      <p className="mb-1.5 block text-sm font-medium text-heading">
        {intakeDocument.label}
        {intakeDocument.required !== false ? <span className="text-error-text"> *</span> : null}
      </p>

      <div
        className={`rounded-xl border p-4 ${
          error ? 'border-error-border bg-error-bg' : 'border-divider bg-row-hover'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <FileUp className="h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm font-semibold text-heading">Upload document</p>
            </div>
            <p className="mt-1 text-xs text-label">
              Accepted: {(intakeDocument.allowedTypes ?? ['pdf']).map((type) => type.toUpperCase()).join(', ')}
              {' · '}
              Max {intakeDocument.maxSizeMb ?? 5} MB
            </p>
            {file ? (
              <p className="mt-2 text-xs font-medium text-primary">Selected: {file.name}</p>
            ) : (
              <p className="mt-2 text-xs text-warning-text">No file selected yet</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleChoose}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-input-border bg-input-bg px-3 text-xs font-semibold text-primary hover:bg-mint-bg-3"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {file ? 'Replace file' : 'Choose file'}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-error-text" role="alert">
          {error}
        </p>
      ) : intakeDocument.helpText ? (
        <p className="mt-1 text-xs text-text-muted">{intakeDocument.helpText}</p>
      ) : null}

      {fileInput}
    </div>
  );
}
