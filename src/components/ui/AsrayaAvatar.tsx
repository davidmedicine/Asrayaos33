'use client';

import React, { forwardRef } from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';
import { durations, easings } from '@/lib/motiontokens';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type AvatarStatus = 'online' | 'offline' | 'away' | 'busy' | 'invisible';
type AvatarVariant = 'circle' | 'square' | 'rounded' | 'ornate';

interface AsrayaAvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  /** The size of the avatar (xs, sm, md, lg, xl, 2xl). Defaults to md. */
  size?: AvatarSize;
  /** The shape/style variant of the avatar. Defaults to circle. */
  variant?: AvatarVariant;
  /** Optional status indicator to display. */
  status?: AvatarStatus;
  /** Whether to show a decorative glow effect (tied to variant). */
  showGlow?: boolean;
  /** Whether to show a pulsing animation on the avatar. */
  isPulsing?: boolean;
  /** Optional border to show around the avatar. */
  showBorder?: boolean;
  /** Optional tooltip text to display on hover. */
  tooltip?: string;
}

interface AsrayaAvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {
  /** Alternative text for the avatar image. */
  alt: string;
}

interface AsrayaAvatarFallbackProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {
  /** Whether to show a decorative pattern in the fallback background. */
  showPattern?: boolean;
  /** Custom color for the fallback. Uses CSS variables if not specified. */
  color?: string;
}

/**
 * Enhanced avatar component for Asraya OS with various decorative styles and states.
 * Supports multiple sizes, variants and interactive states including online/offline status.
 */
const AsrayaAvatar = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AsrayaAvatarProps
>(({
  className,
  size = 'md',
  variant = 'circle',
  status,
  showGlow = false,
  isPulsing = false,
  showBorder = true,
  tooltip,
  ...props
}, ref) => {
  // Size mapping to tailwind classes
  const sizeClasses = {
    xs: 'size-6',
    sm: 'size-8',
    md: 'size-10',
    lg: 'size-12',
    xl: 'size-16',
    '2xl': 'size-20',
  };

  // Variant mapping to shape classes
  const variantClasses = {
    circle: 'rounded-full',
    square: 'rounded-none',
    rounded: 'rounded-lg',
    ornate: 'rounded-xl',
  };

  // Status indicator classes
  const statusClasses = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    invisible: 'bg-transparent border border-gray-400',
  };

  // Calculate status indicator size based on avatar size
  const statusSizeClasses = {
    xs: 'size-1.5',
    sm: 'size-2',
    md: 'size-2.5',
    lg: 'size-3',
    xl: 'size-3.5',
    '2xl': 'size-4',
  };

  // Position status indicator based on avatar size
  const statusPositionClasses = {
    xs: 'right-0 bottom-0',
    sm: 'right-0 bottom-0',
    md: 'right-0.5 bottom-0.5',
    lg: 'right-0.5 bottom-0.5',
    xl: 'right-1 bottom-1',
    '2xl': 'right-1 bottom-1',
  };

  const borderClasses = showBorder
    ? variant === 'ornate'
      ? 'border-2 border-[var(--border-decorative)]'
      : 'border border-[var(--border-default)]'
    : '';

  // Animation classes for pulsing effect
  const pulseAnimation = isPulsing
    ? 'animate-[pulse_2s_var(--ease-inOut)_infinite]'
    : '';

  // Glow effect classes
  const glowClasses = showGlow
    ? 'before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:shadow-[0_0_12px_2px_var(--agent-color-primary)] before:opacity-60'
    : '';

  // Ornate variant specific classes
  const ornateClasses = variant === 'ornate'
    ? 'ring-1 ring-[var(--agent-color-primary)] ring-opacity-30 after:absolute after:inset-[-4px] after:-z-10 after:rounded-[inherit] after:border after:border-[var(--agent-color-primary)] after:border-opacity-20'
    : '';

  // Tooltip attribute
  const tooltipAttributes = tooltip ? {
    'data-tooltip': tooltip,
    'data-tooltip-position': 'top'
  } : {};

  return (
    <div className={cn('relative inline-block', showGlow && 'z-0', pulseAnimation)}>
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          'relative z-0 flex shrink-0 overflow-hidden bg-[var(--bg-surface)]',
          sizeClasses[size],
          variantClasses[variant],
          borderClasses,
          glowClasses,
          ornateClasses,
          pulseAnimation,
          className
        )}
        {...tooltipAttributes}
        {...props}
      />
      {status && (
        <span
          className={cn(
            'absolute inline-block rounded-full',
            statusClasses[status],
            statusSizeClasses[size],
            statusPositionClasses[size],
            'z-10 shadow-sm'
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
});

AsrayaAvatar.displayName = 'AsrayaAvatar';

/**
 * Image component for AsrayaAvatar
 */
const AsrayaAvatarImage = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AsrayaAvatarImageProps
>(({ className, alt, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    alt={alt}
    {...props}
  />
));

AsrayaAvatarImage.displayName = 'AsrayaAvatarImage';

/**
 * Fallback component for AsrayaAvatar when image fails to load
 */
const AsrayaAvatarFallback = forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AsrayaAvatarFallbackProps
>(({ className, children, showPattern = false, color, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center',
      'bg-[var(--bg-subtle)]',
      'text-[var(--text-default)]',
      showPattern && 'bg-gradient-to-br from-[var(--bg-subtle)] to-[var(--bg-surface)]',
      className
    )}
    style={color ? { backgroundColor: color } : undefined}
    {...props}
  >
    {showPattern && (
      <div className="absolute inset-0 opacity-10">
        <div className="h-full w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIj48Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIvPjwvZz48L3N2Zz4=')]" />
      </div>
    )}
    {children}
  </AvatarPrimitive.Fallback>
));

AsrayaAvatarFallback.displayName = 'AsrayaAvatarFallback';

export { AsrayaAvatar, AsrayaAvatarImage, AsrayaAvatarFallback };