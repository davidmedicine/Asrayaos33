// src/components/VoiceInputIcons.tsx
import React from 'react';
import { cn } from '@/lib/utils';

// Assuming VoiceInputState is defined elsewhere, potentially derived from useVoiceInput
type VoiceInputState = 'idle' | 'listening' | 'processing' | 'error' | 'unavailable';

interface IconProps {
  className?: string;
}

// Placeholder Mic Icon component
export const MicIcon = React.memo(({ state, className }: { state: VoiceInputState; className?: string }) => {
  const isError = state === 'error';
  const isDisabled = state === 'unavailable'; // Or a general disabled prop

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={state === 'listening' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true" // Icons are decorative, label provided by button
      className={cn(
        'h-5 w-5',
        isDisabled && 'opacity-50', // Style for disabled state if needed
        className
      )}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
      {/* Optional: Add visual indicator for error, like a line through */}
      {isError && <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2.5" className="text-destructive" />}
    </svg>
  );
});
MicIcon.displayName = 'MicIcon';

// Placeholder Processing Icon component
export const ProcessingIcon = React.memo(({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={cn('h-5 w-5 animate-spin', className)}
  >
    {/* Using a simpler spinner */}
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
));
ProcessingIcon.displayName = 'ProcessingIcon';

// Placeholder hook for reduced motion preference
// (Implementation could use window.matchMedia)
export const usePrefersReducedMotion = (): boolean => {
  // Example basic implementation (consider a more robust one for SSR, etc.)
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);
  return prefersReducedMotion;
};