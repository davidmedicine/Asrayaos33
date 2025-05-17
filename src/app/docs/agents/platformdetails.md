p# Asraya OS - System Scope (Derived from v1.16 Plan)

## 1. System Purpose & High-Level Goal

Asraya OS is a web-based, personalized operating system interface designed for user interaction with multiple AI agents (e.g., Oracle, Muse). It provides a dynamic, modular workspace organized around different functional "contexts" (like Dashboard, Chat, World, Tasks, Settings), aiming to facilitate AI-driven reflection, task management, creative exploration, and knowledge interaction within a unified environment.

## 2. Core Concepts

*   **Agents:** Distinct AI personas (defined in `agentRegistry.ts`) with unique capabilities, tones, and visual themes that influence the UI and interaction possibilities.
*   **Contexts:** Different application views or states (e.g., `dashboard`, `chat`, `world`) that determine the active UI layout, available panels, and relevant commands. Defined in `layoutRegistry.ts`.
*   **Panel System:** The primary UI structure. A dynamic, resizable grid (`PanelGroup.tsx` using `react-resizable-panels`) displays modular UI components (`Panel.tsx` wrappers rendering feature components from `src/features/...`) based on the current context's layout definition. Panels are registered in `panelRegistry.ts`.
*   **Commands:** Context-aware actions triggerable by the user, primarily through a command menu (`CommandMenu.tsx` using `cmdk`), defined in `commandRegistry.ts` and gated by `permissions.ts`.
*   **Layouts:** Definitions (`layoutRegistry.ts`) specifying panel arrangements, directions, sizes, and other metadata for each context.
*   **State:** Centralized client-side state managed via Zustand (`lib/state/store.ts`), organized using the slice pattern (`lib/state/slices/`).
*   **AI Interaction (A2A Model):** The frontend acts as an **A2A (Agent-to-Agent) Client**. It assumes interaction with one or more backend **A2A Remote Agents** (potentially built with LangGraph, Agno, or similar frameworks) exposing an A2A interface. The frontend consumes backend Tasks, streams `Part` updates (including thinking traces and final messages via Server-Sent Events), and handles AI-driven `Directives` (`actionDirectiveHandler.ts`) to perform actions.
*   **Theming:** Dynamic UI themes driven by the `activeAgentId` (managed in `agentSlice.ts`). `ClientThemeWrapper.tsx` applies theme classes (`.theme-oracle`, etc.) to the root HTML element, and components use CSS variables (`--agent-color-primary`, etc.) defined in `styles/globals.css` for styling.
*   **Quests:** A specialized type of `Conversation` representing goal-oriented interactions, potentially linked to backend A2A Tasks (`a2aTaskId`). Quests have defined goals, milestones, progress tracking, and are integrated within the unified Chat context.
*   **Persistence:** Client-side state (e.g., drafts, command history) uses `localStorage`. Server-side state (user settings, layout preferences, pinned items, notifications, potentially core chat/quest data) is persisted in a Supabase Postgres database, accessed primarily via Next.js Server Actions.

## 3. Key Features & Functionality Scope

*   **Dynamic Panel Workspace:** Users can interact with different application contexts, each presenting a unique, potentially user-resizable arrangement of functional panels (Chat Lists, Active Conversations, World Views, Task Boards, Settings Forms, Contextual Info).
*   **Unified Chat & Quest Interface:** The primary interaction point (`asraya:chat:unified` context) integrates standard chat conversations and goal-oriented Quests within the same panel layout.
    *   Displays chat messages (`ChatMessage`) and Quest details.
    *   Supports group chats (multiple participants).
    *   Renders inline "Thinking Traces" (`ThinkingTraceMessage`) from backend AI Tasks, visually distinct from final messages and attributed to the correct agent (using `A2AMetadata`).
    *   Includes stubs/placeholders for real-time user presence indicators (online, away, typing).
    *   Features a contextual panel (`ChatContextPanel`) displaying metadata, Quest progress (`QuestProgressMeter`), and suggested actions (`SuggestedActions`).
*   **Command Menu:** A searchable command palette (`Cmd+K`) offering context-aware actions.
*   **Agent Switching & Theming:** Users can switch the active AI agent (e.g., via `Topbar`), dynamically changing the application's visual theme and potentially influencing available commands or suggestions.
*   **AI Directive Handling:** The frontend can receive and execute commands from the AI backend (e.g., create an artifact, show a notification, execute a command).
*   **Settings Management:** Users can configure appearance, interaction preferences, notification settings, and potentially agent-specific overrides.
*   **Onboarding Flow:** A multi-step process to introduce users to the system and gather initial preferences (OS name, intention).
*   **(Placeholder) World View:** A context intended for spatial visualization (details TBD).
*   **(Placeholder) Task Management:** A context intended for task tracking (details TBD).
*   **Notifications & Toasts:** System for displaying transient (`Toast`) and persistent (`Notification`) messages to the user.

## 4. Architecture & Technology Summary

*   **Frontend Framework:** Next.js 14+ (App Router) using React 18+ and TypeScript 5+.
*   **Frontend Architecture:**
    *   **Routing/Layout:** App Router with Route Groups (`(main)`, `(onboarding)`). `app/layout.tsx` (root), `app/(main)/layout.tsx` (main app structure with `PanelGroup`), `app/(onboarding)/layout.tsx`.
    *   **Component Structure:** `app` (routing), `components` (shared UI), `features` (panel implementations), `hooks`, `lib` (core logic, state, utils), `server` (Server Actions), `types`.
    *   **State Management:** Zustand with slice pattern (`lib/state/`).
    *   **Styling:** Tailwind CSS v4.0 with CSS Variables for theming.
    *   **Animation:** GSAP Premium (`@gsap/react`) and Framer Motion.
*   **Backend Interaction Model:**
    *   **Primary AI Comms:** Acts as A2A Client consuming SSE streams and sending requests to an assumed external A2A Remote Agent backend.
    *   **Persistence/Data:** Next.js Server Actions interact with Supabase.
    *   **Real-time:** Intention to use Supabase Realtime (Broadcast for messages, Presence for user status) via database triggers and client subscriptions.
*   **Backend Platform:** Supabase (Postgres DB with Drizzle ORM, Auth, Realtime, Storage). Potential for Supabase Edge Functions.
*   **Key Libraries:** `react-resizable-panels`, `cmdk`, `lucide-react`, `clsx`, `tailwind-merge`, `nanoid`.

## 5. Non-Functional Requirements Scope

*   **Accessibility:** Target WCAG standards (semantic HTML, ARIA, keyboard navigation, focus management). Manual testing is required.
*   **Responsiveness:** Mobile-first design mandatory. Use responsive Tailwind classes, `@container` queries. Ensure adequate touch targets. Specific mobile adaptations for chat layout (sticky input, collapsed elements).
*   **Animation:** Use GSAP/Framer Motion selectively, respecting `prefers-reduced-motion`.
*   **Persistence Strategy:** Defined mix of `localStorage` (client UI state) and Supabase via Server Actions (server state).
*   **Testing:** Unit, Integration, and E2E tests are planned (implementation deferred) covering components, state, realtime, A2A flows, accessibility, and responsiveness.