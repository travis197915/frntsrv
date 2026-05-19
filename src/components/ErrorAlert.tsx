import { AlertCircle } from 'lucide-react';
import type { FC } from 'react';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type ErrorMessageProps = {
  error: string | undefined;
  refetch?: () => void;
};

function getErrorMessage(error: string | undefined): string {
  if (typeof error === 'string') return error;
  return 'There was an issue processing this request. Please try again later.';
}

export const ErrorAlert: FC<ErrorMessageProps> = ({ error, refetch }) => {
  const userMessage = getErrorMessage(error);

  if (!error) return null;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {userMessage}
        {refetch && (
          <Button size="sm" variant="outline" className="mt-3" onClick={refetch}>
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
