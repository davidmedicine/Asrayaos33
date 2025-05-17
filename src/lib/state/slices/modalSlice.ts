// File path: src/lib/state/slices/modalSlice.ts

/**
 * modalSlice.ts
 * Manages application modal states with support for stacking, async operations,
 * animations, type safety, intents, variants, persistence, runtime registration,
 * and robust configuration. Designed for world-class UX and DX.
 * Requires a companion <ModalHost /> component to handle rendering and interactions.
 * (Version: 2.1 - Adding registry enhancements, timing hints)
 */

import { StateCreator } from 'zustand';
import { nanoid } from 'nanoid'; // Use nanoid for robust unique IDs
// Assuming RootState includes this slice, adjust if using namespacing like { modal: ModalSlice }
// import { RootState } from '../store';

// --- Configuration ---
const SLICE_NAME = 'modal'; // Used for devtools action naming
const SLICE_VERSION = 2; // For state persistence migration (Update if persisted state shape changes)

// --- Type Definitions ---

/** Semantic intent for styling and ARIA roles */
export type ModalIntent = 'info' | 'success' | 'warning' | 'error' | 'danger';

/** Predefined structural variants for modals */
export type ModalVariant = 'default' | 'confirm' | 'form' | 'panel' | 'fullscreen' | string;

/** Animation presets for modal transitions */
export type ModalAnimation = 'fade' | 'zoom' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'none' | string;

/** Data structure for a modal instance, enhanced with advanced options */
export interface ModalData<TData = Record<string, any>, TResult = any> {
  // --- Core ---
  id: string;
  title: string;
  content: React.ReactNode | ((modalProps: ModalData<TData, TResult>) => React.ReactNode);

  // --- Configuration & Behavior ---
  variant?: ModalVariant;
  intent?: ModalIntent;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'center' | 'top' | 'bottom' | 'right' | 'left';
  animation?: ModalAnimation;
  /** Optional hint (ms) for ModalHost animation duration, useful for sync. */
  exitDurationMs?: number;
  persistent?: boolean;
  hideClose?: boolean;
  closeOnClickOutside?: boolean;
  disableEscape?: boolean;
  allowDuplicate?: boolean;

  // --- Interaction & Accessibility ---
  lockScroll?: boolean;
  trapFocus?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  ariaLabel?: string;
  ariaDescribedBy?: string;

  // --- Data & State ---
  data?: TData;
  isLoading?: boolean;
  isSubmitting?: boolean;
  error?: string | null;

  // --- Callbacks & Lifecycle ---
  onClose?: () => void;
  onConfirm?: () => TResult | Promise<TResult>;
  onEnter?: () => void; // After entry animation
  onExitStart?: () => void; // Before exit animation
  onExitComplete?: () => void; // After exit animation

  // --- Button Labels ---
  confirmLabel?: string;
  cancelLabel?: string;

  // --- Internal ---
  /** @internal */
  _promise?: {
    resolve: (value: TResult | PromiseLike<TResult>) => void;
    reject: (reason?: any) => void;
  };
}

/** Internal map to store promise resolvers */
type PromiseResolverMap<TResult = any> = Record<string, {
  resolve: (value: TResult | PromiseLike<TResult>) => void;
  reject: (reason?: any) => void;
}>;

/** Type for entries in the modal registry: static config or a function generating config */
export type ModalRegistryEntry<TData = any, TResult = any> =
  | Omit<ModalData<TData, TResult>, 'id' | '_promise'>
  | ((data?: TData) => Omit<ModalData<TData, TResult>, 'id' | '_promise'>);

/** Type for the modal registry object */
export type ModalRegistry = Record<string, ModalRegistryEntry<any, any>>;

// --- State Interface ---
export interface ModalState {
  activeModal: ModalData<any, any> | null;
  modalStack: ModalData<any, any>[];
  isModalOpen: boolean;
  closingModalId: string | null;
  promiseResolvers: PromiseResolverMap;
  /** Holds predefined and runtime-registered modal configurations. */
  modalRegistry: ModalRegistry;
  sliceVersion: number;
  // Future: modalQueue?: ModalData<any, any>[];
}

// --- Actions Interface ---
export interface ModalActions {
  openModal: <TData = any, TResult = any>(
    modalConfig: Omit<ModalData<TData, TResult>, 'id' | '_promise'>
  ) => Promise<TResult>;

  openModalByKey: <TData = any, TResult = any>(
    key: string, // Key in modalRegistry (e.g., 'auth:login', 'confirm:delete')
    modalOverrides?: Partial<Omit<ModalData<TData, TResult>, 'id' | '_promise'>>
  ) => Promise<TResult>;

  /** Allows adding or overwriting modal configurations in the registry at runtime. */
  registerModal: <TData = any, TResult = any>(
    key: string,
    config: ModalRegistryEntry<TData, TResult>
  ) => void;

  closeModal: (id?: string) => void;
  closeAllModals: () => void;
  updateModal: <TData = any>(id: string, updates: Partial<ModalData<TData>>) => void;

  // Internal actions for ModalHost coordination
  /** @internal */
  _finalizeClose: (id: string, reason?: 'closed' | 'cancelled' | 'confirmed' | 'error') => void;
  /** @internal */
  _resolveModal: <TResult = any>(id: string, result: TResult) => void;
  /** @internal */
  _rejectModal: (id: string, reason?: any) => void;
}

// --- Combined Slice Interface ---
export type ModalSlice = ModalState & ModalActions;

// --- Initial State ---

// Define predefined modals here (or import from a separate configuration file)
// Use key prefixes like 'feature:action' for better organization is recommended.
const predefinedModalRegistry: ModalRegistry = {
  'confirm:delete-user': {
    title: 'Confirm Deletion',
    content: 'Are you sure you want to delete this user? This action cannot be undone.',
    intent: 'danger',
    variant: 'confirm',
    confirmLabel: 'Delete User',
    cancelLabel: 'Cancel',
    size: 'sm',
    animation: 'zoom',
  },
  'error:generic': (data?: { message?: string }) => ({
    title: 'Error Occurred',
    content: data?.message || 'An unexpected error occurred. Please try again later.',
    intent: 'error',
    variant: 'default',
    size: 'sm',
    animation: 'fade',
  }),
  // Add more...
};

export const initialModalState: ModalState = {
  activeModal: null,
  modalStack: [],
  isModalOpen: false,
  closingModalId: null,
  promiseResolvers: {},
  modalRegistry: predefinedModalRegistry, // Initialize with predefined modals
  sliceVersion: SLICE_VERSION,
};

// --- Slice Creator Function ---
export const createModalSlice: StateCreator<
  ModalSlice, // Replace with RootState if needed
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  ModalSlice
> = (set, get) => ({
  ...initialModalState,

  // --- Actions ---

  openModal: <TData = any, TResult = any>(
    modalConfig: Omit<ModalData<TData, TResult>, 'id' | '_promise'>
  ) => {
    // --- Duplicate Check ---
    const allowDuplicate = modalConfig.allowDuplicate ?? false;
    if (!allowDuplicate && modalConfig.title) {
        const duplicateExists = get().modalStack.some(m => !get().closingModalId && m.title === modalConfig.title);
        if (duplicateExists) {
            const errorMsg = `Duplicate modal blocked: "${modalConfig.title}"`;
            console.warn(`[ModalSlice] ${errorMsg}`);
            return Promise.reject(new Error(errorMsg)); // Return rejected promise immediately
        }
    }

    // --- ID & Promise Setup ---
    const id = `modal-${nanoid(8)}`;
    let capturedResolve: (value: TResult | PromiseLike<TResult>) => void = () => {};
    let capturedReject: (reason?: any) => void = () => {};
    const promise = new Promise<TResult>((resolve, reject) => {
        capturedResolve = resolve;
        capturedReject = reject;
    });

    // --- State Update ---
    set((state) => {
      const newModal: ModalData<TData, TResult> = {
        // Sensible Defaults applied first
        size: 'md', position: 'center', closeOnClickOutside: true,
        disableEscape: false, lockScroll: true, trapFocus: true,
        isLoading: false, isSubmitting: false, error: null, intent: 'info',
        variant: 'default', animation: 'fade', persistent: false,
        ...modalConfig, // User config overrides defaults
        id,
      };

      const updatedResolvers = {
          ...state.promiseResolvers,
          [id]: { resolve: capturedResolve, reject: capturedReject }
      };
      const updatedStack = [...state.modalStack, newModal];
      // TODO: Implement advanced stack behavior ('replace', 'priority') here if needed

      // Call onEnter lifecycle hook *after* state update (via timeout)
      if (newModal.onEnter) {
          setTimeout(newModal.onEnter, 0);
      }

      return {
        modalStack: updatedStack,
        activeModal: newModal,
        isModalOpen: true,
        promiseResolvers: updatedResolvers,
        closingModalId: state.closingModalId === newModal.id ? null : state.closingModalId,
      };
    }, false, `${SLICE_NAME}/openModal - ${modalConfig.title || id}`);

    return promise;
  },

  openModalByKey: <TData = any, TResult = any>(
    key: string,
    modalOverrides: Partial<Omit<ModalData<TData, TResult>, 'id' | '_promise'>> = {}
  ) => {
    const registryEntry = get().modalRegistry[key];
    if (!registryEntry) {
        const errorMsg = `Modal key "${key}" not found in registry.`;
        console.error(`[ModalSlice] ${errorMsg}`);
        return Promise.reject(new Error(errorMsg));
    }

    let baseConfig: Omit<ModalData<TData, TResult>, 'id' | '_promise'>;
    if (typeof registryEntry === 'function') {
        // Pass override data to the function if it exists
        baseConfig = registryEntry(modalOverrides?.data as TData);
    } else {
        baseConfig = registryEntry;
    }

    // Merge registry config with specific overrides
    const modalConfig = {
        ...baseConfig,
        ...modalOverrides,
        // Ensure data merging strategy is intentional (here, override data replaces registry data)
        data: modalOverrides.data ?? (typeof registryEntry !== 'function' ? registryEntry.data : undefined),
    };

    // Use non-action name for devtools if desired
    // set({}, false, `${SLICE_NAME}/openModalByKeyTriggered - ${key}`);
    return get().openModal<TData, TResult>(modalConfig);
  },

  registerModal: <TData = any, TResult = any>(
    key: string,
    config: ModalRegistryEntry<TData, TResult>
  ) => {
      set((state) => {
         if (process.env.NODE_ENV === 'development' && state.modalRegistry[key]) {
             console.warn(`[ModalSlice] Overwriting modal registry entry for key: ${key}`);
         }
         return {
             modalRegistry: {
                 ...state.modalRegistry,
                 [key]: config,
             }
         };
      }, false, `${SLICE_NAME}/registerModal - ${key}`);
  },


  closeModal: (id?: string) => {
    const state = get();
    const targetId = id || state.activeModal?.id;

    if (!targetId || state.closingModalId === targetId) return;

    const modalToClose = state.modalStack.find(m => m.id === targetId);
    if (!modalToClose) return;

    // NOTE: ModalHost should check `modalToClose.persistent` BEFORE calling this action
    // based on user interaction (backdrop click, escape key). Direct calls bypass this.

    set({ closingModalId: targetId }, false, `${SLICE_NAME}/closeModalStart - ${targetId}`);
    modalToClose.onExitStart?.();
  },

  _finalizeClose: (id: string, reason: 'closed' | 'cancelled' | 'confirmed' | 'error' = 'closed') => {
    const state = get(); // Get fresh state before set
    const resolver = state.promiseResolvers[id];
    const originalModal = state.modalStack.find(m => m.id === id);

    // Robustness: Check if resolver exists before rejecting. Prevents double calls.
    if (reason !== 'confirmed' && resolver) {
       resolver.reject(reason); // Reject with reason
    }

    set((currentState) => {
        // Ensure we are finalizing the correct modal
        if (currentState.closingModalId !== id && !currentState.modalStack.some(m => m.id === id)) {
           console.warn(`[ModalSlice] _finalizeClose called for modal ${id} which is not closing or already removed.`);
           return currentState;
        }

        const updatedStack = currentState.modalStack.filter(modal => modal.id !== id);
        const newActiveModal = updatedStack.length > 0 ? updatedStack[updatedStack.length - 1] : null;
        const updatedResolvers = { ...currentState.promiseResolvers };
        // Clean up resolver only if it existed (already handled by reject/resolve)
        delete updatedResolvers[id];

        // Call lifecycle hooks *after* state update calculation
        setTimeout(() => {
            originalModal?.onClose?.(); // Maybe only if reason is 'closed'/'cancelled'?
            originalModal?.onExitComplete?.();
        }, 0);

        return {
            modalStack: updatedStack,
            activeModal: newActiveModal,
            isModalOpen: updatedStack.length > 0, // Only false if stack is now empty
            closingModalId: currentState.closingModalId === id ? null : currentState.closingModalId,
            promiseResolvers: updatedResolvers,
        };
    }, false, `${SLICE_NAME}/_finalizeClose - ${id} (${reason})`);
  },


  closeAllModals: () => {
      const state = get();
      // Reject all pending promises for modals still in the stack
      state.modalStack.forEach(modal => {
        const resolver = state.promiseResolvers[modal.id];
        if (resolver) {
            resolver.reject('All modals closed');
        }
      });
      // Reset state, keeping slice version
      set({ ...initialModalState, modalRegistry: state.modalRegistry, sliceVersion: state.sliceVersion }, false, `${SLICE_NAME}/closeAllModals`);
  },

  updateModal: <TData = any>(id: string, updates: Partial<ModalData<TData>>) => {
      set((state) => {
          let modalFound = false;
          let updatedActiveModal = state.activeModal;
          const updatedStack = state.modalStack.map(modal => {
              if (modal.id === id) {
                  modalFound = true;
                  // Ensure internal fields aren't overwritten unintentionally
                  const { _promise, ...safeUpdates } = updates as any;
                  const updatedModal = { ...modal, ...safeUpdates };
                  if (state.activeModal?.id === id) {
                      updatedActiveModal = updatedModal;
                  }
                  return updatedModal;
              }
              return modal;
          });

          if (!modalFound) {
             console.warn(`[ModalSlice] updateModal called for non-existent ID: ${id}`);
             return state;
          }

          return {
              modalStack: updatedStack,
              activeModal: updatedActiveModal,
          };
      }, false, `${SLICE_NAME}/updateModal - ${id}`);
  },

   _resolveModal: <TResult = any>(id: string, result: TResult) => {
      const state = get();
      const resolver = state.promiseResolvers[id];
      const modal = state.modalStack.find(m => m.id === id);

      // Robustness: Check resolver exists. Prevents double resolve/reject.
      if (resolver && modal) {
         resolver.resolve(result);

         // Clean up resolver immediately *synchronously* within the same update if possible
         // This makes the check in _rejectModal even more robust.
         set(s => {
             const updatedResolvers = { ...s.promiseResolvers };
             delete updatedResolvers[id];
             return { promiseResolvers: updatedResolvers };
         }, false, `${SLICE_NAME}/_resolveCleanup - ${id}`);

         // Confirmation implies close. Trigger the close flow *asynchronously*
         // to allow the current execution context (e.g., onClick handler) to finish.
         setTimeout(() => get().closeModal(id), 0);

      } else {
         console.warn(`[ModalSlice] _resolveModal called for ID without a pending promise or modal: ${id}`);
      }
   },

   _rejectModal: (id: string, reason?: any) => {
       const state = get();
       const resolver = state.promiseResolvers[id];
       const modal = state.modalStack.find(m => m.id === id);
       const rejectReason = reason ?? 'Modal rejected';

       // Robustness: Check resolver exists. Prevents double resolve/reject.
       if (resolver && modal) {
           resolver.reject(rejectReason);

           // Clean up resolver immediately
           set(s => {
               const updatedResolvers = { ...s.promiseResolvers };
               delete updatedResolvers[id];
               return { promiseResolvers: updatedResolvers };
           }, false, `${SLICE_NAME}/_rejectCleanup - ${id}`);

            // Update modal state with error before triggering close
           const errorUpdate: Partial<ModalData> = { isLoading: false, isSubmitting: false };
           if (reason instanceof Error) {
               errorUpdate.error = reason.message;
           } else if (typeof reason === 'string' && reason !== 'Modal closed' && reason !== 'All modals closed') {
                errorUpdate.error = reason;
           }
           if (errorUpdate.error) {
               get().updateModal(id, errorUpdate);
           }

           // Rejection implies closing. Trigger close flow *asynchronously*.
           setTimeout(() => get().closeModal(id), 0);

       } else {
           console.warn(`[ModalSlice] _rejectModal called for ID without a pending promise or modal: ${id}`);
       }
   },
   // Future: processNextInQueue(): void;
});

// --- DevTools Helper ---

/** Returns a summary of the modal state for easier debugging */
export const getModalStateSummary = (state: ModalState) => ({
  isModalOpen: state.isModalOpen,
  stackSize: state.modalStack.length,
  activeId: state.activeModal?.id ?? null,
  activeTitle: state.activeModal?.title ?? null,
  closingId: state.closingModalId ?? null,
  pendingPromises: Object.keys(state.promiseResolvers).length,
  registrySize: Object.keys(state.modalRegistry).length,
});


// --- ModalHost Responsibilities Reminder (Comment) ---
// The companion ModalHost component MUST handle:
// - Reading state (activeModal, closingModalId) via useStore/useDevTools.
// - Rendering modals into a Portal.
// - Applying styles/layout based on variant, intent, size, position, animation props.
// - Orchestrating entry/exit animations watching activeModal & closingModalId.
// - Calling slice._finalizeClose(id) in animation's onExitComplete/onAnimationComplete.
// - Implementing focus trapping & scroll locking based on `trapFocus`, `lockScroll`.
// - Handling backdrop clicks & Escape key (checking `persistent`, etc.) & calling slice.closeModal(id).
// - Calling `onConfirm` (handling errors with try/catch), then calling slice._resolveModal / slice._rejectModal.
// - Applying ARIA roles/attributes based on intent and ModalData props.
// - Managing initial focus (`initialFocusRef`) & restoring focus on close.