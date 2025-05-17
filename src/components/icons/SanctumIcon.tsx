// src/components/icons/SanctumIcon.tsx
import * as React from 'react';
import { Shield } from 'lucide-react';

// Forward-ref so <Icon> (or any library) can attach refs if it wants to.
const SanctumIcon = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  (props, ref) => (
    // aria-hidden hides decorative icons from screen-readers
    <Shield ref={ref} aria-hidden="true" {...props} />
  ),
);

SanctumIcon.displayName = 'SanctumIcon';   // helps React-DevTools

export default SanctumIcon;
