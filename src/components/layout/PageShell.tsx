import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn('mx-auto max-w-5xl px-6', className)}>
      {children}
    </div>
  );
}
