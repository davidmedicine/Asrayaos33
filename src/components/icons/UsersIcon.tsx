// ──────────────────────────────────────────────────────────────
// File: src/components/icons/UsersIcon.tsx
// Role: Temporary glyph until bespoke artwork arrives.
//       All props are forwarded so it behaves like any Lucide icon.
// ──────────────────────────────────────────────────────────────
import type { SVGProps } from 'react';
import { Users } from 'lucide-react';   // lightweight, tree-shakable SVG

export default function UsersIcon(
  props: SVGProps<SVGSVGElement>,
): JSX.Element {
  // aria-hidden = purely decorative → ignored by screen-readers
  return <Users aria-hidden="true" {...props} />;
}

UsersIcon.displayName = 'UsersIcon';   // helps React DevTools
