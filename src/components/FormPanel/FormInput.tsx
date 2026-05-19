import { useContext } from 'react';
import type { Dispatch, FC } from 'react';
import { TextField } from '@/components/TextField';
import { cn } from '@/lib/utils';
import { compareValues } from '@/utils/compare-values';
import FormPanelContext from './form-panel-context';
import type { ActionType, UpdateStateActionType } from './form-panel-reducer';
import type { Validators } from './validators';

type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 'full';

type FormInputProps = {
  fieldName: string;
  defaultValue?: unknown;
  label: string;
  type?: 'text' | 'number' | 'email' | 'password';
  helperText?: string;
  editable?: boolean;
  readOnlyMode?: boolean;
  validators?: Validators;
  placeholder?: string;
  conditionsToShow?: {
    matches: { field: string; condition: '===' | '!=='; value: string }[];
    type?: 'every' | 'some';
  };
  onChange?: (data: Record<string, unknown>) => void;
  className?: string;
  colSpan?: ColSpan | { default?: ColSpan; sm?: ColSpan; md?: ColSpan };
};

const FormInput: FC<FormInputProps> = ({
  fieldName,
  type = 'text',
  label,
  defaultValue: _defaultValue = '',
  placeholder,
  validators: _validators,
  onChange,
  editable = true,
  readOnlyMode = false,
  helperText,
  className,
  colSpan = 'full',
  conditionsToShow,
}) => {
  const { formState, formDispatch } = useContext(FormPanelContext);
  const updateStateDispatch = formDispatch as Dispatch<ActionType & UpdateStateActionType>;

  function hideFormInput() {
    if (!conditionsToShow?.matches?.length) return false;
    if (conditionsToShow.type === 'some') {
      return !conditionsToShow.matches.some((c) =>
        compareValues(formState.data[c.field], c.condition, c.value)
      );
    }
    return !conditionsToShow.matches.every((c) =>
      compareValues(formState.data[c.field], c.condition, c.value)
    );
  }

  const handleChange = (value: unknown) => {
    updateStateDispatch({ type: 'UPDATE_STATE', payload: { fieldName, value } });
    onChange?.({ ...formState.data, [fieldName]: value });
  };

  if (hideFormInput()) return null;

  const getColSpanClass = (span: ColSpan) => {
    switch (span) {
      case 1: return 'col-span-1';
      case 2: return 'col-span-2';
      case 3: return 'col-span-3';
      case 4: return 'col-span-4';
      case 5: return 'col-span-5';
      case 6: return 'col-span-6';
      case 'full': return 'col-span-full';
      default: return 'col-span-full';
    }
  };

  const colSpanClasses =
    typeof colSpan === 'object'
      ? cn(colSpan.default && getColSpanClass(colSpan.default))
      : getColSpanClass(colSpan);

  return (
    <div className={cn(colSpanClasses, className)}>
      <TextField
        id={fieldName}
        type={type}
        label={label}
        placeholder={placeholder}
        value={formState.data[fieldName] as string | number}
        onChange={handleChange}
        error={(formState.errors && formState.errors[fieldName]) as string}
        helperText={helperText}
        readOnly={readOnlyMode || !editable}
      />
    </div>
  );
};

export default FormInput;
