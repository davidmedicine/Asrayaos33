🧭 Enhanced Plan: Multi-Agent UI Integration for Asraya OS (v1.6)
🔥 Primary Goals:
Inspire Purpose: Ground user via North Star & Core Values (SanctuaryPanel), persisted via Supabase/Drizzle.
Drive Action: Provide clear visibility and interaction with Quests (QuestLogPanel).
Offer Guidance: Deliver intelligent Suggestions & Insights from dashboard agent (GuidancePanel).
Facilitate Creation: Enable intuitive 3D artifact creation via NL (World context).
Unify Communication: Integrate AI Agents and community chats seamlessly (Chat context), using Supabase Realtime for messages.
Aesthetic Cohesion: Ensure visual alignment with "Ancient Future" theme using global.css variables/utilities.
Accessibility & Responsiveness: Implement robust accessibility (WCAG alignment) and a polished mobile-first experience.
💡 Key Requirement: Dual Agent Context (Zustand State)
Global: activeAgentId: AsrayaAgentId | null (in agentSlice.ts, default 'oracle'). Set by Topbar AgentDropdown. Influences NL processing (World), specific UI styling (Chat Input).
Dashboard: activeDashboardAgentId: AsrayaAgentId | null (Add to layoutSlice.ts, default 'oracle'). Set potentially via Dashboard settings. Drives GuidancePanel insights/theme & SanctuaryPanel theme.
⚙️ Key Requirement: Central Agent Registry (agentSlice.ts or agentRegistry.ts)
Verify/Implement: Ensure a central registry (AGENT_DEFINITIONS in agentSlice.ts or a dedicated agentRegistry.ts) exists and contains comprehensive metadata for each AsrayaAgentId:
// Example structure within agentRegistry.ts or agentSlice.ts
export const agentRegistry: Record<AsrayaAgentId, {
  name: string;
  description?: string; // For tooltips, context panels
  capabilities?: string[]; // List of capabilities for display/logic
  // Define color tokens directly or reference CSS Vars if preferred
  colorTokens: {
    primary: string; // e.g., 'var(--color-wisdom-indigo-500)' or the raw OKLCH value
    secondary: string;
    glow: string; // e.g., 'var(--glow-primary-xs)' or specific glow shadow value/class
    avatarGradient: string; // e.g., 'var(--agent-avatar-gradient-oracle)' or the gradient definition
  };
  themeClass: string; // e.g., 'theme-oracle'
  // Add other relevant metadata: symbol path, default model, avatar style etc.
}> = { /* ... definitions for oracle, muse, etc. ... */ };
Use code with caution.
TypeScript
Component Consumption: Components needing agent metadata (e.g., AgentDropdown, ChatContextPanel, GuidancePanel, ConversationListItem, panels applying themes) must pull this data from the central registry based on the relevant agentId.
🧱 Core Layout Definitions (layoutRegistry.ts)
Modify/Create: Ensure these definitions exist and are configured correctly in src/lib/core/layoutRegistry.ts. Use asraya:dashboard:default key.
asraya:dashboard:default (Sanctuary Compass - Desktop):
Structure: 3-panel horizontal (SanctuaryPanel 25%, QuestLogPanel 45%, GuidancePanel 30%).
Details: mobileLayout: 'tabs', inputBarBehavior: 'command', defaultPanelFocus: 'quest-log', dashboardAgentIdSource: 'activeDashboardAgentId'.
Mobile Tab Order: [Sanctuary], [Quests], [Guidance].
asraya:chat:unified (Unified Chat - Desktop):
Structure: 3-panel horizontal (UnifiedChatListPanel 25%, ActiveConversationPanel 45%, ChatContextPanel 30%).
Details: mobileLayout: 'tabs', inputBarBehavior: 'chat', defaultPanelFocus: 'chat-active', badgeCountSource: 'chatUnreadTotal'.
Mobile Tab Order: [List], [Active], [Context].
asraya:world:creator (World Creator - Desktop):
Structure: 3-panel horizontal (WorldAssetPanel 25%, WorldCanvasPanel 50%, WorldInspectorPanel 25%).
Details: mobileLayout: 'tabs', inputBarBehavior: 'none', defaultPanelFocus: 'world-canvas'.
Mobile Tab Order: [Canvas], [Assets], [Inspector].
📊 Data Persistence & Real-time (Supabase & Drizzle ORM):
DB: Supabase Postgres + Drizzle ORM schemas for UserMetadata (North Star, Values - consider a dedicated northStarSlice hydrated from this), Quests, Conversations, ChatMessages, WorldAssets, etc.
Auth: Supabase Auth.
Realtime: Supabase Realtime for ChatMessages & presence (via chatSlice).
Storage: Supabase Storage for assets.
State Hydration: Fetch initial data from Supabase/Drizzle on load to hydrate Zustand stores.
♿ Accessibility Implementation Strategy:
Semantic Roles: Apply appropriate ARIA roles consistently:
ChatListPanel > ul: listbox
ConversationListItem > li: option (or button if interaction model warrants)
GuidancePanel > Insight/Suggestion Cards: region (with aria-label or aria-labelledby), Items within list: listitem.
ActiveConversationPanel > Input textarea: textbox (with aria-label).
ChatContextPanel, WorldInspectorPanel: region (with aria-label or aria-labelledby).
All interactive controls (button, input, textarea, links): Must have accessible names (via text content, aria-label, or aria-labelledby).
State Attributes: Use aria-selected, aria-current (for active list items/tabs), aria-expanded, aria-busy, aria-live where appropriate.
Keyboard Navigation: Ensure logical tab order and keyboard operability (Enter/Space activation) for all interactive elements, including list items and custom controls. Implement roving tabIndex for lists like ChatListPanel.
Focus Management: Provide clear, visible focus indicators (focus-visible:ring-2...) using agent-aware colors where specified. Manage focus programmatically where needed (e.g., on modal open, panel activation).
aria-describedby: Apply to CTA buttons within SuggestionItem, QuestItem, and InsightItem (if it has a CTA), linking them to the respective card's text content ID for screen reader context.
✅ Panels Detailed Implementation Plan (v1.6):
(Use Reusable Sub-Components: <PanelSection>, <QuestItem>, <SuggestionCard>, <InsightCard>, <ConversationListItem>)
I. Dashboard Panels (asraya:dashboard:default)
🕯️ SanctuaryPanel.tsx (Left)
Purpose: Anchor user. Calm aesthetic.
Root: <Panel>. Use .panel, .texture-noise-subtle. Use applyTheme utility with activeDashboardAgentId. Optional gradient overlay.
Data: Hydrate northStar, coreValues from Zustand (sourced from Supabase).
Content: Use <PanelSection>. Title ("Sanctuary"). North Star Statement (+ Edit btn btn-ghost btn-sm, aria-label). Core Values (interactive buttons, agent-aware focus). Agent Indicator (click -> reflection chat with activeDashboardAgentId, aria-label). Optional Quest Links, Optional Stats.
🧭 QuestLogPanel.tsx (Center)
Purpose: Show active journey. Actionable, organized.
Root: <Panel>. Use .panel, .texture-noise-subtle.
Data: Hydrate quests from Zustand (sourced from Supabase).
Content: Use <PanelSection title="Active Quests"> / "Suggested Quests".
QuestItem Sub-component:
Structure: Card. Use applyTheme utility with quest.agentId. Agent-aware focus ring.
Content: Title, Description (ID for aria-describedby), Agent Dot, Status Badge (<span class="badge badge-...">), Progress Bar, Action Button (btn, aria-describedby).
🧠 GuidancePanel.tsx (Right)
Purpose: Suggestions/insights from activeDashboardAgentId.
Root: <Panel>. Use .panel, .texture-noise-subtle. Use applyTheme utility with activeDashboardAgentId.
Data: Fetch/generate via backend using activeDashboardAgentId.
Content: Use <PanelSection>s. Dynamic Header.
Insights List (ul aria-live="polite"): Use <InsightCard> component. Style distinctly.
InsightItem Schema: { id, summary, source, icon?, tags?, cta?: { text, action: ActionPayload } }.
Suggestions List (ul aria-live="polite" aria-relevant="additions removals"): Use <SuggestionCard> component.
SuggestionItem Schema: { id, text, action: ActionPayload }.
ActionPayload (Discriminated Union):
type ActionPayload =
  | { type: 'chat'; payload: { conversationId: string; agentId?: AsrayaAgentId; initialMessage?: string } }
  | { type: 'openPanel'; payload: { panelId: string; context?: any } }
  | { type: 'openModal'; payload: { modalKey: string; data?: any } } // Use key from modalRegistry
  | { type: 'triggerPrompt'; payload: { agentId: AsrayaAgentId; promptTemplate: string; contextData?: any } }
  | { type: 'filterMemory'; payload: { tags?: string[]; query?: string } }; // Example addition
Use code with caution.
TypeScript
SuggestionCard Component: Interactive card (hover/focus states, agent-aware ring). CTA Button (btn, add aria-describedby). Handle action prop based on its type.
II. World Context Panels (asraya:world:creator)
WorldAssetPanel.tsx (Left)
Purpose: Manage/create assets.
Root: <Panel>. Use .panel, .texture-noise-subtle.
Content: Asset Browser, Import, Creation Tools.
NL Input: textarea/input. Style consistently, agent-aware focus ring (using global activeAgentId). Placeholder. Submit -> Send text + global activeAgentId. Handle loading/errors.
WorldCanvasPanel.tsx (Center)
Purpose: 3D viewport.
Root: <Panel>. Contains 3D canvas.
Functionality: Navigation, selection, gizmos, placement. Sync state with Inspector.
WorldInspectorPanel.tsx (Right)
Purpose: View/edit selected 3D object properties.
Root: <Panel>. Use .panel, .texture-noise-subtle. Theme based on global activeAgentId.
Content: Use <PanelSection>. Dynamic Title. Metadata Section (Name .input-field, Type/Tags .badge). Parameters Section (Transform, Material - use .input-field, sliders). Optional AI Suggestions (use <SuggestionCard>, driven by global activeAgentId). Action Buttons (Apply/Reset - use btn, agent-aware focus).
III. Chat Context Panels (asraya:chat:unified)
UnifiedChatListPanel.tsx (Left)
Purpose: Consolidated chat list.
Root: <Panel>. Use .panel.
Data: Hydrate conversations from Supabase/Drizzle; subscribe to Realtime via chatSlice.
Content: Header (+ New Chat btn btn-ghost). Search (Phase 1.5+). Scrollable List (ul, role="listbox").
ConversationListItem: Implement as refined (v1.5). Add visual distinction for AI vs. Community types (icon/badge). Use applyTheme utility with conversation.agentId (or default). Add data-role. Use agent-aware focus ring, hover glow.
ActiveConversationPanel.tsx (Center)
Purpose: Display active message thread.
Root: <Panel>. Apply theme-{conversationAgentId} or default.
Data: Fetch history. Subscribe to Supabase Realtime via chatSlice.
Content: Header (dynamic title). Message Area (flex-col-reverse, custom-scrollbar). UserMessage, AgentMessage components (styled w/ utilities, entry animations). Input Area.
Input Component Styling: Style border using global activeAgentId's --agent-color-primary. Ensure focus ring uses same global agent color. Add comment: // DESIGN DECISION: Input uses global agent theme. Confirm UX.
ChatContextPanel.tsx (Right)
Purpose: Dynamic context based on active chat.
Root: <Panel>. Use .panel, .texture-noise-subtle.
Data: Fetch context data based on activeConversation.type/id (participants, agent metadata from registry).
Content: Conditionally render Agent Info OR Community Info (use <PanelSection>, collapsible sections/tabs).
IV. Mobile UX Implementation Plan (mobileLayout: 'tabs')
Layout Strategy: Implement tabbed interface for Dashboard, World, Chat on mobile (isMobile === true). Use consistent Tab component.
Component Adjustments: Use @container queries within panels for responsive styles. Ensure sticky headers.
Sidebar: Ensure mobile drawer (Sidebar.tsx) is accessible.
Input Bar (Chat): Ensure sticky bottom, auto-height, respect safe areas.
🔧 Technical Implementation Steps Summary:
State: Add activeDashboardAgentId + action to Zustand (layoutSlice). Verify other slices (agentSlice, chatSlice, potentially userMetadataSlice, questSlice).
Agent Registry: Verify/Implement central agentRegistry (in agentSlice or dedicated file) with specified metadata (name, desc, capabilities, colorTokens, themeClass). Refactor components to pull data from it.
applyTheme Utility: Create src/lib/utils/themeUtils.ts (or similar) with the applyTheme(element, agentId, fallbackAgentId) function as defined in feedback. Use this utility consistently for applying theme-* classes to panel roots or list items where dynamic scoping is needed.
Components: Create/modify all specified panels and reusable sub-components (PanelSection, QuestItem, SuggestionCard, InsightCard, ConversationListItem).
Registries: Update layoutRegistry.ts and panelRegistry.ts.
Styling: Strictly use global.css vars/utilities. Implement scoped theming via applyTheme utility. Implement all focus, hover, active states, glows, shadows.
Logic & Data: Implement NL submission (World), Insight/Suggestion generation (Dashboard - use activeDashboardAgentId), dynamic content (Chat Context), agent listing/distinction (Chat List), dynamic input styling (Chat Input - use global activeAgentId). Fetch/hydrate/subscribe via Supabase/Drizzle/Realtime. Use refined ActionPayload type.
Sidebar Config: Verify/fix sidebar structure.
Accessibility: Implement ARIA strategy as summarized (roles, labels, describedby, live regions), keyboard nav, focus management.
🧠 Future Enhancements (Phase 2-3 Notes):
Modals (North Star Editor, Agent Picker via modalSlice).
Quest Archive, Smart Prompts, Memory Integration, Artifact Generation Triggers.
Advanced Mobile UX (Tab pinning, transitions, persistence, Gestures, FABs).
