# ─────────── update_flame_status.py  (2025-05-17) ───────────
from __future__ import annotations

import json, logging, os, time
from typing import Any, Final

import modal
from supabase import create_client
from supabase.client import Client                            # type-hints only
from postgrest.exceptions import APIError                     # ← catch Rpc errors

# ─────── constants ───────
DAYDEF_BUCKET:     Final[str] = "asrayaospublicbucket"
FIRST_FLAME_SLUG:  Final[str] = "first_flame"
BROADCAST_CHANNEL: Final[str] = "flame_status"
RITUAL_SCHEMA:     Final[str] = "ritual"
# ─────────────────────────

image = (
    modal.Image.debian_slim()
    .pip_install(
        "supabase==2.15.1",
        "postgrest==1.0.1",
        "python-dotenv",
    )
)
app = modal.App("update-flame-status", image=image)

# ───── helper blocks ─────
def _ensure_quest(ritual: Client) -> str:
    """Upsert First-Flame quest row and return its id (idempotent)."""
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
    """Download `day-<n>.json` from Storage and sanity-check it."""
    blob = sb.storage.from_(DAYDEF_BUCKET).download(f"day-{day}.json")
    data = json.loads(blob.decode())
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

# ───── main worker ─────
@app.function(
    timeout=600,
    retries=2,
    min_containers=1,
    secrets=[modal.Secret.from_name("supabase")],
)
def update_flame_status(user_id: str) -> None:
    """
    Idempotently seed / refresh First-Flame data for *user_id*.

    Requires the Postgres helper function:

        ritual.ensure_first_flame(_quest_id uuid, _user_id uuid) RETURNS uuid
    """
    t0 = time.time()
    logging.info("⚙️  Seeding First-Flame for %s …", user_id)

    sb     = create_client(os.environ["SUPABASE_URL"],
                           os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    ritual = sb.schema(RITUAL_SCHEMA)

    quest_id = _ensure_quest(ritual)

    # Call the DB helper; let the client raise APIError on failure
    try:
        imprint_id: str = (
            ritual.rpc(
                "ensure_first_flame",
                {"_quest_id": quest_id, "_user_id": user_id},
            )
            .execute()
            .data          # SingleAPIResponse.data → UUID text
        )
    except APIError as exc:
        logging.exception("ensure_first_flame RPC failed")
        raise RuntimeError(exc.message) from exc   # surface cleanly in Modal logs

    logging.info("🆔  imprint_id = %s", imprint_id)

    _load_daydef(sb, day=1)
    _broadcast_ready(sb, user_id)

    logging.info("✅  Finished in %.2fs", time.time() - t0)

# ─── local smoke-test ───
@app.local_entrypoint()
def main(user_id: str = "00000000-0000-0000-0000-000000000000") -> None:
    """
    Run locally with:

        modal run modal_app/update_flame_status.py --user-id <YOUR_UUID>
    """
    update_flame_status.remote(user_id)
