pnpm supa:serve
pnpm dev:temporal              # pane ① – Edge Functions
cd temporal-worker
export TEMPORAL_ADDRESS=localhost:7233
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhka2Fkb2poc3RlaWVjYnFqZ3JvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTY0ODM1MiwiZXhwIjoyMDQ1MjI0MzUyfQ.MyulC4tRhJmr-gFvDfz7u6Z0z9HGvZogUX72KpMeFew
pnpm exec ts-node src/worker.ts   # pane ② – worker
temporal workflow start ...       # pane ③ – trigger
pnpm dev                          # pane ④ – Next.js
