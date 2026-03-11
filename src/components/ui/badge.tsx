import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
}

export function Badge({ 
  className, 
  variant = 'default',
  children,
  ...props 
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
        variant === 'default' && 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30',
        variant === 'outline' && 'border border-border-color text-text-secondary',
        variant === 'secondary' && 'bg-border-color text-text-primary',
        variant === 'destructive' && 'bg-red-500/20 text-red-400 border border-red-500/30',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
