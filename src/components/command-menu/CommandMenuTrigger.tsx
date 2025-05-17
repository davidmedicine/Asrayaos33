// src/components/command-menu/CommandMenuTrigger.tsx
'use client';

import React from 'react';
import { useStore } from '@/lib/state/store'; // Adjust path if needed
import { Button } from '@/components/ui/Button'; // Assuming Button component exists
import { cn } from '@/lib/utils'; // <--- IMPORT cn UTILITY HERE (Adjust path if needed)

interface CommandMenuTriggerProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  showShortcut?: boolean;
  className?: string;
  label?: string;
}

export function CommandMenuTrigger({
  variant = 'outline', // Default variant
  size = 'sm', // Default size
  showShortcut = true,
  className = '', // Allow passing external classes
  label = 'Search or Command...', // Default label
}: CommandMenuTriggerProps) {

  // Use the main store hook and select the action directly from the root state
  const openMenu = useStore(state => state.openMenu as (() => void) | undefined);

  const handleOpenMenu = () => {
    if (typeof openMenu === 'function') {
      openMenu();
    } else {
      console.error("CommandMenu action 'openMenu' is not available on the store.");
    }
  };

  return (
    <Button
      onClick={handleOpenMenu}
      variant={variant}
      size={size}
      // Use the imported 'cn' function here
      className={cn(
        'flex w-full items-center justify-between gap-2 text-text-muted hover:text-text-default transition-colors px-3 py-1.5 text-sm', // Base styles
        className // Merge with passed className
      )}
      aria-label={label}
    >
      <span className="truncate">{label}</span>
      {showShortcut && (
        <kbd className="hidden sm:flex h-5 items-center gap-1 rounded border border-border-muted bg-bg-subtle px-1.5 font-mono text-[10px] font-medium text-text-muted opacity-80">
          <span className="text-xs">⌘</span>K
        </kbd>
      )}
    </Button>
  );
}

// Remove the commented-out helper function definition from here
// // Helper function for class names (if you don't have it globally)
// // import { clsx } from "clsx"
// // import { twMerge } from "tailwind-merge"
// // function cn(...inputs: any[]) {
// //   return twMerge(clsx(inputs))
// // }