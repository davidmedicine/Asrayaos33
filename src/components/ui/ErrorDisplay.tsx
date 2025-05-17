// === File: src/components/ui/ErrorDisplay.tsx ===
import React from 'react';
import { Button } from './Button'; // Assuming your Button component
import { cn } from '@/lib/utils'; // Assuming your cn utility

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryButtonText?: string;
  className?: string;
  icon?: React.ReactNode; // e.g., an error icon component
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = "An Error Occurred",
  message,
  onRetry,
  retryButtonText = "Try Again",
  className,
  icon,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-4",
        className
      )}
      role="alert" // Important for accessibility
    >
      {icon && <div className="mb-3 text-red-500 text-4xl">{icon}</div>}
      <h3 className="text-lg font-semibold text-[var(--color-error)] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[var(--text-muted)] bg-[var(--bg-error-subtle)] p-2 rounded break-words w-full max-w-md mb-4">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryButtonText}
        </Button>
      )}
    </div>
  );
};