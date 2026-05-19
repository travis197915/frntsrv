import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.ComponentProps<'input'> {
  leadingIcon?: React.ReactNode;
  readOnly?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leadingIcon, readOnly, ...props }, ref) => {
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      if (type === 'number') e.currentTarget.blur();
    };

    return (
      <div className="relative flex items-center w-full">
        {leadingIcon && (
          <div className="pointer-events-none absolute left-3 z-10 flex items-center text-muted-foreground">
            {leadingIcon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          data-slot="input"
          onWheel={type === 'number' ? handleWheel : undefined}
          disabled={readOnly}
          className={cn(
            'flex w-full rounded-lg border border-input bg-background px-4 py-3 text-foreground transition-colors',
            'placeholder:text-muted-foreground',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
            leadingIcon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
