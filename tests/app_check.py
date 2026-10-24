"""Capture the app-check screenshots from the LIVE site (Problem 11).

Drives the running website (http://localhost:5173, backend on :8000) like a shopper, using
Playwright with the Microsoft Edge already installed on Windows. Saves PNG screenshots to
output/app_check_images/ and the evidence (chat replies, DB values) to evidence.json, which
output/app_check.html is written from.

Run from the HW4 folder with both servers running:
    python tests/app_check.py

Needs `pip install playwright`; no browser download is required because it uses the Microsoft Edge
already installed on Windows (channel="msedge").
"""

import json
import sqlite3
import time
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SITE = "http://localhost:5173"
OUT = ROOT / "output" / "app_check_images"
DB = ROOT / "data" / "campus_customs.db"
VIEWPORT = {"width": 1440, "height": 900}


def db_rows(sql: str, args=()) -> list[tuple]:
    with sqlite3.connect(f"file:{DB}?mode=ro", uri=True) as conn:
        return conn.execute(sql, args).fetchall()


def stock(product_id: str) -> dict[str, int]:
    order = ["XS", "S", "M", "L", "XL", "XXL"]
    rows = dict(db_rows("SELECT size, quantity FROM inventory WHERE product_id = ?", (product_id,)))
    return {s: rows[s] for s in order if s in rows}


def price(product_id: str) -> float:
    return db_rows("SELECT price FROM catalogue WHERE product_id = ?", (product_id,))[0][0]


def ask(page: Page, question: str) -> tuple[str, float]:
    """Type a question in the chat and wait for the assistant's reply."""
    if not page.is_visible(".chat-panel"):
        page.click(".chat-launcher")
    page.fill(".chat-input input", question)
    start = time.perf_counter()
    page.press(".chat-input input", "Enter")
    page.wait_for_selector(".huddle", state="attached", timeout=10_000)
    page.wait_for_selector(".huddle", state="detached", timeout=120_000)
    seconds = time.perf_counter() - start
    reply = page.locator(".chat-msg-assistant .chat-text").last.inner_text()
    return reply, round(seconds, 1)


def show_product_top(page: Page) -> None:
    """Scroll so the product page starts right under the sticky header (name, price, sizes, stock board)."""
    page.evaluate(
        """() => {
            const header = document.querySelector('.site-header').offsetHeight;
            const crumb = document.querySelector('.breadcrumb');
            window.scrollTo(0, crumb.getBoundingClientRect().top + window.scrollY - header - 12);
        }"""
    )
    page.wait_for_timeout(600)


def shot(page: Page, name: str) -> str:
    path = OUT / name
    page.screenshot(path=str(path))
    return f"app_check_images/{name}"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    evidence: dict = {"site": SITE, "captured_at": time.strftime("%Y-%m-%d %H:%M")}

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge")
        # Fresh guest session each run (no saved chat, size or theme).
        context = browser.new_context(viewport=VIEWPORT, device_scale_factor=1.25)
        page = context.new_page()

        # ---- Check 1: chat checks the inventory level of an item ----
        pid = "morse-1-4-zip"
        page.goto(f"{SITE}/products/{pid}", wait_until="networkidle")
        question = "How many of the Morse 1 4 Zip do you have left in size S, and how much is it?"
        reply, secs = ask(page, question)
        page.wait_for_timeout(3000)  # let the results-shelf animation finish
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(600)
        chat_img = shot(page, "inventory_chat.png")
        # Same product page with the chat closed: the LED stock board from the database.
        page.click(".chat-launcher")
        show_product_top(page)
        board_img = shot(page, "inventory_board.png")
        evidence["inventory"] = {
            "product_id": pid,
            "question": question,
            "reply": reply,
            "seconds": secs,
            "db_price": price(pid),
            "db_stock": stock(pid),
            "images": [chat_img, board_img],
        }

        # ---- Check 2: dynamic search-result cards after a category question ----
        page = context.new_page()
        page.goto(f"{SITE}/", wait_until="networkidle")
        question = "What hoodies do you have?"
        reply, secs = ask(page, question)
        page.wait_for_timeout(3200)
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(600)
        cards_img = shot(page, "hoodie_cards.png")
        shelf_title = page.locator(".results-head h2").inner_text()
        cards = page.locator(".results-track .result-card")
        card_names = [cards.nth(i).locator("h3").inner_text() for i in range(cards.count())]
        card_prices = [cards.nth(i).locator(".result-card-price").inner_text() for i in range(cards.count())]
        # Click a card the chat just added: it must open the single-item page.
        page.click(".chat-launcher")
        cards.nth(1).click()
        page.wait_for_selector(".detail-info h1")
        page.wait_for_timeout(1200)
        detail_img = shot(page, "hoodie_card_detail.png")
        opened = page.locator(".detail-info h1").inner_text()
        names_sql = ",".join("?" * len(card_names))
        db_cards = db_rows(
            f"SELECT name, price, garment_type FROM catalogue WHERE name IN ({names_sql})", card_names
        )
        evidence["cards"] = {
            "question": question,
            "reply": reply,
            "seconds": secs,
            "shelf_title": shelf_title,
            "cards": list(zip(card_names, card_prices)),
            "db_cards": db_cards,
            "clicked_card": card_names[1] if len(card_names) > 1 else None,
            "opened_page": opened,
            "url": page.url,
            "images": [cards_img, detail_img],
        }

        # ---- Check 3 (Problem 9, B2): sold-out size -> in-stock substitutes ----
        page = context.new_page()
        pid = "baseball-left-chest-crewneck"
        page.goto(f"{SITE}/products/{pid}", wait_until="networkidle")
        page.locator(".jersey", has_text="XL").first.click()  # the shopper picks XL (benched)
        question = "Is this available in XL?"
        reply, secs = ask(page, question)
        page.wait_for_timeout(3200)
        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(600)
        alt_img = shot(page, "alternatives.png")
        cards = page.locator(".results-track .result-card")
        alt_names = [cards.nth(i).locator("h3").inner_text() for i in range(cards.count())]
        # The product page itself: XL shown as "Benched" on the jersey picker.
        page.click(".chat-launcher")
        show_product_top(page)
        benched_img = shot(page, "alternatives_benched.png")
        alt_stock = {
            name: dict(
                db_rows(
                    "SELECT i.size, i.quantity FROM inventory i JOIN catalogue c USING (product_id) "
                    "WHERE c.name = ?",
                    (name,),
                )
            ).get("XL")
            for name in alt_names
        }
        evidence["alternatives"] = {
            "product_id": pid,
            "question": question,
            "reply": reply,
            "seconds": secs,
            "db_stock": stock(pid),
            "shelf_cards": alt_names,
            "shelf_cards_xl_stock": alt_stock,
            "images": [alt_img, benched_img],
        }

        browser.close()

    (OUT / "evidence.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    print(json.dumps(evidence, indent=2))


if __name__ == "__main__":
    main()
