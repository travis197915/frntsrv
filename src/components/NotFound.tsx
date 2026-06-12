import { Link } from 'react-router-dom';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ThemeToggleButton />
      </div>

      <div className="relative flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          to="/workflows"
          className="mt-2 inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          Back to workflows
        </Link>
      </div>
    </div>
  );
}
