// src/components/ui/use-toast.ts
export { useToast, ToastProvider } from './toast-provider';
export type { ToastProps, ToastVariant } from './toast-provider';

// Higher-level imperative toast function (optional convenience)
// This requires the ToastProvider to be mounted and `toastFnRef` to be set.
// This is an advanced pattern for calling context functions from outside React components.

let toastFnRef: ((props: Omit<ToastProps, 'id' | 'onDismiss'>) => string) | null = null;

export const setGlobalToastFn = (fn: (props: Omit<ToastProps, 'id' | 'onDismiss'>) => string) => {
  toastFnRef = fn;
};

/**
 * Imperative way to show a toast from outside React components (e.g., utility functions).
 * Requires <ToastProvider> to be rendered and to have called `setGlobalToastFn`
 * with its internal toast function, typically in an effect within ToastProvider.
 */
export const toast = (props: Omit<ToastProps, 'id' | 'onDismiss' | 'onDismiss'>): string | undefined => {
  if (!toastFnRef) {
    console.warn(
      'ToastProvider is not mounted or setGlobalToastFn has not been called. Toast will not be shown.'
    );
    return undefined;
  }
  return toastFnRef(props);
};

// To make `setGlobalToastFn` work, you'd add this to ToastProvider:
// useEffect(() => {
//   setGlobalToastFn(toastInternalFnFromContext); // Where toastInternalFnFromContext is the `toast` function from useCallback
//   return () => {
//     setGlobalToastFn(null); // Cleanup
//   };
// }, [toastInternalFnFromContext]);
// This imperative `toast` function is OPTIONAL. Sticking to `useToast().toast()` within components is simpler.
// The prompt `use-toast` implies a hook, so `useToast` is primary. The imperative `toast` is extra.