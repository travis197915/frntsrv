import type { ChangeEvent, FC } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface TextFieldProps {
  id?: string;
  label?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  error?: string;
  helperText?: string;
  readOnly?: boolean;
  className?: string;
  type?: 'text' | 'number' | 'password' | 'email' | 'textarea';
  rows?: number;
}

export const TextField: FC<TextFieldProps> = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  helperText,
  readOnly = false,
  className,
  type = 'text',
  rows = 3,
}) => {
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return;
    const inputValue = e.target.value;
    if (type === 'number') {
      onChange(inputValue ? Number(inputValue) : '');
    } else {
      onChange(inputValue);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!onChange) return;
    onChange(e.target.value);
  };

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)}>
      {label && (
        <label htmlFor={id} className="mb-2 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      {type === 'textarea' ? (
        <Textarea
          id={id}
          placeholder={placeholder}
          value={String(value ?? '')}
          onChange={handleTextareaChange}
          readOnly={readOnly}
          aria-invalid={!!error}
          rows={rows}
          className={cn(error && 'border-destructive')}
        />
      ) : (
        <Input
          id={id}
          type={type === 'number' ? 'number' : type}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={handleInputChange}
          readOnly={readOnly}
          aria-invalid={!!error}
          className={cn(error && 'border-destructive')}
        />
      )}
      {(error || helperText) && (
        <p
          className={cn(
            'text-sm mt-0.5',
            error ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
};
