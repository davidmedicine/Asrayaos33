// === File: src/components/ui/TokenIndicator.tsx ===
'use client';

import React from 'react';
import { cn } from '@/lib/utils'; // Adjust path if needed
import { useCoreStore } from '@/lib/state/store'; // Adjust path if needed
import { TokenIcon } from '@/components/icons/TokenIcon'; // Adjust path if needed

// Placeholder Tier Logic (Can be moved to a dedicated config/helper file later)
type TokenTier = 'none' | 'bronze' | 'silver' | 'gold'; // Example tiers

function getTokenTier(balance: number): TokenTier {
    // These thresholds are examples, adjust as needed
    if (balance <= 0) return 'none';
    if (balance <= 100) return 'bronze';
    if (balance <= 1000) return 'silver';
    return 'gold';
}

// Helper to get the appropriate CSS color variable based on tier
// NOTE: Requires corresponding variables (--color-silver, --artifact-bronze, --artifact-gold)
// to be defined in globals.css if you want distinct tier colors.
// For now, it uses --color-value-accent for any non-zero balance.
function getTokenDisplayColorVar(tier: TokenTier, balance: number): string {
    if (balance <= 0) {
        return 'var(--text-muted)'; // Muted color for zero balance
    }
    // Simplified: Use value accent color for all non-zero balances
    return 'var(--color-value-accent)';

    // --- Example of Tiered Color Logic (Requires CSS variable setup) ---
    // switch (tier) {
    //     case 'bronze': return 'var(--artifact-bronze)';
    //     case 'silver': return 'var(--color-silver, var(--text-muted))'; // Fallback needed
    //     case 'gold':   return 'var(--artifact-gold)';
    //     default:       return 'var(--text-muted)'; // 'none' tier
    // }
}

/**
 * Displays the user's token balance with an icon.
 * Includes accessibility attributes and a data-tier attribute for potential CSS styling.
 * Tooltips have been explicitly removed based on requirements.
 */
export const TokenIndicator = ({ className }: { className?: string }) => {
  // Fetch balance from store (assuming it's in CoreStore)
  const tokenBalance = useCoreStore(state => state.userTokenBalance ?? 0);

  // Determine tier and corresponding color variable
  const tier = getTokenTier(tokenBalance);
  const displayColorVar = getTokenDisplayColorVar(tier, tokenBalance);

  // Basic title attribute for hover info (since Tooltip component is removed)
  const titleText = `Token Balance: ${tokenBalance}`;

  // Optional pulse animation class for high tiers (e.g., 'gold')
  const pulseClass = tier === 'gold' ? "animate-aura-pulse" : "";

  return (
      // Use a simple div as it's non-interactive now
      <div
        className={cn(
          "token-indicator flex items-center gap-1 text-sm rounded-md px-2 py-1", // Base layout & spacing
          "cursor-default", // Not interactive
          className // Allow merging external classes (like responsive hiding)
        )}
        title={titleText} // Basic browser tooltip
        aria-label={titleText} // Accessible label
        data-tier={tier} // Data attribute for potential CSS styling based on tier
        data-testid="token-indicator"
      >
        {/* Screen reader only text */}
        <span className="sr-only">Tokens: {tokenBalance}</span>

        {/* Visible Icon */}
        <TokenIcon
          className={cn(
            "w-4 h-4", // Icon size
            tokenBalance === 0 && "opacity-60", // Dim if zero
            pulseClass // Apply conditional pulse animation
           )}
           style={{ color: displayColorVar }} // Apply dynamic color
           aria-hidden="true"
        />

        {/* Visible Number */}
        <span
          className={cn("font-medium text-xs")} // Text style for number
          style={{ color: displayColorVar }} // Apply dynamic color
        >
          {tokenBalance}
        </span>
      </div>
  );
};

TokenIndicator.displayName = "TokenIndicator";

// Optional: Export as default if needed
// export default TokenIndicator;