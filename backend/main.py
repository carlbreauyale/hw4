"""Campus Customs API (FastAPI).

- Catalogue, stock by size and product images for the React front end.
- Create account / log in / log out with hashed passwords (auth.py).
- /api/chat: the shop chatbot, a PydanticAI agent (agent.py, tools.py,
  prompts/prompt.md, models.py).

Run from the backend folder:
    uvicorn main:app --reload --port 8000
"""

import logging
import re

from fastapi import Cookie, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic_ai.exceptions import UsageLimitExceeded

import agent
import auth
import db
import safety
from models import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    LoginRequest,
    Product,
    ProductDetail,
    SavedChatMessage,
    SignupRequest,
    User,
)

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

logger = logging.getLogger("campus_customs")

app = FastAPI(title="Campus Customs API")

db.ensure_chat_index()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Product photos only; the database file in data/ is never exposed.
app.mount("/images", StaticFiles(directory=db.IMAGES_DIR), name="images")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/products")
def products() -> list[Product]:
    return db.list_products()


@app.get("/api/products/{product_id}")
def product(product_id: str) -> ProductDetail:
    item = db.get_product(product_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return item


# ---------- Accounts ----------


def _start_session(response: Response, user: User) -> None:
    response.set_cookie(
        auth.SESSION_COOKIE,
        auth.create_session_token(user.id),
        max_age=auth.SESSION_TTL_SECONDS,
        httponly=True,  # page JavaScript can't read the token
        samesite="lax",
        # secure=True once the site is served over HTTPS
    )


def current_user(token: str | None) -> User | None:
    user_id = auth.read_session_token(token)
    return db.get_user(user_id) if user_id is not None else None


@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, response: Response) -> User:
    email = body.email.strip().lower()
    first_name, last_name = body.first_name.strip(), body.last_name.strip()
    if not first_name or not last_name:
        raise HTTPException(status_code=422, detail="Please enter your first and last name.")
    if not EMAIL_PATTERN.match(email):
        raise HTTPException(status_code=422, detail="Please enter a valid email address.")
    if db.email_exists(email):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Try logging in.")

    user = db.create_user(first_name, last_name, email, auth.hash_password(body.password))
    _start_session(response, user)
    return user


@app.post("/api/auth/login")
def login(body: LoginRequest, request: Request, response: Response) -> User:
    email = body.email.strip().lower()
    throttle_key = f"{email}|{request.client.host if request.client else ''}"
    if auth.too_many_failures(throttle_key):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Please wait 15 minutes and try again.")

    found = db.get_user_with_hash(email)
    if not auth.verify_password_or_dummy(body.password, found[1] if found else None):
        auth.record_failure(throttle_key)
        # Same message whether the email or the password was wrong.
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    auth.clear_failures(throttle_key)
    user = found[0]
    _start_session(response, user)
    return user


@app.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(auth.SESSION_COOKIE, httponly=True, samesite="lax")


@app.get("/api/auth/me")
def me(cc_session: str | None = Cookie(default=None)) -> User | None:
    """The logged-in shopper, or null when nobody is logged in."""
    return current_user(cc_session)


# ---------- Chat ----------


CHAT_HISTORY_FOR_MODEL = agent.MAX_HISTORY_MESSAGES  # most recent saved messages sent back to the agent
CHAT_HISTORY_FOR_PAGE = 100  # most recent saved messages shown when the shopper returns


@app.post("/api/chat")
async def chat(body: ChatRequest, cc_session: str | None = Cookie(default=None)) -> ChatResponse:
    """Send the shopper's message to the agent and return its reply with product cards.

    - Logged in: history comes from the chat_messages table (not from the browser), and the new
      message + reply are saved there afterwards.
    - Guest: history comes from the browser for this visit only; nothing is saved.
    - `page` tells the agent which page/product the shopper is looking at.
    Prices and stock on the cards are read fresh from the database.
    """
    user = current_user(cc_session)
    if user:
        saved = db.get_chat_history(user.id, limit=CHAT_HISTORY_FOR_MODEL)
        history = [ChatMessage(role=m.role, content=m.content) for m in saved]
    else:
        history = body.history

    try:
        reply = await agent.run_chat(body.message, history, user, body.page)
        products = db.get_products_by_ids(reply.product_ids)
        response = ChatResponse(
            reply=reply.reply,
            products=products,
            results_title=(reply.results_title or "Matching items") if products else None,
            category=reply.category if products else None,
        )
    except UsageLimitExceeded:
        # The agent needed more lookups than one message allows (agent.USAGE_LIMITS). The store
        # is fine, so ask the shopper to narrow the question instead of reporting an outage.
        logger.warning("Chat hit usage limits for message: %r", body.message[:200])
        response = ChatResponse(
            reply=(
                "That one needs more lookups than I can do in a single answer. Could you narrow it down, "
                "for example to one product, or add a color, size or price range?"
            )
        )
    except Exception:
        logger.exception("Chat agent failed")
        raise HTTPException(
            status_code=503,
            detail="Our assistant is having trouble right now. Please try again in a moment.",
        )

    if user:
        # Never store payment-card numbers a shopper might paste into the chat.
        db.save_chat_turn(user.id, safety.mask_cards(body.message), response.reply, response.products)
    return response


@app.get("/api/chat/history")
def chat_history(cc_session: str | None = Cookie(default=None)) -> list[SavedChatMessage]:
    """The logged-in shopper's saved conversation (oldest first); empty for guests."""
    user = current_user(cc_session)
    return db.get_chat_history(user.id, limit=CHAT_HISTORY_FOR_PAGE) if user else []


@app.delete("/api/chat/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_chat_history(cc_session: str | None = Cookie(default=None)) -> None:
    """Start a new conversation: delete the logged-in shopper's saved messages."""
    user = current_user(cc_session)
    if user is None:
        raise HTTPException(status_code=401, detail="Log in to manage saved chats.")
    db.clear_chat_history(user.id)
