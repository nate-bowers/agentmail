import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  light?: boolean;
}

const sizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
};

export default function Logo({ size = 'md', href = '/', light = false }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold tracking-tight no-underline',
        light ? 'text-white' : 'text-ink',
        sizeMap[size]
      )}
    >
      <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', light ? 'bg-white' : 'bg-brand-purple')} />
      Daily Brief
    </Link>
  );
}
