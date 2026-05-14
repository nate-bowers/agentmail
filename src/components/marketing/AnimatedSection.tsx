'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'none';
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
  direction = 'up',
}: AnimatedSectionProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const prefersReducedMotion = useReducedMotion();

  const variants = prefersReducedMotion
    ? {
        hidden: { opacity: 1, y: 0, x: 0 },
        visible: { opacity: 1, y: 0, x: 0 },
      }
    : {
        hidden: {
          opacity: 0,
          y: direction === 'up' ? 24 : 0,
          x: direction === 'left' ? -24 : direction === 'right' ? 24 : 0,
        },
        visible: {
          opacity: 1,
          y: 0,
          x: 0,
          transition: {
            duration: 0.5,
            delay,
            ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number],
          },
        },
      };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}
