"""Small code-level safety helpers (the agent's behavioural rules live in prompts/prompt.md).

redact() masks payment-card-like numbers and email addresses so they are never written to
logs. mask_cards() is used before saving chat history: if a shopper pastes a card number
into the chat, it is not stored in the database.
"""

import re

# 13-19 digits, optionally separated by spaces or dashes (credit/debit card shapes).
_CARD = re.compile(r"\b(?:\d[ -]?){12,18}\d\b")
_EMAIL = re.compile(r"\b([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b")


def mask_cards(text: str) -> str:
    return _CARD.sub("[card number removed]", text)


def redact(text: str) -> str:
    """For logs: no card numbers, and emails shortened to 't***@domain'."""
    return _EMAIL.sub(lambda m: f"{m.group(1)}***@{m.group(2)}", mask_cards(text))


def shorten(text: str, limit: int = 200) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"
