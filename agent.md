# 🔥 First-Flame Debug Mission (v3) — Full-Context

## What’s still broken
1. **React warning**  
   *Max update depth exceeded* still fires from  
   `src/features/hub/components/leftpanel/useUnifiedChatPanelData.ts`  
   (second `useEffect`, currently ~L215 in the latest commit).

2. **No network traffic**  
   The browser never calls **/functions/get-flame-status** → nothing hits Supabase logs.

3. UX: the user gets an infinite spinner instead of a toast when Day-1 JSON fails.

---

## Repository context  
/src/features/hub/components/leftpanel
├── HeroIntroScreen.tsx ← begins ritual
├── UnifiedChatListPanel.tsx ← orchestrator
├── useUnifiedChatPanelData.ts ← data + state (bug lives here)
├── QuestListView.tsx / QuestListItem.tsx / QuestRow.tsx
└── unifiedChatListPanelConstants.ts ← FIRST_FLAME_RITUAL_SLUG, etc.

yaml
Copy
Edit

Edge function:  
`supabase/functions/get-flame-status/index.ts`

Modal worker (storage loader):  
`modal_app/update_flame_status.py`

Constants are now single-sourced and correct:  
`FIRST_FLAME_SLUG = 'first-flame-ritual'` and `DAYDEF_PREFIX = '5-day/'`.

---

## Deliverables
### 1  Stop the React render loop
**File:** `useUnifiedChatPanelData.ts`

* Replace the effect that does  
  `setUiPhase(listQ.data.length …)` (≈ L215) with a **memoised+guarded** version:

```ts
const nextPhase = useMemo(() => {
  if (listQ.isPending || isLoadingAuth) return UIPanelPhase.INTRO;
  if (listQ.isError && !(listQ.error instanceof SilentError))
    return UIPanelPhase.ERROR;
  if (!listQ.data) return uiPhase;        // <- no change
  return listQ.data.length ? UIPanelPhase.NORMAL : UIPanelPhase.ONBOARDING;
}, [
  listQ.isPending, listQ.isError, listQ.data,
  isLoadingAuth, uiPhase,
]);

useEffect(() => {
  if (nextPhase !== uiPhase) setUiPhase(nextPhase);
}, [nextPhase, uiPhase]);
Add a Jest test (useUnifiedChatPanelData.test.ts) that mounts the hook with
@testing-library/react-hooks, renders two times, and asserts no console.error.

2 Wire bootstrapFirstFlame() → Temporal → Edge Function
Files & tasks

Location	Change
useUnifiedChatPanelData.ts	Add a bootstrapFirstFlame callback that:
⚙️ invokes the Temporal Workflow seedFirstFlame (activity proxies already exist)
⚙️ then calls supabase.functions.invoke('get-flame-status') and updates React-Query cache (qc.setQueryData)
Return it from the hook and prop-drill as shown below.	
UnifiedChatListPanel.tsx	Already receives bootstrapFirstFlame – good.
HeroIntroScreen.tsx	Prop name mismatch: change onBeginFirstFlame → onSelectFirstFlame (or update caller) so click handler compiles.

Acceptance: In DevTools → Network, a GET to …/functions/v1/get-flame-status appears and returns 200 (or 202 processing).

3 Graceful error broadcast + UI toast
modal_app/update_flame_status.py already broadcasts event="error".

In the client, subscribe once to flame_status:error (Zustand slice or React effect) and show toast.error('First-Flame loader failed') instead of spinning forever.

4 CORS & logging hardening
In get-flame-status/index.ts add:

ts
Copy
Edit
console.log('[EF] get-flame-status', { user: user?.id ?? 'anon', fresh: isFresh });
Keep the existing CORS headers; test with:

bash
Copy
Edit
curl -i -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  "https://<project>.functions.supabase.co/get-flame-status"
Expect 200 + the Access-Control-* headers.

5 Regression Tests
Unit test supabase/functions/_shared/5dayquest/flame-data-loader.ts
await expect(loadValidateAndCacheDayDef(1)).resolves.toHaveProperty('ritualDay', 1);

Add this to the Vercel CI job so constant drift breaks the build.

6 DX / Git hygiene
Daily: git pull --rebase origin main

Feature: git switch -c fix/first-flame-v3

Local checks: pnpm lint && pnpm test && pnpm typecheck

git push -u origin HEAD → open PR “fix: React loop + flame bootstrap”

Merge only when Vercel + Jest are green.

Acceptance checklist
 No “update depth exceeded” in console.

 get-flame-status shows in Network panel and Supabase logs.

 On loader failure, user sees a toast—not an infinite spinner.

 pnpm test and pnpm typecheck pass.

 CI green; PR merged into main.

Let’s ignite that First Flame—no more infinite loops or invisible requests!
