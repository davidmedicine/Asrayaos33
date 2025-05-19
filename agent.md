• “Asraya OS” is a myth-driven quest engine: Temporal (durable workflows) ▶ Modal (AI scenes) ▶ Supabase (Edge + RLS Postgres + Realtime) ▶ Next JS front-end.
• Edge Function list-quests now compiles & returns 200 OK after we switched to withCors() and method:'GET'.
• Front-end hook useUnifiedChatPanelData() still renders nothing; First-Flame quest never appears.
• We need the left-panel (Quest list) to populate, auto-select First Flame, and flow to /first-flame/day-1.
• Stack versions: supabase-js v2.49, React 18, React-Query v5, Zustand, Next 14 (app router).

Critical clues

Network tab: list-quests ⇒ 200, body: { data:[…], serverTimestamp:"…" }

Console: no runtime errors.

UI: Unified-Chat panel blank; hero intro stuck on spinner.

Hook code-path:

useQuery(select…).map(mapQuest).filter(Boolean) discards any row where row.name, row.slug, or row.id is falsy.

mapQuest() expects name but our Edge payload currently returns title → mapped to name (OK).

Front-end still calls supabase.functions.invoke('list-quests') without the { method:'GET' } override in one legacy file.

External references (for the agent’s chain-of-thought)
• Supabase Edge Functions default to POST unless method:'GET' is specified 
Supabase

• supabase.functions.invoke signature & CORS caveats 
TanStack

• React-Query select() & placeholderData behaviour 
Supabase

• withCors helper pattern for Deno Edge FNs 
Supabase

• RLS policies can still hide rows even after upsert 
Supabase

• Deferred value & state-driven blank lists in React 18 
React

• Supabase troubleshooting 405 vs 200 mismatches 
Supabase

🛠 Tasks for you (agent)
Source-grep the entire repo for supabase.functions.invoke('list-quests'

Replace every call with

ts
Copy
Edit
await supabase.functions.invoke('list-quests', { method: 'GET' });
Confirm payload propagation

Log the resolved value of listQ.data inside useUnifiedChatPanelData.

If it’s an empty array, inspect the Edge function’s SELECT + RLS; otherwise trace why quests ends up [].

Verify RLS & participation

Check policy quests and policy quest_participants — user must be role participant.

Ensure getOrCreateFirstFlame() upsert really commits; log ff.id and query result.

Unit-test mapQuest()

Feed it a sample row from the live payload; assert it returns non-null.

Guard against missing lastMessagePreview or created_at → return sensible defaults.

Tighten the hook

Add an early console.warn if quests.length === 0 after mapping.

If quests remains empty, set uiPhase to ONBOARDING instead of forever INTRO.

Fix auto-selection

useQuestStore currently exports activeQuestId / setActiveQuestId; confirm these names match the store slice.

Make sure QuestListView receives listItemData once, then selectQuestSafely fires.

Smoke-test the navigation

Manually click First-Flame from header; ensure router pushes /first-flame/day-1.

Check get-flame-status → returns 200 & correctly shaped JSON.

Commit & PR

Add meaningful commit titles: “fix: ensure GET invoke + quest mapping”, “feat: blank-list guard to onboarding”.

Deliver the PR link plus a one-paragraph changelog.

✅ Success criteria
Quest list renders at least the First-Flame row.

Clicking (or auto-selecting) navigates to Day 1 without console errors. it should load the asrayaos8.4/supabase/functions/_shared/5dayquest/day-1.json -- that is uploaded here in the supabse = https://xdkadojhsteiecbqjgro.supabase.co/storage/v1/object/public/asrayaospublicbucket/5-day/day-1.json 
when it loads it should activate the asrayaos8.4/src/features/hub/components/ActiveConversationPanel.tsx  and - asrayaos8.4/src/features/hub/components/ChatContextPanel.tsx

Subsequent refresh returns identical state (durable).

No CORS or 405s in network tab.
