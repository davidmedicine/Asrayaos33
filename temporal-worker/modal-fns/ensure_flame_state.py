"""
Modal function: ensure_flame_state

A *thin* worker that guarantees the First-Flame quest skeleton exists for
a single user. Meant to be called by a Temporal Activity that needs a
fast, idempotent Supabase write.

• Uses Modal ≥ 1.0 API (`App`, `max_containers`…).
• Injects Supabase URL + service-role key from a named secret.
• Stays minimal; complex validation & Realtime broadcast live in the
  richer `update_flame_status.py` (see section 2).
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any

import modal
from supabase import create_client
from supabase.client import Client  # type hints only

# ───────────────────────── CONFIG ──────────────────────────
from modal_app.constants import FIRST_FLAME_SLUG
# ────────────────────────────────────────────────────────────

# Build an image once; supabase-py is the only heavyweight dep
image = modal.Image.debian_slim().pip_install("supabase>=2.1.0")

app = modal.App("ensure-flame-state", image=image)


# ───────────────────── helper utilities ────────────────────
def _ensure_quest(sb: Client) -> str:
    """Insert ‘First-Flame’ quest row if missing; return its ID."""
    payload = {
        "slug": FIRST_FLAME_SLUG,
        "title": "First Flame Ritual",
        "type": "ritual",
        "realm": FIRST_FLAME_SLUG,
        "is_pinned": True,
    }
    resp = (
        sb.table("quests")
        .upsert(payload, on_conflict="slug")
        .execute()
    )
    return resp.data[0]["id"]


def _ensure_participant(sb: Client, quest_id: str, user_id: str) -> None:
    sb.table("quest_participants").upsert(
        {"quest_id": quest_id, "user_id": user_id, "role": "participant"},
        on_conflict="quest_id,user_id",
    ).execute()


def _ensure_progress(sb: Client, quest_id: str, user_id: str) -> None:
    sb.table("flame_progress").upsert(
        {
            "quest_id": quest_id,
            "user_id": user_id,
            "current_day_target": 1,
            "is_quest_complete": False,
        },
        on_conflict="quest_id,user_id",
    ).execute()


# ───────────────────────── main fn ─────────────────────────
@app.function(
    timeout=120,                # more than enough for 3 upserts
    max_containers=50,          # autoscale ceiling
    secrets=[modal.Secret.from_name("supabase")],
)
def ensure_flame_state(user_id: str) -> dict[str, Any]:  # noqa: D401
    """Guarantee baseline First-Flame rows for `user_id` and return quest id."""
    t0 = time.time()
    logging.info("🔥 ensure_flame_state invoked for %s", user_id)

    sb = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    quest_id = _ensure_quest(sb)
    _ensure_participant(sb, quest_id, user_id)
    _ensure_progress(sb, quest_id, user_id)

    logging.info("✅ done in %.2fs", time.time() - t0)
    return {"quest_id": quest_id}


# Optional local entry-point for CLI experimentation
@app.local_entrypoint()
def main(user_id: str = "health-check") -> None:
    print(ensure_flame_state.remote(user_id))
