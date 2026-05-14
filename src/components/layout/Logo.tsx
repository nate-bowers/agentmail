import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  light?: boolean;
}

const sizeMap = {
  sm: { text: 'text-sm', img: 16 },
  md: { text: 'text-base', img: 20 },
  lg: { text: 'text-xl', img: 24 },
};

export default function Logo({ size = 'md', href = '/', light = false }: LogoProps) {
  const { text, img } = sizeMap[size];
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 font-semibold tracking-tight no-underline',
        light ? 'text-white' : 'text-ink',
        text
      )}
    >
      <Image
        src="/icon.png"
        alt="Daily Brief"
        width={img}
        height={img}
        className="shrink-0"
        priority
      />
      Daily Brief
    </Link>
  );
}
