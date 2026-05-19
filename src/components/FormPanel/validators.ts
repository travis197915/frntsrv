export type Validators = {
  required?: boolean;
  dependsOn?: string;
  equalTo?: { fieldName: string; error: string };
  minLength?: number;
  maxLength?: number;
  isEmail?: boolean;
  isInteger?: boolean;
  isDecimal?: boolean;
};

export default function validate(
  validators: Validators,
  formState: { data: Record<string, unknown> },
  value: unknown
): string | null {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w+)+$/;
  const integerRegex = /^\d+$/;
  const decimalRegex = /^\d+.?\d+$/;

  switch (true) {
    case !!validators.required && (typeof value === 'number' ? false : !value):
      return 'This field is required.';
    case !!validators.required && Array.isArray(value) && value.length === 0:
      return 'This field is required.';
    case !!validators.dependsOn && formState.data[validators.dependsOn] && !value:
      return 'This field is required.';
    case !!validators.equalTo &&
      formState.data[validators.equalTo.fieldName] &&
      value !== formState.data[validators.equalTo.fieldName]:
      return validators.equalTo?.error ?? 'Values do not match.';
    case !!validators.minLength && value && String(value).length < validators.minLength:
      return `Too short. Must be at least ${validators.minLength} characters.`;
    case !!validators.maxLength && value && String(value).length > validators.maxLength:
      return `Too long. Must be at most ${validators.maxLength} characters.`;
    case !!validators.isEmail && value && !emailRegex.test(String(value)):
      return 'Please enter a valid email address.';
    case !!validators.isInteger && value && !integerRegex.test(String(value)):
      return 'Please enter a valid whole number.';
    case !!validators.isDecimal && value && !decimalRegex.test(String(value)):
      return 'Please enter a valid number.';
    default:
      return null;
  }
}
