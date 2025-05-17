// src/components/icons/AsrayaGlyphIcon.tsx
import React from 'react';
import { cn } from '@/lib/utils'; // Assuming standard path for cn utility

interface AsrayaGlyphIconProps extends React.SVGProps<SVGSVGElement> {
  // No custom props needed for this basic version
}

/**
 * Asraya OS Brand Glyph Icon.
 * A stylized, abstract representation.
 * This example uses a simple geometric design.
 */
export const AsrayaGlyphIcon: React.FC<AsrayaGlyphIconProps> = ({ className, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5" // Adjusted for a slightly bolder look
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('lucide lucide-command asraya-glyph', className)} // Add a specific class if needed for more complex styling
      aria-hidden="true" // Decorative icon
      focusable="false" // Ensure it's not focusable by default
      {...props}
    >
      {/*
        Design Concept: Abstract 'A' or interconnected pathways/circuits.
        This is a placeholder design. A more unique and branded glyph should be created.
        For example, a stylized 'A' combined with an orb or circuit-like elements.
      */}
      {/* Central element - could be a diamond or a core shape */}
      <path d="M12 2 L18 6 L12 10 L6 6 Z" fill="currentColor" strokeWidth="0.5" opacity="0.7" />
      {/* Outer structure - could represent paths or connections */}
      <path d="M6 6 L2 9 L6 12" />
      <path d="M18 6 L22 9 L18 12" />
      <path d="M6 18 L2 15 L6 12" />
      <path d="M18 18 L22 15 L18 12" />
      {/* Inner connectors */}
      <path d="M12 10 L12 14" />
      <path d="M6 18 L12 14 L18 18" />

      {/* Optional: A subtle outer ring or aura if it fits the brand */}
      {/* <circle cx="12" cy="12" r="11" strokeDasharray="2 2" opacity="0.3" /> */}
    </svg>
  );
};

AsrayaGlyphIcon.displayName = 'AsrayaGlyphIcon';