import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { parsePhoneValue } from '@/utils/phone';
import { getApplicantFieldError } from '@/utils/applicantDetails';

const inputClassName =
  'h-11 w-full rounded-xl border border-input-border bg-input-bg px-4 text-sm text-heading outline-none transition focus:border-mint focus:bg-white';

const invalidInputClassName =
  'border-error-border bg-error-bg focus:border-error-border-strong focus:bg-error-bg';

/**
 * @param {{
 *   fields?: Array<any>;
 *   values: Record<string, string>;
 *   onChange: (fieldKey: string, value: string) => void;
 *   showErrors?: boolean;
 * }} props
 */
export function ApplicantDetailsForm({ fields = [], values, onChange, showErrors = false }) {
  if (!fields.length) return null;

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary-bright">
        Additional details
      </p>
      {fields.map((field) => (
        <ApplicantFieldInput
          key={field.fieldKey}
          field={field}
          value={values[field.fieldKey] ?? ''}
          onChange={(value) => onChange(field.fieldKey, value)}
          showErrors={showErrors}
        />
      ))}
    </div>
  );
}

function FieldMessage({ error, helpText }) {
  if (error) {
    return (
      <p className="mt-1.5 text-xs font-medium text-error-text" role="alert">
        {error}
      </p>
    );
  }

  if (helpText) {
    return <p className="mt-1 text-xs text-text-muted">{helpText}</p>;
  }

  return null;
}

function ApplicantFieldInput({ field, value, onChange, showErrors }) {
  const error = getApplicantFieldError(field, value);
  const visibleError = showErrors ? error : null;
  const invalid = Boolean(visibleError);

  const label = (
    <label htmlFor={field.fieldKey} className="mb-1.5 block text-sm font-medium text-heading">
      {field.label}
      {field.required !== false ? <span className="text-error-text"> *</span> : null}
    </label>
  );

  if (field.fieldType === 'textarea') {
    return (
      <div>
        {label}
        <textarea
          id={field.fieldKey}
          rows={3}
          value={value}
          required={field.required !== false}
          placeholder={field.placeholder || ''}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid || undefined}
          className={`${inputClassName} min-h-[96px] py-3 ${invalid ? invalidInputClassName : ''}`}
        />
        <FieldMessage error={visibleError} helpText={field.helpText} />
      </div>
    );
  }

  if (field.fieldType === 'select') {
    return (
      <div>
        {label}
        <Select
          id={field.fieldKey}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder || 'Choose an option'}
          invalid={invalid}
          options={(field.options ?? []).map((option) => ({
            value: option,
            label: option,
          }))}
        />
        <FieldMessage error={visibleError} helpText={field.helpText} />
      </div>
    );
  }

  if (field.fieldType === 'date') {
    return (
      <div>
        {label}
        <DatePicker
          id={field.fieldKey}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder || 'Select date'}
          invalid={invalid}
        />
        <FieldMessage error={visibleError} helpText={field.helpText} />
      </div>
    );
  }

  if (field.fieldType === 'phone') {
    return (
      <div>
        {label}
        <PhoneInput
          id={field.fieldKey}
          value={parsePhoneValue(value)}
          onChange={onChange}
          required={false}
          placeholder={field.placeholder || 'Mobile number'}
          invalid={invalid}
        />
        <FieldMessage error={visibleError} helpText={field.helpText} />
      </div>
    );
  }

  const inputType =
    field.fieldType === 'number' ? 'number' : field.fieldType === 'email' ? 'email' : 'text';

  return (
    <div>
      {label}
      <input
        id={field.fieldKey}
        type={inputType}
        value={value}
        required={field.required !== false}
        placeholder={field.placeholder || ''}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid || undefined}
        className={`${inputClassName} ${invalid ? invalidInputClassName : ''}`}
      />
      <FieldMessage error={visibleError} helpText={field.helpText} />
    </div>
  );
}
