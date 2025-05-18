from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, Final

import modal
from supabase import create_client
from supabase.client import Client  # type: hints only
from postgrest.exceptions import APIError

# ────────── logging config ──────────
_LOG_LEVEL = (
    logging.DEBUG
    if os.getenv("DEBUG_FLAME_LOADER", "").lower() in {"1", "true", "yes"}
    else logging.INFO
)
logging.basicConfig(
    level=_LOG_LEVEL,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

# ──────────── constants ────────────
DAYDEF_BUCKET: Final[str] = "asrayaospublicbucket"
DAYDEF_PREFIX: Final[str] = "5-day/"  # single source of truth
FIRST_FLAME_SLUG: Final[str] = "first-flame-ritual"  # canonical slug
BROADCAST_CHANNEL: Final[str] = "flame_status"
RITUAL_SCHEMA: Final[str] = "ritual"
# ────────────────────────────────────

image = (
    modal.Image.debian_slim()
    .pip_install(
        "supabase==2.15.1",
        "postgrest==1.0.1",
        "python-dotenv",
    )
)
app = modal.App("update-flame-status", image=image)


# ───────── helper utilities ─────────

def _broadcast(
    sb: Client, *, event: str, payload: dict[str, Any]
) -> None:
    """Wrapper around the Postgres `broadcast` RPC with best‑effort failure handling."""
    try:
        sb.postgrest.rpc(
            "broadcast",
            {"channel": BROADCAST_CHANNEL, "event": event, "payload": payload},
        ).execute()
    except APIError as exc:
        logging.warning("Broadcast RPC failed: %s", exc.message)


def _broadcast_ready(
    sb: Client, user_id: str, *, event: str = "ready", detail: str | None = None
) -> None:
    payload: dict[str, Any] = {"user_id": user_id}
    if detail:
        payload["detail"] = detail
    _broadcast(sb, event=event, payload=payload)


def _ensure_quest(ritual: Client) -> str:
    """Upsert the First‑Flame ritual quest row and return its id (idempotent)."""
    res = (
        ritual.table("quests")
        .upsert(
            {
                "slug": FIRST_FLAME_SLUG,
                "title": "First Flame Ritual",
                "type": "ritual",
                "realm": FIRST_FLAME_SLUG,
                "is_pinned": True,
            },
            on_conflict="slug",
            returning="representation",
        )
        .execute()
    )
    return res.data[0]["id"]


def _load_daydef(sb: Client, *, user_id: str, day: int = 1) -> Any:
    """Download and validate `5-day/day-<n>.json` from Supabase Storage."""
    key = f"{DAYDEF_PREFIX}day-{day}.json"
    try:
        logging.debug("Downloading %s from bucket %s", key, DAYDEF_BUCKET)
        blob = sb.storage.from_(DAYDEF_BUCKET).download(key)
        data = json.loads(blob.decode())
        if not data.get("prompts"):
            raise ValueError("Day-definition JSON missing 'prompts' array")
        return data
    except APIError as exc:
        logging.error("Supabase API error (%s) while loading %s", exc.code, key)
        _broadcast_ready(sb, user_id, event="error", detail=exc.message)
        raise
    except Exception as exc:  # fallback catch‑all
        logging.exception("Failed to load %s", key)
        _broadcast_ready(sb, user_id, event="error", detail=str(exc))
        raise


# ─────────── main worker ───────────

@app.function(
    timeout=600,
    retries=2,
    min_containers=1,
    secrets=[modal.Secret.from_name("supabase")],
)
def update_flame_status(user_id: str) -> None:
    """Seed / refresh First‑Flame data for *user_id* and notify the UI."""
    start = time.time()
    logging.info("⚙️  Seeding First‑Flame ritual for %s …", user_id)

    sb = create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    )
    ritual = sb.schema(RITUAL_SCHEMA)

    # 1. Ensure quest exists
    quest_id = _ensure_quest(ritual)

    # 2. Ensure participant imprint row exists via RPC
    try:
        imprint_id: str = (
            ritual.rpc(
                "ensure_first_flame", {"_quest_id": quest_id, "_user_id": user_id}
            )
            .execute()
            .data
        )
        logging.debug("🆔  imprint_id = %s", imprint_id)
    except APIError as exc:
        logging.exception("ensure_first_flame RPC failed")
        _broadcast_ready(sb, user_id, event="error", detail=exc.message)
        raise RuntimeError(exc.message) from exc

    # 3. Validate Day‑1 definition
    _load_daydef(sb, user_id=user_id, day=1)

    # 4. Victory — tell the frontend it can refetch
    _broadcast_ready(sb, user_id, event="ready")

    logging.info("✅  Completed in %.2fs", time.time() - start)


# ───────── local smoke‑test ─────────

@app.local_entrypoint()
def main(user_id: str = "00000000-0000-0000-0000-000000000000") -> None:
    """Run locally with:

        modal run modal_app/update_flame_status.py --user-id <YOUR_UUID>
    """
    update_flame_status.remote(user_id)
