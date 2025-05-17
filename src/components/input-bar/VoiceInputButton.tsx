// src/components/input-bar/VoiceInputButton.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import gsap from 'gsap';

import { Button } from '@/components/ui/Button';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { cn } from '@/lib/utils';
import { durations, easings } from '@/lib/motiontokens';

import {
  MicIcon,
  ProcessingIcon,
  usePrefersReducedMotion,
} from './VoiceInputIcons';

/* ───────────────────────────────────────────────────────────── */
/* Types                                                         */
/* ───────────────────────────────────────────────────────────── */
type VoiceInputState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'error'
  | 'unavailable';

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  disabled?: boolean;
  className?: string;
  onErrorNotify?: (message: string) => void;
}

/* ───────────────────────────────────────────────────────────── */
/* Component                                                     */
/* ───────────────────────────────────────────────────────────── */
export const VoiceInputButton: React.FC<VoiceInputButtonProps> = React.memo(
  ({ onResult, disabled = false, className, onErrorNotify }) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const prefersReducedMotion = usePrefersReducedMotion();
    const [ariaLiveMessage, setAriaLiveMessage] = useState('');

    /* voice‑input hook ---------------------------------------------------- */
    const {
      isAvailable,
      state,
      startListening,
      stopListening,
      error,
    } = useVoiceInput({
      onSpeech: ({ text, isFinal }) => {
        if (isFinal && text) {
          onResult(text);

          if (buttonRef.current && !prefersReducedMotion) {
            gsap.fromTo(
              buttonRef.current,
              { scale: 0.9 },
              { scale: 1, duration: durations.fastest, ease: easings.elastic }
            );
          }
        }
      },
      onStateChange: (newState: VoiceInputState) => {
        const msg =
          newState === 'processing'
            ? 'Processing speech…'
            : newState === 'listening'
            ? 'Recording started.'
            : newState === 'idle'
            ? 'Recording stopped.'
            : newState === 'error'
            ? `Error: ${error?.message || 'Voice input error.'}`
            : '';
        setAriaLiveMessage(msg);
      },
      onError: (err) => {
        const msg = `Voice input error: ${err.message || 'Unknown error'}`;
        setAriaLiveMessage(`Error: ${msg}`);
        onErrorNotify?.(msg);
      },
    });

    /* derived state ------------------------------------------------------- */
    const isButtonDisabled = useMemo(
      () => disabled || !isAvailable || state === 'processing',
      [disabled, isAvailable, state]
    );

    /* click handler ------------------------------------------------------- */
    const handleClick = useCallback(() => {
      if (isButtonDisabled && state !== 'error') return;

      if (state === 'listening' || state === 'processing') {
        stopListening();
      } else {
        startListening();
      }
    }, [isButtonDisabled, state, startListening, stopListening]);

    /* small scale pulse while listening ---------------------------------- */
    useEffect(() => {
      if (!buttonRef.current || prefersReducedMotion) return;

      gsap.killTweensOf(buttonRef.current, 'scale');

      gsap.to(buttonRef.current, {
        scale: state === 'listening' ? 1.1 : 1,
        duration: durations.fast,
        ease: easings.out,
      });
    }, [state, prefersReducedMotion]);

    /* tooltip / aria‑label helper ---------------------------------------- */
    const getTooltip = () => {
      if (!isAvailable) return 'Voice input not supported in this browser';
      if (state === 'error')
        return `Error: ${error?.message || 'Voice input error'}. Click to retry.`;
      if (state === 'listening') return 'Stop recording';
      if (state === 'processing') return 'Processing speech…';
      return 'Start voice input';
    };

    /* render -------------------------------------------------------------- */
    if (!isAvailable) {
      return (
        <Button
          ref={buttonRef}
          type="button"
          variant="ghost"
          size="icon"
          disabled
          title="Voice input not supported"
          aria-label="Voice input not supported in this browser"
          className={cn(
            'rounded-full w-10 h-10 opacity-50 cursor-not-allowed',
            className
          )}
        >
          <MicIcon state="unavailable" />
        </Button>
      );
    }

    return (
      <>
        <Button
          ref={buttonRef}
          type="button"
          variant={state === 'listening' ? 'default' : 'ghost'}
          size="icon"
          onClick={handleClick}
          disabled={isButtonDisabled}
          aria-busy={state === 'processing'}
          title={getTooltip()}
          aria-label={getTooltip()}
          className={cn(
            'rounded-full w-10 h-10 relative transition-colors duration-200 ease-out',
            {
              'bg-primary text-primary-foreground hover:bg-primary/90':
                state === 'listening',
              'text-destructive dark:text-destructive-foreground':
                state === 'error',
              'opacity-50 cursor-not-allowed':
                isButtonDisabled && state !== 'error',
              'hover:bg-accent hover:text-accent-foreground':
                state !== 'listening',
            },
            className
          )}
        >
          {state === 'processing' ? (
            <ProcessingIcon />
          ) : (
            <MicIcon state={state} />
          )}
        </Button>

        {/* Screen‑reader live region */}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {ariaLiveMessage}
        </span>
      </>
    );
  }
);

VoiceInputButton.displayName = 'VoiceInputButton';
