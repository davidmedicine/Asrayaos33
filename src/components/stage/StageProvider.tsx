// === File: src/components/stage/StageProvider.tsx ===
// Description: Manages a single shared R3F <Canvas> for background visuals,
// providing an enhanced context for panels to portal 3D objects and manage rendering.
// Incorporates feedback on API design, Leva loading, performance, SSR, a11y, and DX.

'use client'; // Provider logic relies on client-side hooks/state, but see SSR handling below.

import React, {
    createContext,
    useContext,
    useState,
    useMemo,
    useCallback,
    useEffect,
    useRef,
    type ReactNode,
    type ComponentType,
    type CSSProperties,
} from 'react';
import { Canvas, useThree } from '@react-three/fiber';

// Type definition for the Leva component
type LevaComponentType = ComponentType<{ collapsed?: boolean; hidden?: boolean }>;

// --- Types ---

/** Type for the invalidate function from R3F's useThree */
type InvalidateFn = () => void;

/**
 * Defines the shape of the context value provided by StageProvider.
 * Includes methods to manage objects and control rendering.
 */
interface StageContextValue {
    /**
     * Adds/Updates a ReactNode in the shared scene.
     * @param id - A unique, stable string identifier for the object.
     *             **IMPORTANT:** Must remain stable across renders. Changing the ID
     *             for the same conceptual object will leak the old object.
     *             A warning is logged in development if an ID is reused with a
     *             different node instance.
     * @param node - The ReactNode to render (e.g., <mesh />, <group />).
     */
    add: (id: string, node: ReactNode) => void;
    /**
     * Removes an object from the shared scene using its unique identifier.
     * @param id - The unique string identifier of the object to remove.
     */
    remove: (id: string) => void;
    /**
     * Retrieves a read-only copy of the current objects map.
     * Useful for inspecting the stage content. Avoid mutating the returned map.
     * @returns {ReadonlyMap<string, ReactNode>} A read-only map of staged objects.
     */
    getObjectsMap: () => ReadonlyMap<string, ReactNode>;
    /**
     * Triggers a re-render of the R3F Canvas. Essential when `frameloop="demand"`
     * and non-React state (e.g., material properties) has been mutated externally.
     * Returns `null` if called outside the client-side context (e.g., during SSR)
     * or before the Canvas has initialized.
     */
    invalidate: InvalidateFn | null;
}

interface StageProviderProps {
    children: ReactNode;
    /** Optional className for the root container div */
    className?: string;
    /** Optional style object for the root container div */
    style?: CSSProperties;
}

// --- Context Definition ---

// Default context value (SSR / initial state / no-op)
const defaultStageContextValue: StageContextValue = {
    add: (id, node) => {
        // No-op on server or before hydration
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`[StageProvider] Attempted to add object "${id}" outside client context.`);
        }
    },
    remove: (id) => {
        // No-op on server or before hydration
         if (process.env.NODE_ENV !== 'production') {
            console.warn(`[StageProvider] Attempted to remove object "${id}" outside client context.`);
        }
    },
    // Return an empty map for the read API in SSR/default state
    getObjectsMap: () => new Map<string, ReactNode>(),
    // Invalidate is not available on the server or before canvas init
    invalidate: null,
};

const StageContext = createContext<StageContextValue>(defaultStageContextValue); // Use default value

/**
 * Hook to access the Stage context. Provides methods to add/remove objects,
 * get the current object map, and trigger canvas redraws.
 *
 * **Note:** Components using this hook to interact with the stage (add/remove/invalidate)
 * generally need to be client components (marked with `'use client'`).
 * Reading the map (`getObjectsMap`) might be safe in SSR if needed, as it returns an empty map.
 *
 * @returns {StageContextValue} The stage context value.
 */
export const useStage = (): StageContextValue => {
    // useContext will return defaultStageContextValue if called outside a Provider,
    // which is the desired behavior for SSR safety. No throw needed here.
    return useContext(StageContext);
};

// --- Leva Dynamic Loader (Optimized with useRef) ---
// (No changes from previous version based on feedback)
const DevLevaLoader: React.FC = () => {
    const LevaComponentRef = useRef<LevaComponentType | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Added comment: Recommend verifying Leva exclusion from prod builds using a bundle analyzer
        // e.g., webpack-bundle-analyzer, source-map-explorer, @next/bundle-analyzer
        if (process.env.NODE_ENV !== 'production' && !LevaComponentRef.current && !isLoaded) {
            let isActive = true;
            // Added comment: Consider Leva's createRoot API for potentially lighter dev footprints
            // if lazy-loading individual panels becomes desirable. See: https://www.sbcode.net/react-three-fiber/leva-gui/#lazy-loading-leva
             import('leva')
                .then(levaModule => {
                    if (isActive) {
                        LevaComponentRef.current = levaModule.Leva;
                        setIsLoaded(true);
                    }
                })
                .catch(err => {
                    console.error("Failed to dynamically load Leva:", err);
                });
            return () => { isActive = false; };
        }
    }, [isLoaded]);

    if (process.env.NODE_ENV !== 'production' && isLoaded && LevaComponentRef.current) {
        const LoadedLeva = LevaComponentRef.current;
        return <LoadedLeva collapsed />;
    }
    return null;
};
DevLevaLoader.displayName = 'DevLevaLoader';


// --- Internal Canvas Helper ---

/**
 * Internal component rendered inside Canvas to access `useThree` state
 * and bridge `invalidate` back to the StageProvider context.
 */
const CanvasInternals: React.FC<{ setInvalidate: (fn: InvalidateFn) => void }> = ({ setInvalidate }) => {
    // Get invalidate function from R3F state
    const invalidate = useThree(state => state.invalidate);

    // Use effect to pass the invalidate function up *once* or when it changes
    useEffect(() => {
        setInvalidate(invalidate);
        // Clean up isn't strictly necessary here as invalidate function reference is stable,
        // but good practice if it could theoretically change.
        // return () => setInvalidate(null); // Optional cleanup
    }, [invalidate, setInvalidate]);

    // This component doesn't render anything itself
    return null;
};
CanvasInternals.displayName = 'CanvasInternals';


// --- Stage Provider Component ---

/**
 * Provides a shared R3F Canvas context. Handles object management,
 * development tools (Leva), rendering control (`invalidate`), and SSR safety.
 */
export const StageProvider: React.FC<StageProviderProps> = ({
    children,
    className,
    style
}) => {
    const [objectsMap, setObjectsMap] = useState<Map<string, ReactNode>>(new Map());
    // State to hold the invalidate function provided by CanvasInternals
    // Use a ref to store the function itself for stability if needed,
    // and state to trigger context update. Simpler: just store function in state.
    const [invalidateFn, setInvalidateFn] = useState<InvalidateFn | null>(null);

    // --- SSR Guard (Feedback Point 5b) ---
    if (typeof window === 'undefined') {
        // On the server, provide the default no-op context.
        // Ensures useStage() doesn't throw, but interactions are disabled.
        // Consumers performing actions still generally need 'use client'.
        return (
            <StageContext.Provider value={defaultStageContextValue}>
                {children}
            </StageContext.Provider>
        );
    }

    // --- Context API Methods ---

    const add = useCallback((id: string, node: ReactNode) => {
        setObjectsMap(prevMap => {
            const existingNode = prevMap.get(id);
            // Optimization: If ID exists and node reference is identical, do nothing (Feedback 4b)
            if (existingNode === node) {
                return prevMap;
            }

            // Development Warning: ID stability check (Feedback 1c)
            if (process.env.NODE_ENV !== 'production' && existingNode !== undefined && existingNode !== node) {
                 console.warn(`[StageProvider] Warning: Object with stable ID "${id}" was updated with a new ReactNode instance. Ensure IDs are stable and node references are consistent if possible, or that this change is intentional.`);
            }

            // Create new map for immutability
            const newMap = new Map(prevMap);
            newMap.set(id, node);
            if (process.env.NODE_ENV !== 'production') {
                 console.log(`[StageProvider] ${existingNode === undefined ? 'Adding' : 'Updating'} object:`, id);
            }
            return newMap;
        });
    }, []); // Stable callback

    const remove = useCallback((id: string) => {
        setObjectsMap(prevMap => {
            if (!prevMap.has(id)) {
                return prevMap; // No change needed
            }
            const newMap = new Map(prevMap);
            newMap.delete(id);
             if (process.env.NODE_ENV !== 'production') {
                 console.log('[StageProvider] Removing object:', id);
            }
            return newMap;
        });
    }, []); // Stable callback

    // Read API (Feedback 1b) - returns a read-only copy
    const getObjectsMap = useCallback((): ReadonlyMap<string, ReactNode> => {
        // Return a shallow copy to prevent external mutation of internal state
        return new Map(objectsMap);
    }, [objectsMap]); // Re-memoize only when map changes

    // Memoized context value, includes invalidate function from state (Feedback 1a)
    const contextValue = useMemo<StageContextValue>(() => ({
        add,
        remove,
        getObjectsMap,
        invalidate: invalidateFn, // Include the invalidate function captured from CanvasInternals
    }), [add, remove, getObjectsMap, invalidateFn]); // Re-memoize if invalidateFn changes

    // Memoized array of objects to render (prevents recalculation)
    const objectsToRender = useMemo(() => Array.from(objectsMap.values()), [objectsMap]);

    // --- Render Logic (Client-Side Only) ---
    return (
        <StageContext.Provider value={contextValue}>
            {/* Container Div */}
            <div
                 className={className}
                 style={{
                     position: 'absolute',
                     inset: 0,
                     zIndex: 0, // Behind most UI elements (z-index: 1+)
                     pointerEvents: 'none', // Interaction passthrough
                     overflow: 'hidden',
                     // (Feedback 3a Warning) will-change can consume memory, especially on Safari/Firefox.
                     // Remove or scope more tightly if complex animations cause issues.
                     // See: https://developer.mozilla.org/en-US/docs/Web/CSS/will-change#accessibility_concerns
                     willChange: 'transform', // Perf hint for rendering layer
                     // (Feedback 6a) transform: translateZ(0) creates a new stacking context.
                     // Helps fix potential rendering/focus bugs in Safari with overlapping elements.
                     transform: 'translateZ(0)',
                     ...style
                 }}
                 // (Feedback 3b & 6b Warning) aria-hidden hides from screen readers.
                 // pointer-events:none also makes it inaccessible to assistive tech hit-testing.
                 // If interactive 3D elements are added later, reconsider pointer-events,
                 // remove aria-hidden, and add accessible names (<title>, aria-describedby).
                 aria-hidden="true"
            >
                <DevLevaLoader />

                {/* (Feedback 7a: Disposal JSDoc) */}
                {/**
                 * NOTE: When you add resources *outside* Three JSX (e.g. using loaders like
                 * THREE.TextureLoader, THREE.GLTFLoader directly), you *must* dispose
                 * of them manually in your component’s `useEffect` cleanup function
                 * to free up GPU memory:
                 * Example:
                 *   useEffect(() => {
                 *     const texture = new THREE.TextureLoader().load(...);
                 *     // ... use texture ...
                 *     return () => {
                 *       texture.dispose(); // Dispose texture
                 *       // geometry?.dispose(); // If loaded geometry manually
                 *       // material?.dispose(); // If created material manually
                 *     };
                 *   }, []);
                 * See: https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects
                 */}
                <Canvas
                    frameloop="demand" // Optimal performance mode
                    style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '100%', height: '100%',
                    }}
                >
                     {/* Internal component to bridge invalidate function */}
                     <CanvasInternals setInvalidate={setInvalidateFn} />

                     {/* (Feedback 3c: Default light) */}
                     {/* Add a subtle ambient light so scenes aren't black by default */}
                     <ambientLight intensity={0.3} />

                     {/* Render dynamic objects */}
                     {objectsToRender}

                     {/* (Feedback 3d: rAF leak warning) */}
                     {/* Reminder: If components rendered here use manual requestAnimationFrame loops,
                         ensure they are cancelled (cancelAnimationFrame) in their useEffect cleanup
                         to prevent memory leaks when they unmount.
                         See Three.js guide: https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects (covers general memory management)
                         Or React docs on cleanup: https://react.dev/reference/react/useEffect#cleaning-up-an-effect
                     */}

                     {/* Other global scene elements (e.g., postprocessing effects) could go here */}
                 </Canvas>
            </div>

            {/* Application children, can use useStage() */}
            {children}
        </StageContext.Provider>
    );
};

StageProvider.displayName = 'StageProvider';
export default StageProvider;


// --- Optional Helper Component (StageObject) ---
// (No changes from previous version needed based on new feedback,
// but ensure documentation reflects ID stability requirement)

/**
 * Optional declarative helper component to manage adding/removing an object
 * from the StageProvider context based on component lifecycle.
 *
 * @example
 * <StageObject id="my-stable-mesh-id">
 *   <mesh>...</mesh>
 * </StageObject>
 */
export const StageObject: React.FC<{ id: string; children: ReactNode }> = ({ id, children }) => {
    const { add, remove } = useStage();

    useEffect(() => {
        // Ensure ID is stable - changing 'id' prop here causes removal and re-add
        add(id, children);
        return () => {
            remove(id);
        };
        // Note: If 'children' prop changes referentially very often but isn't
        // visually different, consider memoizing it before passing to StageObject.
    }, [id, children, add, remove]);

    return null;
};

StageObject.displayName = 'StageObject';