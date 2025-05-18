from __future__ import annotations

"""
Modal function: ensure_flame_state

A *thin* worker that guarantees the First‑Flame quest skeleton exists for
one user. Designed for Temporal Activities that need a fast, idempotent
Supabase write.

Key points
══════════
• Canonical slug (`first-flame-ritual`) enforced via FIRST_FLAME_SLUG.
• Uses Modal ≥1.0 API with autoscaling ceiling.
• Injects Supabase URL + service‑role key from a named secret.
• Explicit APIError handling with clear logging.
• Keeps logic minimal; richer validation/broadcast lives in
  `update_flame_status.py`.
"""

import logging
import os
import time
from typing import Any, Final

import modal
from postgrest.exceptions import APIError
from supabase import create_client
from supabase.client import Client  # type: hints only

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
FIRST_FLAME_SLUG: Final[str] = "first-flame-ritual"  # canonical slug

# ────────────────────────────────────

# Build an image once; supabase‑py is the only heavyweight dep
image = modal.Image.debian_slim().pip_install("supabase==2.15.1")

app = modal.App("ensure-flame-state", image=image)


# ───────── helper utilities ─────────

def _ensure_quest(sb: Client) -> str:
    """Insert *First‑Flame* quest row if missing; return its ID."""
    payload = {
        "slug": FIRST_FLAME_SLUG,
        "title": "First Flame Ritual",
        "type": "ritual",
        "realm": FIRST_FLAME_SLUG,
        "is_pinned": True,
    }
    try:
        resp = (
            sb.table("quests")
            .upsert(payload, on_conflict="slug", returning="representation")
            .execute()
        )
        return resp.data[0]["id"]
    except APIError as exc:
        logging.error("Upsert quest failed: %s", exc.message)
        raise


def _ensure_participant(sb: Client, quest_id: str, user_id: str) -> None:
    try:
        sb.table("quest_participants").upsert(
            {"quest_id": quest_id, "user_id": user_id, "role": "participant"},
            on_conflict="quest_id,user_id",
            returning="minimal",
        ).execute()
    except APIError as exc:
        logging.error("Upsert participant failed: %s", exc.message)
        raise


def _ensure_progress(sb: Client, quest_id: str, user_id: str) -> None:
    try:
        sb.table("flame_progress").upsert(
            {
                "quest_id": quest_id,
                "user_id": user_id,
                "current_day_target": 1,
                "is_quest_complete": False,
            },
            on_conflict="quest_id,user_id",
            returning="minimal",
        ).execute()
    except APIError as exc:
        logging.error("Upsert progress failed: %s", exc.message)
        raise


# ─────────── main function ──────────

@app.function(
    timeout=120,  # plenty for three simple writes
    max_containers=50,
    secrets=[modal.Secret.from_name("supabase")],
)
def ensure_flame_state(user_id: str) -> dict[str, Any]:
    """Guarantee baseline First‑Flame rows for *user_id* and return quest id."""
    start = time.time()
    logging.info("🔥 ensure_flame_state invoked for %s", user_id)

    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    quest_id = _ensure_quest(sb)
    _ensure_participant(sb, quest_id, user_id)
    _ensure_progress(sb, quest_id, user_id)

    logging.info("✅ done in %.2fs", time.time() - start)
    return {"quest_id": quest_id}


# ───────── local entry‑point ─────────

@app.local_entrypoint()
def main(user_id: str = "health-check") -> None:
    print(ensure_flame_state.remote(user_id))
