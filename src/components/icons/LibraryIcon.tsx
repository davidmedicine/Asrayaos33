// src/components/icons/LibraryIcon.tsx
import { Book } from 'lucide-react';                      // light-weight SVG  :contentReference[oaicite:1]{index=1}
import { forwardRef, type SVGProps } from 'react';

/** Temporary stub – replace <Book/> when your custom SVG arrives. */
const LibraryIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  (props, ref) => <Book ref={ref} aria-hidden="true" {...props} />
);
LibraryIcon.displayName = 'LibraryIcon';

export default LibraryIcon;
