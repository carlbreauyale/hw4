"""Append-only audit trail of agent-loop activity: output/audit_trail.json.

The file is one JSON list. Entries are only ever ADDED: each append writes ",<entry>]" over the
list's closing bracket, so earlier entries are never rewritten, reordered or wiped, across
runs and server restarts. If the file is ever unreadable it is moved aside (never deleted)
and a new list is started.
"""

import json
import threading
from datetime import datetime, timezone
from pathlib import Path

from models import AuditEntry

AUDIT_PATH = Path(__file__).resolve().parent.parent / "output" / "audit_trail.json"

_lock = threading.Lock()  # chats run concurrently; appends must not interleave


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def append(entry: AuditEntry, path: Path = AUDIT_PATH) -> None:
    record = json.dumps(entry.model_dump(), ensure_ascii=False)
    with _lock:
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists() or path.stat().st_size == 0:
            path.write_text(f"[\n{record}\n]\n", encoding="utf-8")
            return
        with path.open("r+b") as f:
            # Find the closing bracket at the end of the list (skipping trailing whitespace).
            f.seek(0, 2)
            pos = f.tell()
            while pos > 0:
                pos -= 1
                f.seek(pos)
                ch = f.read(1)
                if not ch.isspace():
                    break
            if ch != b"]":
                f.close()
                _set_aside(path)
                path.write_text(f"[\n{record}\n]\n", encoding="utf-8")
                return
            f.seek(pos)
            f.write(f",\n{record}\n]\n".encode("utf-8"))
            f.truncate()  # only drops the old "]\n" we just wrote past


def _set_aside(path: Path) -> None:
    backup = path.with_name(f"{path.stem}.unreadable-{datetime.now():%Y%m%d-%H%M%S}.json")
    path.replace(backup)
