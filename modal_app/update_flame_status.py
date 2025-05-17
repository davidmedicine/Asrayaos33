# ─────────── update_flame_status.py  (2025-05-17) ───────────
from __future__ import annotations
import json, logging, os, time
from typing import Any, Final

import modal
from supabase import create_client
from supabase.client import Client

# ──────────────── CONSTANTS ────────────────
DAYDEF_BUCKET:     Final[str] = "asrayaospublicbucket"
FIRST_FLAME_SLUG:  Final[str] = "first_flame"
BROADCAST_CHANNEL: Final[str] = "flame_status"
RITUAL_SCHEMA:     Final[str] = "ritual"
# ────────────────────────────────────────────

image = (
    modal.Image.debian_slim()
    .pip_install(
        "supabase==2.15.1",        # lock versions ↔ server
        "postgrest==1.0.1",
        "python-dotenv",
    )
)
app = modal.App("update-flame-status", image=image)

# ─────────── helper blocks ───────────
def _ensure_quest(ritual: Client) -> str:
    """Idempotently upsert the First-Flame quest and return its id."""
    res = (
        ritual.table("quests")
        .upsert(
            {
                "slug":  FIRST_FLAME_SLUG,
                "title": "First Flame Ritual",
                "type":  "ritual",
                "realm": FIRST_FLAME_SLUG,
                "is_pinned": True,
            },
            on_conflict="slug",
            returning="representation",
        )
        .execute()
    )
    return res.data[0]["id"]


def _load_daydef(sb: Client, *, day: int = 1) -> Any:
    """Fetch `day-<n>.json` from storage and confirm it has prompts."""
    raw = sb.storage.from_(DAYDEF_BUCKET).download(f"day-{day}.json")
    data = json.loads(raw.decode())
    if not data.get("prompts"):
        raise ValueError("Day-definition JSON missing ‘prompts’ array")
    return data


def _broadcast_ready(sb: Client, user_id: str) -> None:
    """Emit realtime event so the browser refetches."""
    sb.postgrest.rpc(
        "broadcast",
        {
            "channel": BROADCAST_CHANNEL,
            "event":   "ready",
            "payload": {"user_id": user_id},
        },
    ).execute()

# ─────────────── main worker ───────────────
@app.function(
    timeout=600,
    retries=2,
    min_containers=1,
    secrets=[modal.Secret.from_name("supabase")],
)
def update_flame_status(user_id: str) -> None:
    """
    Seed / refresh First-Flame data for `user_id`.

    1.  Ensure quest row exists  
    2.  Call `ritual.ensure_first_flame()` (DB does the heavy lifting)  
    3.  Verify day-definition file exists  
    4.  Broadcast `flame_status:ready`
    """
    t0 = time.time()
    logging.info("⚙️  seeding First-Flame for %s …", user_id)

    sb       = create_client(os.environ["SUPABASE_URL"],
                             os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    ritual   = sb.schema(RITUAL_SCHEMA)          # ← work inside ‘ritual’

    quest_id = _ensure_quest(ritual)

    # DB function returns the fresh imprint_id (uuid text)
    rpc = (
        ritual.rpc(
            "ensure_first_flame",
            {"_quest_id": quest_id, "_user_id": user_id},
        )
        .execute()
    )
    if rpc.error:
        raise RuntimeError(rpc.error)
    imprint_id: str = rpc.data
    logging.info("🆔  imprint_id = %s", imprint_id)

    _load_daydef(sb, day=1)
    _broadcast_ready(sb, user_id)

    logging.info("✅ finished in %.2fs", time.time() - t0)

# ────────── local smoke-test ──────────
@app.local_entrypoint()
def main(user_id: str = "health-check") -> None:
    """
    modal run modal_app/update_flame_status.py --user-id YOUR_UUID
    """
    update_flame_status.remote(user_id)
