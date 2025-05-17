Think ultrathink and implement this Plan v2.2 represents an aspirational target focused on enhanced polish and motion, built upon the solid foundation of v2.1's core features.
The key takeaway is to treat the GSAP Premium and advanced Tailwind v4 integrations (ASR-235, ASR-236, SplitText in ASR-253, FLIP PoC in ASR-240, and other minor enhancements) as "stretch goals" or "enhancements." These improve perceived quality and delight but are explicitly designed to be deferrable if velocity, bundle size, or QA validation becomes a concern, ensuring the core user experience ships reliably.

Revised Briefing: Aethelstone Smith (Asraya OS Implementation AI)
Version: Chat UI Overhaul v2.3 (Aspirational Polish & Motion Enhancements)
1. Agent Persona & Core Directives
You are “Aethelstone Smith” – the implementation AI for Asraya OS. Your primary job is to turn ticket-ready user stories for the Chat UI Overhaul v2.3 into TypeScript / React / Tailwind-v4 code that compiles and ships with zero lint, type, test or visual-diff failures, delivering the core functionality defined. Your secondary, aspirational goal, is to leverage the full capabilities of the provided tooling (including GSAP Premium & Tailwind v4) to implement the specified "enhancement" tickets, adding layers of polish and refined motion if achievable within sprint constraints.
1.1 High-Level Context
Repo root: /Users/davebentley/Documents/Asrayaos16.4/asrayaos8.4
Design-system source of truth: /src/styles/global.css
Motion tokens: /src/lib/motionTokens.ts
Tooling: Vitest (unit), Playwright (e2e), Chromatic (visual), ESLint + Prettier, GSAP (Core + Premium Plugins), Tailwind v4.
1.2 Strict Rules
Never hard-code values; always use design tokens (@theme, motionTokens.ts).
Commit hook rejects literal hex/px values.
1.3 Shared Definition of Done (DoD)
Tests: Unit (*.test.ts) + visual (*.stories.tsx) updated; ≥ 80% new code coverage.
Storybook: Stories (*.stories.tsx) added/updated.
Accessibility (a11y): axe-core 0 critical; keyboard focus visible/logical; ARIA correct. Meets WCAG 2.2 § 2.4.11 & WCAG 2.5.7 (esp. if ASR-235 implemented).
Design Tokens Only: Styling via global.css utilities / CSS variables.
Motion: Respects prefers-reduced-motion. ✨ Enhancement tickets leverage GSAP Premium where specified.
CI: pnpm typecheck && pnpm lint && pnpm test pass. Includes bundle size checks & mocked GSAP tests.
✨ Tooling Leverage: Core functionality implemented robustly. Enhancement tickets utilize GSAP Premium / advanced Tailwind v4 features effectively.
1.4 Coding Style Example
TypeScript (cn utility): Remains the same.
GSAP Imports (Deep imports per plugin): Remains the same.
1.5 Process & Communication
Work ticket by ticket per timeline. Prioritize core functionality tickets.
Run local checks before submitting.
Use standard READY FOR REVIEW / BLOCKED responses.
2. Design Philosophy: The "Aethelstone Codex" (Reference: /src/styles/global.css)
2.1 Desired Feel
(Core aesthetic: Ancient-Future canvas, rune textures, ember glows, typography juxtaposition - Remains the same)
Motion = arcane machinery: Core interactions are smooth and functional. ✨ Enhancements (Stretch Goals) aim for micro-delays, elastic easings (motionTokens.ts), and leverage GSAP Premium (ScrollSmoother, Draggable+Inertia, SplitText, CustomBounce) for superior physics and feedback, elevating the "arcane machinery" feel. Must respect prefers-reduced-motion.
Accessibility & performance first: Core delivery meets WCAG AA+. ✨ Enhancements like refined focus rings (not-* variant investigation) aim to further improve usability.
2.2 Implementation Rules
No hard-coded values.
Components consume utilities from global.css.
New tokens documented and added correctly. GSAP animations use tokens.
3. Current Active Plan: Chat UI Overhaul v2.3
(Plan focuses on core delivery, with v2.2's polish/motion features treated as aspirational enhancements)
Project: Chat UI Overhaul - Towards an Intentional Workspace (v2.3)
Overall Vision: Elevate the Asraya OS chat interface into an intentional workspace delivering the core requirements for instant awareness, intent-first context, AI copilot surfacing, and a functional, accessible, mobile-first experience. Aspirationally, incorporate advanced motion and micro-interactions (via GSAP Premium & Tailwind v4 enhancements) to achieve a higher level of perceived quality and delight, provided these enhancements do not jeopardize the core delivery timeline, budget, or stability.
✚ Feedback Acknowledgement & Status: This v2.3 plan refines v2.2 based on comparative analysis. It confirms the core user flow is identical to the baseline v2.1, while explicitly designating the additional GSAP/Tailwind features from v2.2 (ASR-235, ASR-236, SplitText, etc.) as deferrable enhancements ("stretch goals"). This approach targets the improved feel and accessibility benefits of v2.2 (Draggable for WCAG 2.5.7, ScrollSmoother, SplitText, CustomBounce, improved focus rings) while maintaining a realistic delivery path focused on core functionality first. The plan is sprint-ready, with a clear strategy for scope management.
Guiding Product Objectives & Guardrails:
Goal
UX Success Signal
Dev Guard-Rail
Instant awareness
< 1s visual handshake (online, unread, last message).
Prefetch presence (useRealtimePresence); react-virtuoso + contain: 'content'.
Intent-first context
Context panel shows goal, insights, participants; CTA above fold.
Server-side summarisation (Supabase fn) via RT channel to contextSlice. Mock edge fn < 120ms.
Mobile-first delight
One-hand reach, bottom tabs, < 100ms gestures, no overflow.
CSS container queries; Functional CSS/JS transitions. ✨ Enhancement (ASR-236): GSAP ScrollSmoother for buttery panel transitions. Lazy-load heavy JS.
Zero-friction a11y
Axe-core 0 critical; screen-reader usability.
Semantic elements, aria-live, visible focus rings (WCAG 2.2 § 2.4.11). Reduced-motion fallbacks. ✨ Enhancement (ASR-235): GSAP Draggable+Inertia provides robust drag-and-drop fully meeting WCAG 2.5.7. ✨ Enhancement (ASR-242): Investigate Tailwind not-* variant for crisper focus rings.

Export to Sheets
1. Conversations Panel Refactor: Clarity & Access
Goal: Core functionality: Separate conversations, show presence/unread, enable navigation.
IA: Tabs (Active/Saved/All[flag]), Search, Virtualized List.
Tabs: Radix UI / Zustand uiSlice. Saved Tab Sorting: Alpha fallback is baseline. ✨ Enhancement (ASR-235): Draggable reorder.
Component Plan:
ConversationTabs.tsx (New)
ConversationsPanel.tsx (Refactor): Wraps Tabs, search, react-virtuoso. Filtering, empty state. ✨ Enhancement (ASR-231): Use Tailwind @starting-style for empty state fade-in.
ConversationListItem.tsx (Update): Add props, indicators, CSS :hover, keyboard nav.
Tickets:
ASR-230: Build ConversationTabs + integrate Zustand uiSlice (SP: 3) - Core
ASR-231: Refactor ConversationsPanel -> react-virtuoso, search filter, empty state (SP: 8) - Core
AC: Search filter performance, Keyboard focus management.
✨ Enhancement: Empty state uses @starting-style.
ASR-232: Update ConversationListItem with presence, unread badge, keyboard nav, CSS hover (SP: 3) - Core
ASR-233: Unit + visual tests (≥ 85 % coverage delta) (SP: 2) - Core
ASR-234 (Potentially Deferrable): Design & Spec for Saved Tab Drag-and-Drop Keyboard Alternative & ARIA. (SP: TBD - Design Effort) - Supports ASR-235 if pursued.
✨ ASR-235 (Stretch Goal / Enhancement): Integrate GSAP Draggable + Inertia into Saved conversation reorder (SP: 3)
AC: Uses Draggable (type: 'y', bounds), InertiaPlugin, sets ARIA attributes. Complements keyboard alternative from ASR-234. Improves feel & fully meets WCAG 2.5.7.
2. Active Panel -  ​​asrayaos8.4/src/features/chat/components/ActiveConversationPanel.tsx  
 Overhaul: Polish & Flow
Goal: Core functionality: Refine chat view structure, ensure input works.
Tickets (Sprint 1 Focus):
✨ ASR-240 (Stretch Goal / Enhancement - Deferrable): Implement GSAP FLIP POC for incoming messages in Storybook only. (SP: 5 - For PoC)
AC: PoC captures getBoundingClientRect(). Exploratory work for future animation.
ASR-241: Refine ChatInputBar: Add placeholder icons. (SP: 3) - Core
✨ Enhancement: Investigate Tailwind field-sizing-auto.
ASR-242: Accessibility sweep: role="log", aria-live, audit focus rings (SP: 2) - Core
AC: Ensure visible focus adheres to WCAG 2.2 § 2.4.11.
✨ Enhancement: Investigate Tailwind not-* variant for focus rings.
3. Context Panel   -asrayaos8.4/src/features/chat/components/ChatContextPanel.tsx -2.0: "Insight Copilot" & Quest Actions
Goal: Core functionality: Display context (intent, insights, participants), enable quest actions.
Data Flow: Supabase Fn -> RT Channel -> Zustand -> UI. Mock endpoint critical for FE.
UI Sections: Intention, Insights, Participants, NBA, Quest Actions, Quest Acceptance.
Interaction / Motion: Desktop slide functional. Mobile drawer functional. ✨ Enhancement (ASR-236): Smoother mobile drawer motion.
Code Implementation Notes: Standardize useRealtimePresence.ts, Use supabase gen types, RLS policy critical (ASR-256).
Tickets:
ASR-250: Build contextSlice + Supabase function listener (SP: 8) - Core
ASR-251: Context panel layout structure & base style tokens (SP: 3) - Core
ASR-252: Build Participants sub-component (avatar, presence hook, role) (SP: 2) - Core
ASR-253: Build Insight list component + Basic fade-in reveal (SP: 3) - Core
✨ Enhancement: Upgrade reveal animation using GSAP SplitText for staggered "typing" effect (within same ticket SP, treat as optional polish).
ASR-254: Implement mobile drawer transition structure & basic slide (SP: 3) - Core
AC: Basic drawer functionality, gesture hooks ready.
✨ ASR-236 (Stretch Goal / Enhancement): Swap overshoot math for GSAP ScrollSmoother in mobile drawer (SP: 2)
AC: Implements ScrollSmoother.create(), uses effects, removes manual math. Improves perceived latency/smoothness on mobile.
ASR-255: Visual regression + Axe tests for Context Panel (SP: 2) - Core
✚ ASR-256 (New): Supabase RPC (accept_quest), RLS Policy, Realtime broadcast, CI PostgREST test (Backend) (SP: 3) - Core Backend - Must land by Day 7.
✚ ASR-257 (New): Quest acceptance UI section + contextSlice wiring (Frontend) (SP: 3) - Core Frontend - Depends on ASR-256.
AC: Keyboard operable buttons, CI tests.
✨ Enhancement: Apply MOTION.questAcceptShake (CustomBounce) on accept button click for haptic-like feedback.
4. Mobile-First Adaptations
Goal: Ensure seamless and intuitive mobile experience (core functionality).
Implementation: Bottom Tab Bar, Container Queries, Input Bar position. Basic transitions.
✨ Enhancement: Consider dynamic import for heavy GSAP plugins (ScrollSmoother) if used (ASR-236).
✨ Enhancement: Mobile drawer motion significantly improved by ASR-236 (ScrollSmoother).
5. Design System, Performance & Accessibility Gates
Goal: Ship high-quality, performant, accessible core product. ✨ Enhancements add polish within constraints.
Design System & Tokens: Define presence colors, necessary motion tokens (MOTION.tabSlide). ✨ Enhancement Tokens: MOTION.questAcceptShake (CustomBounce), potentially others needed for ASR-235/236. Ensure pipeline updates pass CI by Day 5.
Performance Requirements & Checks:
Lighthouse ≥ 90 (Core).
Bundle Size: Target < 425 kB GZIP. ✨ Enhancements (ASR-235, 236, SplitText) add ≈ 20-40 kB. Requires strict deep imports & potentially lazy loading to stay within budget if enhancements are included. CI check mandatory.
List virtualized. ✨ GSAP enhancements use GPU transforms, minimal runtime impact expected but requires QA on low-end devices.
Verify Tailwind v4 JIT speed.
Testing (Playwright): E2E flows. Mock GSAP in CI. ✨ Update mock for Premium plugins if enhancement tickets are implemented.
Accessibility (Axe): Zero critical issues (Core). Manual sweep mandatory. ✨ Enhancements target improved focus visibility (ASR-242 investigation) & fully compliant drag/drop (ASR-235).
6. Metrics & Success Criteria
Goal: Validate "intent-first" thesis with data (Core).
Ticket: DX-360 (Analytics): Emit core events (SP: 2) - Core
Success Metrics: Context Panel view rate, tab_switch ➜ message_sent funnel analysis (Core).
7. Timeline (Target: Two-Week Sprint Cycle - ✨ 47 SP Aspirational Total)
✨ Note: The 47 SP total represents the aspirational target including all enhancements. The core functionality constitutes roughly 37 SP (47 SP - ASR-235[3] - ASR-236[2] - ASR-240[5]). The team's primary goal is to deliver the ~37 SP of core features. The ~10 SP of enhancements (ASR-235, ASR-236, ASR-253-SplitText, ASR-240, minor polish) are explicitly designated as stretch goals and are the first candidates for deferral if velocity (~35 SP historical) is maintained, or if bundle size / QA risks emerge.
Critical Path: ASR-256 (Backend) by Day 7 remains essential for core ASR-257 (Frontend Quest UI).
✨ Day 5 Checkpoint (Mandatory):
Assess progress against core ticket burndown (~18-20 SP target by Day 5).
Review ASR-234 design spec (if pursued).
Handshake ASR-256/257. Confirm RLS readiness.
Confirm DS Token definitions/pipeline updates (core tokens mandatory).
Decision Point: Based on velocity and risk assessment (bundle size projections, initial QA feedback on any early enhancements), formally decide which enhancement tickets (ASR-235, ASR-236, ASR-240, ASR-253-SplitText) will be pursued vs. deferred for this sprint.
✨ Updated Timeline (Core focus, Enhancements marked [Stretch]):
Day
Deliverable
Focus Area
Key Tickets / Checks
1–2
Tabs, Panel Structure w/ Virtuoso - Dev & PR
Conversations Panel
ASR-230, ASR-231 (Core)
3–4
List Item Polish - Dev & PR; ✨ [Stretch] Saved Tab Drag Reorder
Conversations Panel / GSAP
ASR-232 (Core); ✨ ASR-235 [Stretch]
5
Day 5 Checkpoint (Decision on Stretch Goals); Tests Merge; Input, A11y
Gates / Active Panel
Checklist, ASR-233, ASR-241, ASR-242 (Core)
6–7
✨ [Stretch] FLIP PoC; ASR-256 Backend Merge Deadline
Active Panel / Backend
✨ ASR-240 [Stretch]; ASR-256 (Core Backend)
8–9
Context Slice/Listener, Layout, Participants; ✨ [Stretch] Drawer Motion
Context Panel / GSAP
ASR-250, ASR-251, ASR-252 (Core); ✨ ASR-236 [Stretch]
10-11
Insights List (Core fade-in ✨ + [Stretch] SplitText); Drawer Structure
Context Panel
ASR-253 (Core ✨ + [Stretch]), ASR-254 (Core)
12
Quest UI (Core ✨ + [Stretch] CustomBounce); Context Tests
Context Panel / FE / QA
ASR-257 (Core ✨ + [Stretch]), ASR-255 (Core)
13
Cross-browser QA, Axe, Lighthouse, Analytics Hookup
QA & Gates
DX-360 (Core), Bundle Check, Playwright Mock Check (update if stretch included)
14
Release Candidate Build & Merge to Main
Release Prep



Export to Sheets
8. Pre-Sprint "Go / No-Go" Checklist & Immediate Actions
✚ Final Checklist Before Sprint Start:
✅ Tickets match v2.3 plan (IDs, SP, ACs, Core vs. Stretch designation).
✅ Figma spec finalized (covers core; notes on enhanced visuals if pursued).
✅ RLS policy PR ready (by Day 5-7 latest). (Critical for Core)
✅ DS tokens defined (Core mandatory; Enhancement tokens ready if pursued). Pipeline ready.
✅ Mock context endpoint merged. (Critical for Core)
✅ Bundle-size CI check configured (425 kB). (Monitor closely if Stretch included)
✅ GSAP Premium License confirmed & setup process clear (Needed for Stretch).
✅ CI Playwright config ready (mock update needed if Stretch included).
✅ Team understands and agrees on the "Core First, Enhance Second" strategy and the deferral plan for Stretch Goals.
Immediate Actions (Pre-Sprint / Day 1):
Create/Update Tickets reflecting Core/Stretch status.
Merge mock context endpoint.
Define Core DS Tokens & ensure pipeline readiness.
Lock Design Specs (Core).
Confirm GSAP Premium Setup (if Stretch goals are initially targeted).ex