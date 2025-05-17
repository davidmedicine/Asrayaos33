// === File: src/components/ui/Spinner.tsx ===
import React from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  color?: string; // e.g., 'text-blue-500'
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'medium',
  className,
  color = 'text-[var(--color-accent)]', // Default to accent color
}) => {
  const sizeClasses = {
    small: 'w-4 h-4 border-2',
    medium: 'w-6 h-6 border-[3px]',
    large: 'w-10 h-10 border-4',
  };

  return (
    <div
      className={cn(
        'inline-block animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]',
        sizeClasses[size],
        color,
        className
      )}
      role="status" // Accessibility: indicates loading
    >
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
        Loading...
      </span>
    </div>
  );
};