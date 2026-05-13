import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
}

const sizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
};

export default function Logo({ size = 'md', href = '/' }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold tracking-tight text-ink no-underline',
        sizeMap[size]
      )}
    >
      <div className="h-1.5 w-1.5 rounded-full bg-brand-purple shrink-0" />
      Daily Brief
    </Link>
  );
}
