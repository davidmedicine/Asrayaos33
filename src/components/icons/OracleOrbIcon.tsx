// ────────────────────────────────────────────────
// File:  src/components/icons/OracleOrbIcon.tsx
// Purpose: Concentric-circle “orb” icon.
// ────────────────────────────────────────────────
import { forwardRef, type SVGProps } from 'react';

const OracleOrbIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg
      ref={ref}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx={12} cy={12} r={9} />
      <circle cx={12} cy={12} r={4} fill="currentColor" stroke="none" />
    </svg>
  ),
);

OracleOrbIcon.displayName = 'OracleOrbIcon';

export default OracleOrbIcon;
