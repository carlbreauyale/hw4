"""Read access to data/campus_customs.db.

Prices and stock always come from here, so the website and (later) the agent
give the same answers.
"""

import json
import sqlite3
from contextlib import closing
from pathlib import Path

from models import Product, ProductDetail, SavedChatMessage, SizeStock, User

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DATA_DIR / "campus_customs.db"
IMAGES_DIR = DATA_DIR / "products"

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]

_PRODUCT_SQL = """
    SELECT c.product_id, c.name, c.garment_type, c.description, c.colors,
           c.search_tags, c.image_file_path, c.price,
           COALESCE(SUM(i.quantity), 0) AS total_stock,
           GROUP_CONCAT(CASE WHEN i.quantity > 0 THEN i.size END) AS available_sizes
    FROM catalogue c
    LEFT JOIN inventory i ON i.product_id = c.product_id
"""


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _json_list(raw: str | None) -> list[str]:
    try:
        value = json.loads(raw or "[]")
    except json.JSONDecodeError:
        return []
    return [str(v) for v in value] if isinstance(value, list) else []


def _image_url(image_file_path: str) -> str:
    # The DB stores paths like "products/basic-hoodie-big-yale.jpg" (relative to data/).
    # Only the file name is exposed; /images serves data/products and nothing else.
    return f"/images/{Path(image_file_path).name}"


def _to_product(row: sqlite3.Row) -> Product:
    return Product(
        product_id=row["product_id"],
        name=row["name"],
        garment_type=row["garment_type"],
        description=row["description"],
        colors=_json_list(row["colors"]),
        search_tags=_json_list(row["search_tags"]),
        price=row["price"],
        image_url=_image_url(row["image_file_path"]),
        total_stock=row["total_stock"],
        available_sizes=sorted(
            (row["available_sizes"] or "").split(",") if row["available_sizes"] else [],
            key=lambda size: SIZE_ORDER.index(size) if size in SIZE_ORDER else len(SIZE_ORDER),
        ),
    )


def list_products() -> list[Product]:
    with closing(connect()) as conn:
        rows = conn.execute(_PRODUCT_SQL + " GROUP BY c.product_id ORDER BY c.name").fetchall()
    return [_to_product(r) for r in rows]


def stock_by_product() -> dict[str, dict[str, int]]:
    """{product_id: {size: quantity}} for every product, sizes in XS..XXL order."""
    with closing(connect()) as conn:
        rows = conn.execute("SELECT product_id, size, quantity FROM inventory").fetchall()
    stock: dict[str, dict[str, int]] = {}
    for r in sorted(rows, key=lambda r: SIZE_ORDER.index(r["size"]) if r["size"] in SIZE_ORDER else 99):
        stock.setdefault(r["product_id"], {})[r["size"]] = r["quantity"]
    return stock


def get_products_by_ids(product_ids: list[str]) -> list[Product]:
    """Products for the given ids, in the same order; unknown ids are skipped."""
    by_id = {p.product_id: p for p in list_products()}
    seen: set[str] = set()
    result = []
    for pid in product_ids:
        if pid in by_id and pid not in seen:
            seen.add(pid)
            result.append(by_id[pid])
    return result


def get_product(product_id: str) -> ProductDetail | None:
    with closing(connect()) as conn:
        row = conn.execute(
            _PRODUCT_SQL + " WHERE c.product_id = ? GROUP BY c.product_id", (product_id,)
        ).fetchone()
        if row is None:
            return None
        stock_rows = conn.execute(
            "SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,)
        ).fetchall()

    sizes = sorted(
        (SizeStock(size=r["size"], quantity=r["quantity"]) for r in stock_rows),
        key=lambda s: SIZE_ORDER.index(s.size) if s.size in SIZE_ORDER else len(SIZE_ORDER),
    )
    return ProductDetail(**_to_product(row).model_dump(), sizes=sizes)


# ---------- Users ----------
# password_hash is only ever read inside this module and auth checks;
# the User model returned to the API leaves it out.


def _to_user(row: sqlite3.Row) -> User:
    # Older rows may only have the combined `name` column filled in.
    first, _, last = (row["name"] or "").partition(" ")
    return User(
        id=row["id"],
        first_name=row["first_name"] or first,
        last_name=row["last_name"] or last,
        email=row["email"],
        created_at=row["created_at"],
    )


def get_user(user_id: int) -> User | None:
    with closing(connect()) as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return _to_user(row) if row else None


def get_user_with_hash(email: str) -> tuple[User, str] | None:
    """For login only: the user plus their stored password hash."""
    with closing(connect()) as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE lower(email) = lower(?)", (email.strip(),)
        ).fetchone()
    return (_to_user(row), row["password_hash"]) if row else None


def email_exists(email: str) -> bool:
    with closing(connect()) as conn:
        row = conn.execute(
            "SELECT 1 FROM users WHERE lower(email) = lower(?)", (email.strip(),)
        ).fetchone()
    return row is not None


def create_user(first_name: str, last_name: str, email: str, password_hash: str) -> User:
    with closing(connect()) as conn, conn:
        cur = conn.execute(
            "INSERT INTO users (name, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
            (f"{first_name} {last_name}", email, password_hash, first_name, last_name),
        )
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    return _to_user(row)


# ---------- Chat history (chat_messages table) ----------
# One row per message for logged-in shoppers: user_id, role ('user' | 'assistant'), content,
# products_json (assistant rows: JSON list of the product cards shown, same shape as the seed
# data) and created_at. Every query is filtered by user_id, so shoppers only ever see their own.


def ensure_chat_index() -> None:
    """History is always read per user in order; index it (safe to run on every startup)."""
    with closing(connect()) as conn, conn:
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages (user_id, id)")


def save_chat_turn(user_id: int, user_text: str, reply_text: str, products: list[Product]) -> None:
    """Store the shopper's message and the assistant's reply together (one transaction)."""
    products_json = json.dumps([p.model_dump() for p in products]) if products else None
    with closing(connect()) as conn, conn:
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)", (user_id, user_text)
        )
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json) VALUES (?, 'assistant', ?, ?)",
            (user_id, reply_text, products_json),
        )


def _snapshot_ids(products_json: str | None) -> list[str]:
    """Product ids from a stored snapshot (a list of product objects)."""
    try:
        items = json.loads(products_json or "[]")
    except json.JSONDecodeError:
        return []
    return [i["product_id"] for i in items if isinstance(i, dict) and "product_id" in i] if isinstance(items, list) else []


def get_chat_history(user_id: int, limit: int = 100) -> list[SavedChatMessage]:
    """The shopper's most recent messages, oldest first. Product cards are re-read from the
    catalogue, so reloaded history shows today's prices and stock, not stale snapshots."""
    with closing(connect()) as conn:
        rows = conn.execute(
            "SELECT role, content, products_json, created_at FROM chat_messages "
            "WHERE user_id = ? AND role IN ('user', 'assistant') ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    catalogue = {p.product_id: p for p in list_products()}
    return [
        SavedChatMessage(
            role=r["role"],
            content=r["content"],
            products=[catalogue[i] for i in _snapshot_ids(r["products_json"]) if i in catalogue],
            created_at=r["created_at"],
        )
        for r in reversed(rows)
    ]


def clear_chat_history(user_id: int) -> int:
    with closing(connect()) as conn, conn:
        return conn.execute("DELETE FROM chat_messages WHERE user_id = ?", (user_id,)).rowcount
