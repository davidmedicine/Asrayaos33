# 🔥 Critical bug-hunt: “First-Flame doesn’t load + UI loops”

You’re inside the Asraya OS mono-repo (see file_map).  
Symptoms in browser:

* `get-flame-status` returns **202 Processing** repeatedly; no subsequent **200** ever arrives.
* Quest list renders, but `firstFlameQuest` stays `undefined`, so **ActiveConversationPanel** never hydrates ⇒ `Cannot read properties of undefined (reading 'map')`.
* React warns **“Maximum update depth exceeded”** (useUnifiedChatPanelData line 256).
* No entries appear in Supabase Edge-Function logs even though requests show in Network tab.

### 1  Back-end (Edge Function: `get-flame-status`)
1. **Reproduce** the 202 loop with `curl` using a valid session JWT.  
   *Confirm the response body is `{processing:true}` and status 202.*
2. **Trace early-exit:** The function sets `processing:true` when `flame_progress.updated_at` is older than `STALE_MS`.  
   *Hypothesis:* `flame_progress` row is **never created** for new users, so the function always treats the record as “stale”.  
   1. In `_shared/db/firstFlame.ts` or similar, ensure `getOrCreateFirstFlameProgress()` runs during quest creation or on first ritual bootstrap.  
   2. In the 202 path the function calls `realtime-broadcast` with event `missing`; confirm that helper fires **flame_status:ready** later (check Realtime dashboard).  
3. **Logging:** add `console.log('[EF:get-flame-status] start', { user_id })` and similar `INFO` lines; ensure you return **JSON** with `Content-Type: application/json` so Supabase parses logs correctly.  :contentReference[oaicite:0]{index=0}  
4. **Return 200** after seeding day-1:  
   * If progress row is created, fetch storage object `5-day/day-1.json`, validate with `FlameDayDefinitionZ`, and include it in the 200 payload.  
   * Be sure to decode `Uint8Array` payloads from Storage — see Supabase Storage docs.  :contentReference[oaicite:1]{index=1}  

### 2  Front-end
1. **`fetchFlameStatus` (src/lib/api/quests.ts)**
   * When server replies 202 + `processing:true`, throw `ProcessingError` so React-Query retries with back-off.  :contentReference[oaicite:2]{index=2}  
   * When 200, validate `dataVersion` and update `firstFlameSlice`.
2. **React-Query options**
   * In `defaultFlameStatusQueryOptions` set  
     ```ts
     retry: (n, err) => (err as any)?.processing === true && n < 5,
     retryDelay: attempt => Math.min(1000 * 2 ** attempt, 10000),
     ```
     to poll until the ready broadcast lands.  :contentReference[oaicite:3]{index=3}
3. **Broadcast listener** (`useFlameBroadcast.ts`)
   * Listen for `flame_status:ready`; on receipt, *manually* invalidate **both** `FLAME_STATUS_QUERY_KEY` and `QUESTS_QUERY_KEY`.  
     React-Query will then fetch the fresh 200 payload and hydrate panels.
4. **`useUnifiedChatPanelData`**
   * Guard against `quests === undefined` before `.map()` to stop crash loops.  
   * Remove any `setState` calls from an effect **without** dependency arrays (fixes “maximum update depth”).  :contentReference[oaicite:4]{index=4}  
5. **Auto-select logic**
   * After `listQ` success, if `quests.find(q ⇒ q.isFirstFlameRitual)` exists, call `selectQuestSafely()`.  
   * Inside that helper, **await** `qc.fetchQuery(buildFlameStatusQueryOpts(uid))` so context panel waits until day-1 JSON is present before rendering.

### 3  Verification checklist
- [ ] `curl` to `get-flame-status` now returns **200** with day-1 JSON for a new user.
- [ ] Supabase Function logs show `EF_GET_FLAME_STATUS_SUCCESS`.  :contentReference[oaicite:5]{index=5}  
- [ ] Browser shows **First Flame** quest at top of list, chat + context panels hydrate without errors.
- [ ] No React “update depth” warnings in console.

### 4  Deliverables
1. Commit messages:
   * **edge:** fix get-flame-status stale loop + JSON headers
   * **client:** robust polling + broadcast for flame status
   * **ui:** guard quest list null-safe, stop render loop
2. PR description must reference this ticket and include BEFORE/AFTER videos.

> **Execute these steps in order, writing production-grade TypeScript/Deno code, updating Zod schemas & unit tests where needed.**

