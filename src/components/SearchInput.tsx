import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  wrapperClassName?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  wrapperClassName,
  className,
  autoFocus,
  disabled,
}: SearchInputProps) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className={cn('pl-7', className)}
      />
    </div>
  );
}
