Updated & Complete Plan for Leveraging devToolsSlice
(As of: Sunday, April 6, 2025 - Location: Peru)

Goal: Maximize User Experience (Speed, Smoothness, Resilience) and Developer Experience (Rapid, Error-Free Development, Scalability) using the devToolsSlice.

Phase 0: Foundation & Setup (Prerequisites)

Objective: Establish a robust, safe, and correctly configured foundation for developer tooling.
Actions:
Verify Store Integration: Confirm createDevToolsSlice is correctly added to your main Zustand create function, likely namespaced (e.g., devtools: createDevToolsSlice(...)).
Zustand DevTools Middleware: Ensure Zustand devtools middleware is active for browser Redux DevTools integration (import { devtools } from 'zustand/middleware').
Conditional Loading Strategy: Enforce the use of process.env.NODE_ENV === 'development' checks AND dynamic imports (React.lazy, next/dynamic) for all dev-specific UI components (like the main panel, inspectors) and any heavy associated logic.
SSR Guards: Implement if (typeof window === 'undefined') return null; checks at the beginning of dev-only components that might render during SSR attempts by dynamic imports, preventing hydration errors.
(Optional but Recommended) State Persistence:
Integrate Zustand's persist middleware for the devToolsSlice.
Configure with localStorage and a unique name (e.g., asraya-devtools-storage).
Add a version number to your DevToolsState (e.g., sliceVersion: 1). Use the migrate function in persist options to handle state changes across versions if the persisted structure changes later.
Use partialize to only persist relevant settings (e.g., logLevel, featureFlags, maybe isPanelOpen) and exclude transient toggles (showPerformanceMetrics, etc.).
Define Logging Levels & Priority:
Update LogLevel type: export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'none';
Define priority map for comparisons: export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, none: 5 };
Create Utility Hook: Add export const useDevTools = () => useStore(state => state.devTools); for convenient access to the slice state within components/hooks.
Environment Variable Strategy: Decide if you need dev tools in staging/QA. If so, introduce process.env.NEXT_PUBLIC_DEVTOOLS === 'true' as an additional condition (alongside NODE_ENV === 'development') for enabling dev tools in specific production-like builds. Use with caution.
Phase 1: Core Dev Experience - Visibility & Control

Objective: Provide immediate, easy access for developers to toggle and control the dev tools state.
Actions:
Implement Minimal Dev Toggle Button:
Create a simple DevToolsToggleButton.tsx component.
Render it conditionally (NODE_ENV === 'development').
Style as a small, fixed pill/button (e.g., bottom-right, low z-index initially).
onClick should call useStore.getState().devTools.togglePanel(). This provides immediate access before the full panel is built.
Build Floating DevToolsPanel Component:
Create src/components/devtools/DevToolsPanel.tsx.
Load using next/dynamic: const DevToolsPanel = dynamic(() => import('@/components/devtools/DevToolsPanel'), { ssr: false });.
Render conditionally based on useDevTools().isPanelOpen.
Style as a floating overlay (fixed, higher z-index than toggle button). Use Framer Motion for smooth entry/exit animations (slide/fade).
Implement Panel Toggling Methods:
Keyboard Shortcut: Implement useGlobalShortcut('ctrl+shift+d', useStore.getState().devTools.togglePanel) (requires creating this custom hook).
(Optional) URL Parameter: Add useEffect check for ?devtools=true.
(Consider removing minimal button once full panel/shortcuts are reliable)
Populate DevToolsPanel with Controls:
Add UI controls linked to devToolsSlice actions:
Dropdown for setLogLevel (using updated LogLevel type).
Checkboxes for togglePerformanceMetrics, toggleLayoutState.
Button for resetDevTools.
Feature Flags:
Define featureFlagMetadata (locally or imported) like { flagName: { label: 'Nice Name', description: '...' } }.
Render flag toggles using this metadata for better UI clarity. Link to toggleFeatureFlag.
(Optional) Dev Mode Banner: Add a simple banner component (e.g., top of viewport) rendered conditionally based on isPanelOpen to clearly indicate when dev tools are active.
Phase 2: Essential Debugging Tools Integration

Objective: Connect fundamental debugging aids (logging, state inspection) to the dev tools state and UI.
Actions:
Implement Centralized Logger (logger.ts):
Define logger.trace, debug, info, warn, error.
Require a tag argument (e.g., 'chat', 'layout').
Implement level checking using LOG_LEVEL_PRIORITY map and safely accessed logLevel state (pass state in or use subscription).
Refactor console.* calls to use this logger.
(Future): Implement an in-panel console UI that receives logs from the logger utility, allowing tag/level filtering.
Implement Layout State Inspector:
Create src/components/devtools/LayoutStateInspector.tsx (dynamic, conditional on showLayoutState).
Display relevant state (useInteractionContext, useLayoutStore) using react-json-view. Place inside DevToolsPanel or as separate overlay.
Implement "Runtime Warning Overlay": Render a small, fixed badge (e.g., top-right) like <div className="fixed ... bg-yellow-400 ...">Layout Debug ON</div> when showLayoutState is true.
State Dump: Enhance DevToolsPanel with react-json-view sections for inspecting key Zustand slices.
Phase 3: Performance & UX Optimization Integration

Objective: Enable tools for analyzing and improving UI performance, controlled via the dev panel.
Actions:
Integrate Performance Metrics UI:
Conditionally render chosen tool (<Stats /> for R3F, stats.js, etc.) based on showPerformanceMetrics. Load dynamically.
Add Per-Component Render Counters:
In key components, add useRef/useEffect counter.
Conditionally render count as a small CSS overlay when showPerformanceMetrics is true.
Integrate Re-render Highlighting:
Conditionally enable @welldone-software/why-did-you-render via a feature flag (enableWhyDidYouRender).
Implement "Runtime Warning Overlay": Render a badge (e.g., "Render Debug ON") when this flag is true.
Phase 4: Advanced Features & DX Polish

Objective: Add sophisticated debugging tools and convenience features for complex scenarios.
Actions:
Runtime Metrics Display: Create src/components/devtools/RuntimeMetrics.tsx to track and show specific metrics (streamLatency, messageRate, agentActivity, orbState, etc.). Determine metric storage (Zustand state, context, simple state manager).
(Optional) Debug Chat Overlay: Create a specialized overlay (toggleable via flag) for displaying raw chat payloads/events.
Mobile Gesture Toggle: Implement gesture (e.g., triple-tap via useGesture) for toggling DevToolsPanel on touch devices.
Command Palette Integration: Register dev-only commands (e.g., devtools.togglePanel, devtools.setLogLevel.debug) with your commandRegistry.ts.
Enhance Feature Flag UI: Add grouping, search, or descriptions fetched from metadata.
Enhance Retry UX Note: Add comments noting potential future state/UI for repeated retry failures.
Ongoing: Production Safety & Team Conventions

Objective: Ensure dev tools remain effective, maintainable, and strictly separate from production.
Actions:
Strict Conditional Loading/Imports: Rigorously enforce NODE_ENV === 'development' (and potentially NEXT_PUBLIC_DEVTOOLS) checks and next/dynamic({ ssr: false }) for all dev-specific code.
Bundle Analysis: Mandate regular checks using @next/bundle-analyzer (or similar) before releases to prove dev tools code is not in production bundles.
Documentation & Conventions: Maintain clear documentation on tools, flags, logging (including tags), and usage conventions. Ensure team alignment.
Keep Tools Updated: Update dependencies (why-did-you-render, react-json-view, etc.).
Regular Review: Periodically review dev tool effectiveness and remove unused/obsolete features.
This comprehensive plan, refined with the latest suggestions, provides a clear roadmap to building an exceptionally useful developer toolkit within Asraya OS, ultimately benefiting both the development team and the end-users. Remember to implement incrementally, starting with the foundational elements in Phase 0 and 1.