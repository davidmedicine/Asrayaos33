System instructions (keep at top)

You are working inside the repo asrayaos8.4 (monorepo root: /Users/davebentley/Documents/Asrayaos16.4).

All changes must compile with pnpm dev and pass pnpm lint && pnpm typecheck.

Never introduce breaking API changes to public exports unless explicitly asked.

Follow project conventions: camelCase for hooks, PascalCase for components, snake_case for SQL/edge-fn identifiers.

When you touch React files, ensure they remain React 18 / Next-13 app-router compatible ("use client" where needed).

➊ Fix the Maximum-Update-Depth loop in useUnifiedChatPanelData.ts
Bug: Console shows “Maximum update depth exceeded” originating at line 256 of useUnifiedChatPanelData.ts; causes React 18 render storm. This is classic setState→re-render→useEffect loop. 
Stack Overflow
Stack Overflow

Root cause: The useEffect that syncs activeDescendantIndex relies on listItemData, which itself is derived from the very state mutated inside the effect; deps list is missing a stable ref or equality guard. 
Stack Overflow

Fix:

Wrap expensive arrays with useRef + shallow‐compare before calling setActiveDescendantIndex.

Add strict dependency arrays (React docs: never omit when you call setState inside effect). 
Stack Overflow

Guard setState calls so they only fire when new value !== old (use === / shallow-equality).

➋ Guard against undefined.map in Quest list
Bug: “Cannot read properties of undefined (reading 'map')” when listItemData hasn’t arrived yet. 
Reddit

Fix:

Always default to an empty array:

ts
Copy
Edit
const listItemData = filteredQuests ?? [];
In TSX, replace listItemData.map with optional chaining listItemData?.map for extra safety.

➌ Stop the search-input ↔ deferredQuery ping-pong
isPendingSearch becomes true on every keystroke and retriggers the same useEffect, feeding the depth loop.

Memoise deferredQuery with useDeferredValue once, then in the effect compare with a useRef(prev) to detect real change.

Alternatively keep a single source of truth (searchInput) and compute filteredQuests inside useMemo, no extra state needed. 
GitHub

➍ Patch the Edge Functions
A. /functions/list-quests
You already added the correct JSON Content-Type; keep that.

Make sure return json(responseBody) is executed for both GET and POST paths.

B. /functions/get-flame-status
Browser shows 500: confirm bucket/key exist (asrayaospublicbucket/5-day/day-1.json) and that storage permissions allow anon read. 
Stack Overflow

Add console.error around each Supabase call (flame_progress, flame_imprints, Storage download) so logs surface in the Supabase dashboard.

Ensure the function always ends with return json({ processing:true },202) when progress row missing; right now early return may be skipped, leaving the request hanging.

➎ Notification slice import mismatch
Import path in store.ts uses notificationSlice but file is notificationslice.ts (lower-case s).

Rename the file to notificationSlice.ts (capital S) or change all imports to the lower-case version.

Export both createNotificationSlice and useNotificationStore.

➏ Stabilise useQuestStore.setActiveQuestId
Provide a no-op fallback only in tests; in production always require the function.

Add runtime check: if (typeof setActiveQuestId !== 'function') throw new Error(...).

➐ Auto-bootstrap Day 1 after First-Flame CTA
After bootstrapFirstFlame resolves, prefetch the day-1 definition via get-flame-status (already cached in React-Query).

In the callback, set activeQuestId to the First-Flame quest only once (hasDoneInitialAutoSelect ref).

Trigger navigation:

ts
Copy
Edit
router.replace(AppRoutes.RitualDayOne);
➑ Unit & integration tests
Add Jest tests for useUnifiedChatPanelData ensuring no state updates fire when dependencies unchanged.

Create Cypress flow: login fresh user → click “Begin ritual” CTA → expect URL /first-flame/day-1 → panels render without errors.

➒ Dev-tools: flip-state cleanup
In HeroIntroScreen the GSAP hover timeline leaks on fast page swaps. Add tl.revert() on cleanup or wrap timeline in context() API. 
Reddit

➓ Runbook for the AI
Search-and-replace: useEffect( blocks without full deps list.

Refactor the 5 hotspots called out above.

Run pnpm dev & watch console - zero red lines.

Commit with message:

pgsql
Copy
Edit
fix(quests): stop infinite render loops & load Day-1 context on first login


