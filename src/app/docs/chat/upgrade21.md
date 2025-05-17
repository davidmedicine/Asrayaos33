Implementation Plan: Asraya OS Real-time Left Rail (Frontend - v3.0.6)
This document outlines the finalized v3.0.6 technical implementation plan for the frontend of the Asraya OS real-time left rail. It integrates previous feedback rounds and incorporates new requirements for a three-tab navigation structure ('Chats' ▸ 'Channels' ▸ 'Online'), introduces different channel types (public, private, secret), and adds a visual 'coherence' indicator hook. This plan mandates Radix UI for the tab implementation, ensures robust state management (including Map persistence, selector memoization contracts, and new channel state), maintains realtime stability, defines strict WCAG-aligned accessibility, establishes verifiable performance budgets, and enforces consistent configuration. It aligns with best practices from Radix UI, Supabase, Zustand, W3C/WCAG, MDN, React Virtuoso, GSAP, Tailwind CSS, and standard tooling. This version represents the definitive blueprint for merge.
Key Frontend Revisions & Confirmations (v3.0.6 Enhancements - Final Pass):
Tab Structure (Radix UI - MAJOR CHANGE):  - asrayaos8.4/src/features/chat/components/ConversationTabs.tsx 
Mandated : Navigation is now a three-tab structure: 'Chats', 'Channels', 'Online'.
Mandated: Use Radix UI <Tabs.Root>, <Tabs.List>, <Tabs.Trigger>, and <Tabs.Content> primitives for correct ARIA wiring (role="tabpanel"/aria-labelledby) and keyboard navigation.
State Management (Zustand):
UI State (uiSlice): Updated for three tabs (selectedLeftRailTab: 'chats' | 'channels' | 'online'). Migration logic updated. Selectors updated.
Presence State (presenceSlice): No fundamental change to persistence/online friends logic, but memoization contract/testing remains mandatory.
NEW Channel State: Likely requires a new Zustand slice (e.g., channelSlice) to manage channel lists, types (public, private, secret), membership status, and potentially channel-specific 'coherence' values. Needs actions for fetching/updating channels.
Chat State: Existing chat state might need updating to include a 'coherence' property if the visual hook applies to chats.
Map Persistence/Selector Stability: Requirements for presenceSlice (Map test, selector stability test/contract) remain mandatory. Similar principles should apply to any new state slices managing complex data structures like channel lists.
Data Models:
Channel Type: Channel data model must include a type field ('public' | 'private' | 'secret').
Coherence Property: Relevant data models (e.g., Chat, Channel) must include a coherence: number property (or similar) if they are subject to the visual hook.
UI Components:
ConversationTabs: Updated for three tabs, including labels, values, and handling counts for all three sections.
ConversationsPanel: Manages three <Tabs.Content> sections (Chats, Channels, Online). Fetches/passes counts for all three.
NEW ChannelList / ChannelListItem: New components required for the 'Channels' tab. ChannelListItem must visually differentiate types, show appropriate actions (e.g., 'Join' for private), and implement the coherence visual hook. Virtualization strongly recommended for ChannelList.
ChatListItem: Updated to implement the coherence visual hook if applicable.
Visual Hook ('Coherence Glow'):
Mandated: List items (Chats and/or Channels) where coherence > 80 must apply the shadow-[var(--glow-fire-medium)] class.
Mandated: Define the --glow-fire-medium CSS variable (e.g., 0 0 12px 2px rgb(255 105 70 / .5)) in globals.css, potentially with theme variants. Ensure Tailwind recognizes the arbitrary shadow class.
Realtime (Supabase): Core logic (counter, retry, cleanup, max retries) remains mandatory, but may need to handle channel-related events if applicable.
Accessibility (Focus Appearance): Mandatory focus ring variables/contrast/Tailwind overrides remain unchanged. Axe/Lighthouse testing now covers three tab panels.
Performance & Build: Mandatory JS & CSS bundle budget checks remain. Virtualization applied to Chats and likely Channels lists.
Testing: E2E tests updated for 3-tab navigation. New unit/component tests for channel state and components. Map persistence and selector stability tests remain mandatory.
2. Tailwind Token & CSS Variable Alignment
Focus Variables (Mandatory): Define --focus-ring-width: 2px; and theme-specific --focus-ring-color (verified 3:1 contrast).
Tailwind Config (Mandatory): Override ringWidth/ringColor for focus-visible to use CSS vars.
NEW Coherence Glow Variable (Mandatory):
Define --glow-fire-medium in globals.css. Consider light/dark theme variants if needed.
 CSS
/* globals.css */
:root {
  --glow-fire-medium: 0 0 12px 2px rgb(255 105 70 / .5);
  /* ... other light theme vars ... */
  --focus-ring-color: #005A9C; /* EXAMPLE Light */
  --focus-ring-width: 2px;
}

html.dark {
  /* Optionally redefine for dark theme if needed */
  /* --glow-fire-medium: 0 0 14px 3px rgb(255 120 80 / .6); */
  /* ... other dark theme vars ... */
  --focus-ring-color: #7CC4FF; /* EXAMPLE Dark */
}


Ensure Tailwind's JIT engine recognizes shadow-[var(--glow-fire-medium)]. Usually works out-of-the-box with arbitrary values, but confirm.
Linting (Recommended): Enable ESLint radix rule.
3. State Management: Resilient Inner Resonance (Zustand)
3.1. presenceSlice (Online Friends)
Target State Shape: presenceByTopic: Map<...>, emberCount: number, onlineFriends: Map<...>, onlineFriendsArrayMemoized: OnlineFriend[].
Serialization/Memoization/Testing: Mandatory mapReplacer/mapReviver, unit test for persistence, mandatory memoization in slice actions for onlineFriendsArrayMemoized, documented stability contract, and selector stability unit test remain unchanged requirements.
3.2. uiSlice & uiSelectors (Revised for 3 Tabs)
uiSlice.ts:
State: selectedLeftRailTab: 'chats' | 'channels' | 'online'.
Initial State: Default to 'chats'.
Action: Update setSelectedLeftRailTab action/validation for three tabs.
Persistence: Bump version and add migrate function mapping old values ('chat', 'online') to new defaults or appropriate new values (e.g., map old 'chat' to new 'chats').
uiSelectors.ts:
Update useLeftRailTab, useSetLeftRailTab implementations for the three possible values.
3.3. NEW channelSlice (Channels - Proposed)
Purpose: Manage state related to channels.
Target State Shape (Example):
channels: Map<string, ChannelData> (or an array if order matters and map isn't needed)
channelMembership: Map<string, 'member' | 'pending' | 'not_member'>
isLoadingChannels: boolean
errorLoadingChannels: string | null
Define ChannelData Type: Must include id: string, name: string, type: 'public' | 'private' | 'secret', coherence?: number, potentially unread count, last message snippet, etc.
Actions:
WorkspaceChannels(): Action to load channel list (respecting user permissions for private/secret).
joinChannel(channelId: string): Action to request joining a private channel.
Actions to update channel data (e.g., from WebSocket events).
Selectors:
useChannelsList(): Selects channels suitable for display (e.g., filter out secret channels user isn't part of, sort). Consider memoization for stability if transformations are complex.
useChannelCount(): Selects the number of channels to display in the tab badge.
useChannelMembershipStatus(channelId: string): Selects the user's status for a specific channel.
Persistence: Decide if channel list needs persistence. If so, apply appropriate serialization (like mapReplacer/reviver if using Maps).
Testing: Unit tests for actions, reducers, selectors. If using complex selectors, add stability tests.
3.4. chatSlice (Chats - Potential Update)
Coherence: If the visual hook applies to chats, update the ChatData type to include coherence: number. Update actions/state accordingly.
3.5. Constants Module (/src/lib/constants/...)
Update/add constants related to channel types, API endpoints, or realtime events.
Integer Parsing: Continue using parseInt(..., 10) for relevant env vars.
4. Realtime & Animation Implementation: Stable Flow, Accessible Motion
4.1. Supabase Realtime Client Usage (useRealtimePresence.ts / potentially new hooks)
Core Logic: Shared counter, error handling (w/ max retries & unsubscribe), and cleanup (clearTimeout before unsubscribe, decrement counter) remain mandatory for presence.
Channel Events: If channel updates (new messages, membership changes, coherence updates) come via Supabase realtime, either extend useRealtimePresence or create a new dedicated hook (e.g., useRealtimeChannels) following the same stability and cleanup principles.
4.2. GSAP Integration Enhancements
CSS @property Registration (Mandatory): Define in globals.css.
ScrollSmoother Handling (Mandatory Cleanup): Cleanup must .kill() and set ref = null.
General Cleanup: Rigorous cleanup of all instances/listeners.
5. UI/UX Implementation Details
5.1. Left Rail Navigation (Revised: 3 Tabs - Chats/Channels/Online)
ConversationTabs.tsx:
Use tabConfig = [{ label: 'Chats', value: 'chats' }, { label: 'Channels', value: 'channels' }, { label: 'Online', value: 'online' }].
Use Radix Tabs.Trigger for each. Bind state via useLeftRailTab/useSetLeftRailTab.
Handle counts={{ chats: number, channels: number, online: number }} prop for badges.
Ensure ARIA labels include counts, visual badge aria-hidden="true", mandated focus styles.
ConversationsPanel.tsx:
Fetch state: activeTab = useLeftRailTab(), fetch counts for all three sections (using relevant selectors like useUnreadChatCount, useChannelCount, useOnlineFriends).
Pass counts prop to <ConversationTabs />.
Mandatory Radix Primitives: Render three <Tabs.Content> sections:
 JavaScript
 <Tabs.Root value={activeTab} onValueChange={setLeftRailTab} className="flex flex-col h-full">
   <Tabs.List aria-label="Left Rail Sections" className="flex-shrink-0">
     <ConversationTabs counts={{ chats: chatCount, channels: channelCount, online: onlineCount }} />
   </Tabs.List>

   <Tabs.Content value="chats" /* ...className */>
     {/* Chat list Virtuoso + Empty/Loading States */}
     {/* Needs coherence hook integration if applicable */}
     <ChatListVirtuoso /* ...props */ />
   </Tabs.Content>

   <Tabs.Content value="channels" /* ...className */>
     {/* NEW: Channel list Virtuoso + Empty/Loading States */}
     {/* Needs coherence hook integration */}
     <ChannelListVirtuoso /* ...props */ />
   </Tabs.Content>

   <Tabs.Content value="online" /* ...className */>
     <OnlineFriendsShelf friends={onlineFriendsArray} />
   </Tabs.Content>
 </Tabs.Root>


NEW ChannelListVirtuoso.tsx / ChannelListItem.tsx:
ChannelListVirtuoso: Implement using react-virtuoso. Fetch channel data using useChannelsList(). Handle loading/empty states.
ChannelListItem:
Accept channel: ChannelData prop.
Display channel name, maybe other info (icon, unread marker).
Visually indicate type: Use icons, text labels, or styling differences for public, private, secret.
Conditional Actions: Show "Join" button for private channels if user is not_member. Navigate on click for public/member. Handle secret visibility/interaction based on defined rules.
Coherence Hook: Apply shadow-[var(--glow-fire-medium)] class conditionally: className={clsx(..., channel.coherence > 80 && 'shadow-[var(--glow-fire-medium)]')}. Ensure --glow-fire-medium style is defined globally.
Apply mandated focus styles to the item itself or interactive elements within.
ChatListItem.tsx:
Update to apply shadow-[var(--glow-fire-medium)] class conditionally if chat.coherence > 80.
5.2. List Virtualization (react-virtuoso)
Apply to 'Chats' list and strongly recommend for 'Channels' list.
Buffer Tuning (Mandatory): Use increaseViewportBy={parseInt(..., 10)} sourced from env var for both lists if virtualized.
6. Accessibility Compliance & Testing
6.1. Adherence to WCAG Standards (Focus Appearance)
Mandatory: Define focus vars, verify 3:1 contrast, configure Tailwind.
6.2. Phase 2 Automated Accessibility Testing (Axe-core + Playwright)
Coverage (Mandatory): E2E tests must run Axe checks within all three panels ('Chats', 'Channels', 'Online') after navigation.
6.3. Phase 2 Accessibility Budgeting (Lighthouse CI)
Mandatory: Configure (.lighthouserc.json) and run Lighthouse CI accessibility assertions. (Readiness Gate).
7. Performance Optimizations & Risk Mitigation
7.1. Phase 2 Bundle Size Budget & CSS Check (JS & CSS Budgets - Mandatory)
Mandatory Script (scripts/bundle-budget.cjs): Check gzipped size of JS chunks AND main CSS output against budgets in CI. (Readiness Gate).
8. Frontend Risk Mitigation & Hotspots Summary (v3.0.6 Final)
Complexity: Increased due to 3 tabs and channel logic. Mitigation: Clear component structure, dedicated state slice for channels, robust testing.
Realtime: Handled by existing robust patterns (counter, retry, cleanup). Apply same principles to channel events if needed.
State: Map persistence/selector stability covered by mandatory testing. New channel state needs careful design and testing.
Accessibility: Covered by Radix primitives + mandatory testing (Axe/Lighthouse) across all 3 tabs. Focus states verified.
Performance: Covered by virtualization, mandatory bundle budgets (JS & CSS).
Coherence Hook: Low risk if CSS/conditional class is applied correctly. Needs visual testing.
9. Deployment & Verification Checklist (Frontend Focus - v3.0.6 - Final Gates)
✅ Apply Code Changes: Implement per Appendix F (updated for 3 tabs, channels, coherence).
✅ Configure Env Vars: Set ALL_CAPS-KEBAB-CASE vars.
✅ Design Handoff Verification: Confirm focus ring contrast (≥ 3:1) (Readiness Gate). Verify coherence glow appearance/trigger. Verify channel type indicators/actions.
✅ Unit Tests Pass:
All existing tests pass.
Mandatory Map Persistence Test (presenceSlice) passes. (Readiness Gate)
Mandatory Selector Stability Test (useOnlineFriends) passes. (Readiness Gate)
New unit tests for channelSlice (actions, selectors) pass.
New component tests for ChannelListItem (types, actions, coherence glow) pass.
✅ CI Verification:
Build, Lint, Type Checks pass.
check:bundle script passes (JS & CSS Budgets Met). (Readiness Gate)
E2E tests pass (updated for 3 tabs, covering navigation, content swap, Axe checks in all 3 panels).
Lighthouse CI check passes (Accessibility Score Assertion Met). (Readiness Gate)
✅ Staging Deployment & QA:
Tab Functionality: Verify 3-tab navigation (click, keyboard), content swapping, badge counts.
Channels: Verify channel list display, type indicators (public/private/secret), actions ("Join" button etc.), coherence glow trigger/appearance. Test joining private channels.
Chats/Online: Verify functionality remains correct. Test coherence glow on chats if applicable.
Persistence/Realtime: Verify state persistence and realtime updates (presence, channels if applicable).
Accessibility/Focus: Manual checks on all 3 tabs, focus states, coherence glow visibility.
Cross-Browser/Safari: Check layout, scrolling (Chats/Channels lists).
✅ Production Deployment: Deploy behind NEXT_PUBLIC_PRESENCE_V3 flag (or potentially a new flag for the 3-tab layout).
✅ Post-Deployment Monitoring: Monitor errors, performance, feedback.
10. Operational Considerations & Rollout Strategy (Frontend)
Feature Flag: Use existing NEXT_PUBLIC_PRESENCE_V3 or introduce a new one specific to the 3-tab UI (e.g., NEXT_PUBLIC_THREE_TAB_RAIL).
Environment Variables: Document new/updated vars.
Backend Dependencies: Ensure backend API provides channel data including type and coherence as needed. Define API for joining private channels.
Documentation: Update developer docs, READMEs, Storybook.
Document channelSlice state/actions.
Document ChannelListItem props and behavior variations based on type.
Document --glow-fire-medium variable and coherence logic.
Update screenshots/examples for the 3-tab layout.
Ensure focus color tokens are documented for designers.
11. Conclusion: Final Approval - Merge Ready (v3.0.6 Frontend)
It provides a clear path forward, acknowledging increased complexity but mitigating risks through dedicated state management, component structure, and comprehensive testing. Merge and ship (behind appropriate feature flag) once all readiness gates in Section 9 (focus contrast, unit tests, bundle budgets, Lighthouse CI) are green.
Appendix F: Detailed Frontend Code Implementation Checklist (v3.0.6 - 3 Tabs, Channels, Coherence)
(Checklist significantly updated)
Path
Action
What to add / change (Frontend Deltas v3.0.6 - 3 Tabs, Channels, Coherence)
Configuration & Globals




globals.css
No change
Important - dont touch global.css - only add updates only to presence.css 1) Add GSAP @property rules. &lt;br> 2) Define --focus-ring-width: 2px; & --focus-ring-color (light/dark, verify 3:1 contrast). &lt;br> 3) Define --glow-fire-medium (e.g., 0 0 12px 2px rgb(255 105 70 / .5)), consider theme variants.
tailwind.config.js
update
&lt;br> 3) Ensure shadow-[var(--glow-fire-medium)] arbitrary value works (usually default).
.env.example
update
ALL_CAPS-KEBAB-CASE. List all vars (presence, virtuoso, flags). Add any new channel API vars if needed.
Phase 2 .lighthouserc.json
no change
Keep accessibility assertion. (CI Readiness Gate)
Phase 2 package.json
no change
Keep check:bundle script, glob, gzip-size, @axe-core/playwright.
scripts/bundle-budget.cjs
no change
Keep script checking JS & CSS budgets. (CI Readiness Gate)
.eslintrc.js (or similar)
update
Recommended: Enforce radix rule.
State Management




src/types/
update/new
1) Update ChatData? Add coherence: number if needed. &lt;br> 2) NEW ChannelData type: `id, name, type: 'public'
src/lib/constants/
update/new
Add constants for channel types, events, API paths. Use parseInt(..., 10) for integer env vars.
src/lib/state/helpers/mapSerialization.ts
no change
Keep for presenceSlice. Use for channelSlice if it uses Maps for persistence.
src/lib/state/slices/presenceSlice.ts
no change
Keep Map persistence, mandatory memoization for onlineFriendsArrayMemoized, stability contract doc, selector stability test.
src/lib/state/slices/presenceSelectors.ts
no change
Keep useOnlineFriends selecting memoized array.
src/lib/state/slices/uiSlice.ts
update
Change state to `selectedLeftRailTab: 'chats'
src/lib/state/slices/uiSelectors.ts
update
Update useLeftRailTab, useSetLeftRailTab for 3 tab values.
src/lib/state/slices/channelSlice.ts
new
NEW Slice: Manage channels: Map<string, ChannelData>, channelMembership, loading/error states. Actions: WorkspaceChannels, joinChannel, event handlers. Define selectors useChannelsList, useChannelCount, etc. Consider persistence. Add Unit Tests.
Hooks & Services




src/hooks/useRealtimePresence.ts
no change
Keep core logic (counter, retry w/ maxRetries/unsubscribe, cleanup).
src/hooks/useRealtimeChannels.ts?
new?
Consider new hook if channel updates are realtime; implement with same robustness (counter, retry, cleanup).
src/hooks/useScrollSmootherSetup.ts
update
Mandatory Cleanup: kill() instance and set ref = null.
UI Components




src/features/chat/components/ConversationTabs.tsx
update
Use 3 tabConfig: [{value: 'chats'}, {value: 'channels'}, {value: 'online'}]. Use Radix Tabs.Trigger. Handle counts={{ chats, channels, online }} prop. ARIA labels, aria-hidden badge, focus styles.
src/features/chat/components/ConversationsPanel.tsx
update
Use useLeftRailTab (3 states). Fetch 3 counts. Pass to tabs. Mandatory: Render 3 Radix <Tabs.Content> (chats, channels, online).
src/features/chat/components/ChatListVirtuoso.tsx?
update?
Rename/reuse for 'Chats' tab. Integrate coherence hook if applicable via ChatListItem.
src/features/chat/components/ChatListItem.tsx?
update?
Rename/reuse for 'Chats' tab. Apply shadow-[var(--glow-fire-medium)] if chat.coherence > 80.
src/features/channels/components/ChannelListVirtuoso.tsx
new
NEW Component: Use react-virtuoso. Fetch data via useChannelsList. Render ChannelListItem. Handle loading/empty states. Use increaseViewportBy.
src/features/channels/components/ChannelListItem.tsx
new
NEW Component: Display channel name. Visually indicate type (public/private/secret). Show conditional actions (e.g., Join button). Apply shadow-[var(--glow-fire-medium)] if channel.coherence > 80. Mandated focus styles. Add Component Tests.
src/features/chat/components/OnlineFriendsShelf.tsx
no change
Repurpose as content for 'Online' tab.
Testing




Phase 2 tests/e2e/left-rail-tabs.spec.ts
update
Mandatory Playwright test: Update for 3 tabs. Test nav, content swap. Run Axe check within all 3 panels.
Phase 2 tests/a11y/**/*.spec.ts (Axe tests)
update
Ensure coverage includes new Channel components/states.
Phase 2 -tests/unit/presenceSlice.spec.ts
no change
Keep mandatory Map Persistence & Selector Stability tests. (Readiness Gate)
Phase 2 tests/unit/channelSlice.spec.ts
new
Mandatory Unit Tests: Cover actions, reducers, selectors for the new channelSlice.
Phase 2 tests/component/ChannelListItem.spec.tsx
new
Mandatory Component Tests: Verify rendering based on channel type, conditional actions, and coherence glow application.
Phase 2 Documentation




READMEs / Storybook / Design System Docs
update
Document 3-tab layout, channel components/state, coherence hook (--glow-fire-medium), focus color tokens. Update screenshots.



