// src/components/ui/toast-provider.tsx
import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useRef,
    ReactNode,
  } from 'react';
  import { createPortal } from 'react-dom';
  import { gsap } from '@/lib/gsapSetup'; // For animations if desired beyond CSS
  import { cn } from '@/lib/utils'; // Your utility for classnames
  import { XIcon, AlertTriangleIcon, CheckCircleIcon, InfoIcon } from 'lucide-react'; // Example icons
  
  // --- Types ---
  export type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';
  
  export interface ToastProps {
    id: string;
    title?: ReactNode;
    description?: ReactNode;
    variant?: ToastVariant;
    duration?: number; // in ms
    icon?: ReactNode;
    action?: ReactNode; // e.g., a button
    onDismiss?: (id: string) => void;
  }
  
  interface Toast extends ToastProps {
    isVisible: boolean;
  }
  
  interface ToastContextType {
    toast: (props: Omit<ToastProps, 'id' | 'onDismiss'>) => string; // Returns the ID of the created toast
    dismiss: (id: string) => void;
  }
  
  const ToastContext = createContext<ToastContextType | undefined>(undefined);
  
  const DEFAULT_DURATION = 5000; // 5 seconds
  const MAX_TOASTS_VISIBLE = 5; // Max toasts to show at once
  
  // --- ToastProvider Component ---
  interface ToastProviderProps {
    children: ReactNode;
    defaultDuration?: number;
    portalContainer?: HTMLElement | null; // For createPortal, defaults to document.body
  }
  
  export const ToastProvider: React.FC<ToastProviderProps> = ({
    children,
    defaultDuration = DEFAULT_DURATION,
    portalContainer,
  }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const portalTarget = portalContainer !== undefined ? portalContainer : (typeof document !== 'undefined' ? document.body : null);
  
  
    const dismiss = useCallback((id: string) => {
      setToasts((prevToasts) =>
        prevToasts.map((t) => (t.id === id ? { ...t, isVisible: false } : t))
      );
      // Actual removal after animation will be handled by Toaster component or a cleanup effect
    }, []);
  
    const toast = useCallback(
      (props: Omit<ToastProps, 'id' | 'onDismiss'>): string => {
        const id = `toast-${crypto.randomUUID()}`;
        const newToast: Toast = {
          ...props,
          id,
          duration: props.duration ?? defaultDuration,
          isVisible: true,
          onDismiss: dismiss,
        };
  
        setToasts((prevToasts) => {
          const visibleToasts = prevToasts.filter(t => t.isVisible);
          // Add new toast, then slice if exceeding max (removes oldest non-visible or then oldest visible)
          const updatedToasts = [...prevToasts, newToast];
          if (visibleToasts.length >= MAX_TOASTS_VISIBLE) {
              // Simple strategy: remove the oldest one that's already fading or fully hidden
              const oldestHiddenIndex = updatedToasts.findIndex(t => !t.isVisible);
              if (oldestHiddenIndex > -1) {
                  updatedToasts.splice(oldestHiddenIndex, 1);
              } else {
                  // If all are visible, mark the oldest of the current visible ones for dismissal
                  const oldestVisible = updatedToasts.find(t => t.isVisible); // first one is oldest
                  if(oldestVisible) {
                     // This won't remove it immediately, but signals it should fade
                     // Ideally, the Toaster component handles this visual queueing gracefully
                  }
              }
          }
          return updatedToasts;
        });
  
  
        if (newToast.duration && newToast.duration !== Infinity) {
          const timeoutId = setTimeout(() => {
            dismiss(id);
          }, newToast.duration);
          toastTimeoutsRef.current.set(id, timeoutId);
        }
        return id;
      },
      [defaultDuration, dismiss]
    );
  
    // Cleanup timeouts on unmount
    useEffect(() => {
      const timeouts = toastTimeoutsRef.current;
      return () => {
        timeouts.forEach(clearTimeout);
      };
    }, []);
  
    // Cleanup toasts that are no longer visible after animation
    useEffect(() => {
        const timer = setTimeout(() => {
            setToasts(prevToasts => prevToasts.filter(t => t.isVisible || Date.now() - (t as any)._dismissAt < 1000)); // Keep for 1s after dismiss signal for animation
        }, 1000); // Check every second for toasts to fully remove
        return () => clearTimeout(timer);
    }, [toasts]);
  
  
    return (
      <ToastContext.Provider value={{ toast, dismiss }}>
        {children}
        {portalTarget && createPortal(<Toaster toasts={toasts} />, portalTarget)}
      </ToastContext.Provider>
    );
  };
  
  // --- useToast Hook ---
  export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
      throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
  };
  
  // --- Toaster Component (Renders the toasts) ---
  interface ToasterProps {
    toasts: Toast[];
  }
  
  const Toaster: React.FC<ToasterProps> = ({ toasts }) => {
    const visibleToasts = toasts.filter(t => t.isVisible || (t as any)._animationOut); // Show toasts that are visible or animating out
  
    if (!visibleToasts.length) {
      return null;
    }
  
    return (
      <div
        role="status" // Or "alert" for more assertive announcements if appropriate for all toasts
        aria-live="polite" // "polite" is generally good for toasts
        aria-relevant="additions text"
        className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end space-y-3 w-full max-w-md p-4 pointer-events-none"
        // Tailwind classes for positioning and stacking
      >
        {toasts.slice(-MAX_TOASTS_VISIBLE).map((toast) => ( // Only render up to MAX_TOASTS_VISIBLE
          <ToastElement key={toast.id} {...toast} />
        ))}
      </div>
    );
  };
  
  // --- ToastElement Component (Individual Toast UI) ---
  const ToastElement: React.FC<Toast> = ({
    id,
    title,
    description,
    variant = 'default',
    icon,
    action,
    onDismiss,
    isVisible,
  }) => {
    const toastRef = useRef<HTMLDivElement>(null);
    const [isActuallyVisible, setIsActuallyVisible] = useState(false);
  
    useEffect(() => {
      if (isVisible) {
        setIsActuallyVisible(true); // Trigger GSAP intro
        if (toastRef.current) {
          gsap.fromTo(
            toastRef.current,
            { opacity: 0, y: 20, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }
          );
        }
      } else if (isActuallyVisible) { // Was visible, now needs to animate out
        if (toastRef.current) {
          gsap.to(toastRef.current, {
            opacity: 0,
            y: 10,
            scale: 0.98,
            duration: 0.25,
            ease: 'power1.in',
            onComplete: () => {
              setIsActuallyVisible(false); // After animation, truly remove from render consideration in Toaster
              // The parent Toaster's useEffect will eventually remove it from the main toasts array.
              // This `(toastRef.current as any)._animationOut = false;` is conceptual.
            },
          });
          (toastRef.current as any)._animationOut = true; // Mark as animating out
        }
      }
    }, [isVisible, isActuallyVisible]);
  
    if (!isActuallyVisible && !isVisible && !(toastRef.current as any)?._animationOut) { // Don't render if not visible and not animating out
        return null;
    }
  
  
    const getVariantClasses = () => {
      switch (variant) {
        case 'destructive':
          return 'bg-red-600 border-red-700 text-white'; // var(--palette-red-600) etc.
        case 'success':
          return 'bg-green-600 border-green-700 text-white';
        case 'warning':
          return 'bg-amber-500 border-amber-600 text-black';
        case 'info':
          return 'bg-blue-500 border-blue-600 text-white';
        default:
          return 'bg-[var(--bg-overlay)] border-[var(--border-muted)] text-[var(--text-primary)]'; // Use CSS variables
      }
    };
  
    const DefaultIcon = () => {
      switch (variant) {
        case 'destructive': return <AlertTriangleIcon className="h-5 w-5 text-red-100" />;
        case 'success': return <CheckCircleIcon className="h-5 w-5 text-green-100" />;
        case 'warning': return <AlertTriangleIcon className="h-5 w-5 text-amber-900" />;
        case 'info': return <InfoIcon className="h-5 w-5 text-blue-100" />;
        default: return null;
      }
    };
  
    return (
      <div
        ref={toastRef}
        className={cn(
          'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 p-4 border transition-all duration-300 ease-in-out',
          getVariantClasses(),
          // Initial state for GSAP if not using `fromTo` start values
          // isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95'
          'opacity-0' // Start hidden, GSAP will animate in
        )}
        role="log" // Individual toasts are logs within the status/alert region
        aria-live="assertive" // More assertive for individual additions
        aria-atomic="true"
      >
        <div className="flex items-start">
          {icon !== undefined ? (
              <div className="flex-shrink-0">{icon}</div>
          ) : (
              <DefaultIcon />
          )}
          <div className={cn("ml-3 w-0 flex-1 pt-0.5", (icon === undefined && DefaultIcon() === null) ? "ml-0" : "")}>
            {title && <p className="text-sm font-medium">{title}</p>}
            {description && (
              <p className={cn("text-sm", title ? "mt-1" : "")}>{description}</p>
            )}
            {action && <div className="mt-3 flex space-x-3">{action}</div>}
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              type="button"
              className="inline-flex rounded-md bg-transparent text-current opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)]"
              onClick={() => onDismiss?.(id)}
              aria-label="Dismiss notification"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Export a simple toast function for convenience if only `toast` is needed often
  // This is not the hook, but a direct way to call the toast function from the context.
  // This pattern is less common with hooks but can be useful.
  // const showToast = (props: Omit<ToastProps, 'id' | 'onDismiss'>) => {
  //   // This would require access to the context's toast function,
  //   // which isn't available globally without some other mechanism.
  //   // So, `useToast` hook is the primary way.
  // };