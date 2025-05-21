# Deployment Notes

## Manual SQL Migrations

Run `scripts/migrate-flame-quest-id.sql` manually before enabling new FK constraints:

```bash
psql "$DATABASE_URL" -f scripts/migrate-flame-quest-id.sql
```

This converts legacy quest slug references to UUIDs in `ritual.flame_progress`.
