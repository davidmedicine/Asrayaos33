Debug-Mission Prompt for Your Local AI Engineer
Context

“First Flame” Day-1 JSON never shows up in the browser → no network get-flame-status hit, nothing in Supabase logs.

list-quests edge function does run (quest list loads).

React console is spamming “Maximum update depth exceeded” from useUnifiedChatPanelData (line 184).

See the code blocks below – pay special attention to constants and path building.

Primary Suspicion

Constant drift and missing prefix:

update_flame_status.py → _load_daydef() downloads day-1.json (no prefix) but the JSON lives under 5-day/day-1.json.

Two different First-Flame slugs: 'first_flame' vs 'first-flame-ritual'.

If _load_daydef() 404s, the Modal worker never raises, Supabase edge returns processing: true, the browser keeps polling, and the React hook loops → setState storm.

🎯 What You Need to Deliver
Root-cause analysis

Trace the call chain: UnifiedChatListPanel → bootstrapFirstFlame() → get-flame-status edge fn (stale path) → realtime broadcast 'missing' → ??? Modal invocation.

Verify that the Modal worker actually runs and that _load_daydef() succeeds. Add temporary logs if needed.

Code fixes (as Git-ready diffs)

Introduce a single-source constant DAYDEF_PREFIX = '5-day/' in update_flame_status.py and use it in _load_daydef().

Harmonize FIRST_FLAME_SLUG across Python, TS shared constants, and DB rows (first_flame ⇄ first-flame-ritual).

Ensure get-flame-status builds paths with DAYDEF_PREFIX (already correct).

React infinite render fix

Inspect useUnifiedChatPanelData effect at L 184 – likely missing a dependency array or updating state on every render.

Provide a minimal patch that memoizes the callback or guards the setState call.

Regression safety

Add unit test for _shared/5dayquest/flame-data-loader.ts that fails if the prefix drifts again.

Add try/catch + console.error around _load_daydef and broadcast an explicit 'error' event so the client can surface a toast instead of looping.

DX polish

Inject DEBUG_FLAME_LOADER=true and log storage path + HTTP status when loading JSON.

Suggest a naming/constant convention to prevent future drift (e.g. central ritual.constants.ts|py).

🚀 Tone & Quality Bar
Think like a principal engineer and a product-minded designer.

Code must compile (pnpm lint && pnpm typecheck), follow existing style (Tabs 2, ES2022, strict null checks), and keep the mystical theming intact.

Explain reasoning in concise comments only where non-obvious. Otherwise let the diff speak.

Deliver fixes + explanatory notes in one response. Feel free to propose small UX touches (e.g. toast on loader failure).

Unleash your brilliance – let’s get that First Flame igniting!
