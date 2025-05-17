// === File: src/hooks/useDebounce.ts ===
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to clear the timeout if the value or delay changes
    // This prevents updating the debounced value if the hook re-runs before the timeout.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Re-run effect only if value or delay changes

  return debouncedValue;
}