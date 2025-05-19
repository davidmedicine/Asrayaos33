Context (do not modify):
• Next 15 (App Router) · React 19 · Zustand · TanStack Query v5
• Supabase Edge Functions (list-quests, get-flame-status) now return wrapped payloads:
{ data: <rows>, serverTimestamp: <ISO> } and { processing | dataVersion | … } respectively.
• UI error “Failed to Load Quests → Unknown error” appears even though Network tab shows HTTP 200.
• Root cause: front-end helpers still expect a bare array/object instead of the new wrapper.

🔧 Primary Objectives
Fix the contract mismatch between Edge Functions and src/lib/api/quests.ts:

fetchQuestList must unwrap res.data and surface res.error (if present) before returning.

fetchFlameStatus must tolerate { processing: true } → 202 and only set slice data when processing === false.

Ensure Day-1 (“first-flame-ritual”) quest auto-boots for a brand-new user and its messages hydrate
ActiveConversationPanel + ChatContextPanel.

Remove the phantom “Unknown error.”—UI should display the actual error string returned by the function wrapper.

Keep query keys, stale/GC times, and slice hydration in sync with unifiedChatListPanelConstants.ts.

Preserve optimistic pin/unpin & LRU logic already present in questSlice.

🛠️ Worklist for the Agent
#	File / Area	Required Action
1	src/lib/api/quests.ts	• Replace every invoke<T>('list-quests') call with logic that:
a) const res = await invoke<{ data: QuestPayloadFromServer[]; serverTimestamp: string }>(...)
b) If res?.error → throw new Error(res.error)
c) Return res.data.map(q ⇒ ({ …q, isFirstFlameRitual: q.slug === FIRST_FLAME_SLUG })).
• In fetchFlameStatus return early with { processing: true } so the slice can show a spinner instead of an error.
2	src/features/hub/components/leftpanel/useUnifiedChatPanelData.ts	• Update the useQuery(['quests'], fetchQuestList …) success handler to write serverTimestamp → questSlice.lastSynced.
3	src/lib/state/slices/firstFlameSlice.ts	• Inside ensureBootstrapped() call the new fetchFlameStatus. When it resolves with { processing: false } seed day-1 messages and set hasBootstrapped = true.
4	src/features/hub/components/ActiveConversationPanel.tsx	• useFlameBroadcast → on 'ready' event invalidate both ['flame-status'] and ['quests'] so the list order updates after day change.
5	src/features/hub/components/UnifiedChatListPanel.tsx	• Replace hard-coded string “Unknown error.” with errorDisplay?.message ?? 'Unexpected client error.'.
6	src/lib/api/quests.ts	• Add a narrow overload to invoke() that automatically infers GET when options.method is omitted and no body is provided—this prevents accidental POSTs that the Edge runtime blocks.
7	Audit	• Grep repo for list-quests and ensure every call site handles the { data, serverTimestamp } wrapper.
8	Tests	• Add jest / vitest unit for fetchQuestList that stubs the wrapped response and asserts correct array return.
9	Storybook	• Update the QuestList error story: feed { error: 'DB' } from MSW and confirm UI shows “Database error.” not “Unknown error.”

🗂️ Directories the Agent MUST Scan
swift
Copy
Edit
asrayaos8.4/src/features/hub/components/leftpanel
asrayaos8.4/src/features/hub/components/ActiveConversationPanel.tsx
asrayaos8.4/src/features/hub/components/ChatContextPanel.tsx
asrayaos8.4/src/lib/api/quests.ts
asrayaos8.4/src/lib/state/slices/firstFlameSlice.ts
asrayaos8.4/src/lib/state/slices/questslice.ts
asrayaos8.4/supabase/functions/list-quests/*
asrayaos8.4/supabase/functions/get-flame-status/*
✅ Definition of Done
Loading /hub on a fresh profile auto-shows Day-1 quest and messages.

“Failed to Load Quests” panel now surfaces exact backend error codes (AUTH, DB, STORAGE, etc.).

Subsequent visits rehydrate quest list within QUEST_QUERY_STALE_TIME (5 min) and never flash the intro spinner unnecessarily.

Live flame-status Broadcast updates reorder the quest list in real time without manual refresh.

All TypeScript types compile with strict: true.
