"""Campus Customs shopping agent (PydanticAI).

Wiring only: loads the system prompt from prompts/prompt.md, connects to the
model through Portkey with the OpenAI SDK, registers the tools from tools.py,
and returns a structured ChatReply (models.py). main.py calls run_chat().
"""

import json
import os
import time
import uuid
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path

os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic_ai import Agent, ModelRetry, RunContext, UsageLimits
from pydantic_ai.exceptions import UsageLimitExceeded
from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    RetryPromptPart,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.openai import OpenAIProvider

import audit
import safety
import tools
from models import (
    AuditEntry,
    AuditToolCall,
    Alternatives,
    ChatMessage,
    ChatReply,
    CurrentPage,
    CustomerProfile,
    PageContext,
    ProductDescription,
    ProductPrice,
    ProductSummary,
    StockCheck,
    User,
)

BACKEND_DIR = Path(__file__).resolve().parent
PROMPT_PATH = BACKEND_DIR / "prompts" / "prompt.md"
# .env is read from the HW4 project folder first, then its parent (the course folder).
ENV_PATHS = [BACKEND_DIR.parent / ".env", BACKEND_DIR.parent.parent / ".env"]

MODEL_NAME = "gpt-6-astra"  # default; override with PORTKEY_MODEL in .env
PORTKEY_BASE_URL = "https://api.portkey.ai/v1"  # default; override with PORTKEY_BASE_URL in .env
API_MAX_RETRIES = 2
API_TIMEOUT_S = 60

MAX_HISTORY_MESSAGES = 8  # earlier turns sent back to the model for context (was 12)
HISTORY_CHARS_PER_MESSAGE = 400  # longer past messages are cut, to save tokens on every request
METRICS_PATH = BACKEND_DIR / "logs" / "chat_metrics.jsonl"  # per-message time / tokens (git-ignored)
# Caps per chat message, so a confused model can't loop forever. Normal answers use 1-4 tool calls;
# 20 leaves room for a search plus a few per-item lookups on a 12-item result list.
USAGE_LIMITS = UsageLimits(request_limit=8, tool_calls_limit=20)

ShopAgent = Agent[tools.ShopDeps, ChatReply]

for env_path in ENV_PATHS:
    load_dotenv(env_path, override=False)


def build_model() -> OpenAIResponsesModel:
    api_key = os.getenv("PORTKEY_API_KEY")
    if not api_key:
        raise RuntimeError(f"PORTKEY_API_KEY not found in {' or '.join(map(str, ENV_PATHS))}")
    client = AsyncOpenAI(
        api_key=api_key,
        base_url=os.getenv("PORTKEY_BASE_URL", PORTKEY_BASE_URL),
        max_retries=API_MAX_RETRIES,
        timeout=API_TIMEOUT_S,
    )
    return OpenAIResponsesModel(os.getenv("PORTKEY_MODEL", MODEL_NAME), provider=OpenAIProvider(openai_client=client))


def build_agent(model: OpenAIResponsesModel) -> ShopAgent:
    agent: ShopAgent = Agent(
        model,
        deps_type=tools.ShopDeps,
        output_type=ChatReply,
        # `instructions` (not system_prompt) are sent on every request, including turns
        # that carry earlier chat history.
        instructions=PROMPT_PATH.read_text(encoding="utf-8"),
        retries=2,
        name="campus_customs_assistant",
    )

    @agent.instructions
    def shopper_context(ctx: RunContext[tools.ShopDeps]) -> str:
        """Code-built context added to the instructions on every request: who is chatting and
        which page they are looking at (from ShopDeps)."""
        return context_instructions(ctx.deps)

    @agent.tool
    def get_customer_profile(ctx: RunContext[tools.ShopDeps]) -> CustomerProfile | str:
        """Get the logged-in shopper's account details (first name, last name, email, member since).
        Returns a note if the shopper is a guest."""
        return ctx.deps.customer or "The shopper is a guest (not logged in); no account details are available."

    @agent.tool
    def get_current_page(ctx: RunContext[tools.ShopDeps]) -> CurrentPage | str:
        """Get the page the shopper is viewing right now, including the product (id, name, type,
        description, colors) when they are on a product page. Use it to resolve 'this', 'it',
        'this one' and similar references."""
        return ctx.deps.page or "The page the shopper is on is unknown."

    @agent.tool_plain
    def search_products(
        query: str = "",
        category: str | None = None,
        color: str | None = None,
        max_price: float | None = None,
        size: str | None = None,
        in_stock_only: bool = False,
    ) -> list[ProductSummary]:
        """Find products in the Campus Customs catalogue. Returns up to 12 matches with product_id, name,
        type, price, colors and which sizes are available. Use it to discover items; use check_stock for
        exact quantities.

        Args:
            query: Free-text keywords, e.g. "navy hoodie", "baseball", "Branford", "Harvard game". Empty to browse.
            category: Optional: one of Hoodies, Crewnecks, T-shirts, Quarter-zips, Jackets & fleece, Long sleeves.
            color: Optional color word that must appear in the product's colors, e.g. "navy", "gray".
            max_price: Optional highest price in USD.
            size: Optional size that must be in stock: XS, S, M, L, XL or XXL.
            in_stock_only: Only return items with at least one size in stock.
        """
        return tools.search_products(query, category, color, max_price, size, in_stock_only)

    @agent.tool_plain
    def get_product_description(product: str) -> ProductDescription:
        """Look up what a product is and looks like: garment type, catalogue description and colors.
        Call this before describing an item's design, colors or details.

        Args:
            product: The product_id from search_products, or the product's exact name.
        """
        return _lookup(tools.get_product_description, product)

    @agent.tool_plain
    def get_price(product: str) -> ProductPrice:
        """Look up the current price of a product from the database. Call this before stating any price.

        Args:
            product: The product_id from search_products, or the product's exact name.
        """
        return _lookup(tools.get_price, product)

    @agent.tool_plain
    def check_stock(product: str, size: str | None = None) -> StockCheck:
        """Look up live stock for a product: units on hand per size and whether each size is in stock,
        low (1-3 left) or sold out. Call this before saying anything about availability or quantities.

        Args:
            product: The product_id from search_products, or the product's exact name.
            size: The size the shopper asked about (XS, S, M, L, XL, XXL; words like "medium" work too).
                Leave empty to get every size.
        """
        return _lookup(tools.check_stock, product, size)

    @agent.tool_plain
    def find_alternatives(
        product: str,
        size: str | None = None,
        max_price: float | None = None,
        limit: int = 6,
    ) -> Alternatives:
        """Find in-stock substitutes for a product, most similar first (same college/sport/theme, same
        category, shared colors, similar price). Each result says why it's similar and which sizes are
        available. Use it when the shopper's size is sold out or not offered, or they ask for "something
        similar", "other options" or "what else".

        Args:
            product: The product_id (or exact name) of the item to replace.
            size: The shopper's size; results are only items in stock in that size.
            max_price: Optional highest price in USD.
            limit: How many substitutes to return (1-8, default 6).
        """
        return _lookup(tools.find_alternatives, product, size, max_price, limit)

    return agent


def context_instructions(deps: tools.ShopDeps) -> str:
    """The per-message context block the model sees (date, customer, current page)."""
    lines = ["## Current context (from the website, for this message)", f"- Today is {date.today():%A, %B %d, %Y}."]

    c = deps.customer
    if c:
        lines.append(
            f"- The shopper is logged in as **{c.first_name} {c.last_name}** (email: {c.email}, "
            f"customer since {c.member_since}). Their chat history is saved, so earlier messages may be from "
            "previous visits."
        )
    else:
        lines.append("- The shopper is a guest (not logged in). Their chat is not saved.")

    p = deps.page
    if p and p.product:
        colors = ", ".join(p.product.colors) or "not recorded"
        lines.append(
            f"- They are viewing the product page for **{p.product.name}** (product_id `{p.product.product_id}`, "
            f"{p.product.garment_type}; colors: {colors}). Words like 'this', 'it', 'this one' or 'this hoodie' "
            "refer to this product unless the shopper clearly means something else. Use this product_id with "
            "the tools."
        )
        if p.price is not None and p.stock_by_size is not None:
            stock = ", ".join(
                f"{size} {qty}" + (" (sold out)" if qty <= 0 else " (low)" if qty <= tools.LOW_STOCK else "")
                for size, qty in p.stock_by_size.items()
            )
            lines.append(
                f"- Live data for this product, read from the database for this message: price ${p.price:,.2f}; "
                f"stock by size: {stock}. You may answer price and stock questions about this product from "
                "these numbers without calling a tool."
            )
    elif p:
        where = {
            "home": "the home page",
            "products": "the Products page" + (f", filtered to {p.category}" if p.category else ""),
            "about": "the About us page",
            "login": "the Log in page",
            "create-account": "the Create account page",
        }.get(p.page_type, f"the page {p.path}")
        lines.append(f"- They are on {where}; no specific product is open.")
    return "\n".join(lines)


def _lookup(fn, *args):
    """Run a single-product lookup; an unknown product makes the model retry with a better id."""
    try:
        return fn(*args)
    except tools.ProductNotFound as exc:
        raise ModelRetry(str(exc)) from exc


@lru_cache(maxsize=1)
def get_agent() -> ShopAgent:
    """Build the agent once, on the first chat message."""
    return build_agent(build_model())


def _trim(text: str, limit: int = HISTORY_CHARS_PER_MESSAGE) -> str:
    return text if len(text) <= limit else text[:limit].rstrip() + " …"


def to_model_history(history: list[ChatMessage]) -> list[ModelMessage]:
    """Turn chat history into PydanticAI messages: only the most recent turns, each capped in length.
    Older context costs tokens on every model request, and the agent re-checks facts with tools anyway."""
    messages: list[ModelMessage] = []
    for m in history[-MAX_HISTORY_MESSAGES:]:
        if m.role == "user":
            messages.append(ModelRequest(parts=[UserPromptPart(content=_trim(m.content))]))
        else:
            messages.append(ModelResponse(parts=[TextPart(content=_trim(m.content))]))
    return messages


def _log_metrics(deps: tools.ShopDeps, result, seconds: float) -> None:
    """Append one line per chat message to logs/chat_metrics.jsonl (no message text, no personal data)."""
    usage = result.usage
    tool_names = [p.tool_name for m in result.new_messages() for p in m.parts if isinstance(p, ToolCallPart)]
    record = {
        "time": datetime.now().isoformat(timespec="seconds"),
        "logged_in": deps.customer is not None,
        "page_type": deps.page.page_type if deps.page else None,
        "seconds": round(seconds, 2),
        "requests": usage.requests,
        "tool_calls": usage.tool_calls,
        "tools": [t for t in tool_names if t != "final_result"],
        "input_tokens": usage.input_tokens,
        "cached_tokens": usage.cache_read_tokens,
        "output_tokens": usage.output_tokens,
    }
    try:
        METRICS_PATH.parent.mkdir(exist_ok=True)
        with METRICS_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    except OSError:
        pass  # metrics must never break a chat


class _LoopRecorder:
    """Writes one audit entry per agent-loop iteration to output/audit_trail.json, as it happens.

    An iteration = one model response (+ the tool calls it made). It is written once the tool
    results come back (or the run ends), with a stop reason:
    tool_calls / retry (loop continues), final_result (answered), usage_limit / error (stopped).
    """

    def __init__(self, message: str, user: User | None, deps: tools.ShopDeps):
        self.run_id = uuid.uuid4().hex[:8]
        self.iteration = 0
        self.base = {
            "run_id": self.run_id,
            "shopper": f"user:{user.id}" if user else "guest",
            "page": _page_label(deps.page),
            "message": safety.shorten(safety.redact(message), 160),
        }
        self.pending: dict | None = None  # the latest model response, waiting for its tool results

    def model_response(self, response: ModelResponse) -> None:
        self.flush("tool_calls")  # safety net; normally flushed when results arrive
        self.iteration += 1
        calls = {
            p.tool_call_id: AuditToolCall(tool=p.tool_name, args=_short(p.args_as_json_str()))
            for p in response.parts
            if isinstance(p, ToolCallPart)
        }
        self.pending = {
            "iteration": self.iteration,
            "model": response.model_name,
            "calls": calls,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "finish_reason": response.finish_reason,
        }

    def tool_results(self, request: ModelRequest) -> None:
        if not self.pending:
            return
        stop = "tool_calls"
        for part in request.parts:
            if isinstance(part, ToolReturnPart) and part.tool_call_id in self.pending["calls"]:
                self.pending["calls"][part.tool_call_id].result = _short(part.model_response_str())
            elif isinstance(part, RetryPromptPart):
                stop = "retry"
                call = self.pending["calls"].get(part.tool_call_id or "")
                if call:
                    call.result = "RETRY: " + _short(part.model_response())
        self.flush(stop)

    def finished(self, output: ChatReply) -> None:
        if self.pending:
            for call in self.pending["calls"].values():
                if call.tool == "final_result":
                    call.result = _short(f"reply: {output.reply} | products: {len(output.product_ids)}")
        self.flush("final_result")

    def stopped(self, reason: str, note: str) -> None:
        if not self.pending:  # failed before/without a model response: still record the stop
            self.iteration += 1
            self.pending = {"iteration": self.iteration, "calls": {}}
        self.flush(reason, note)

    def flush(self, stop_reason: str, note: str | None = None) -> None:
        if not self.pending:
            return
        p, self.pending = self.pending, None
        entry = AuditEntry(
            **self.base,
            iteration=p["iteration"],
            time=audit.utc_now(),
            model=p.get("model"),
            tool_calls=list(p["calls"].values()),
            input_tokens=p.get("input_tokens", 0),
            output_tokens=p.get("output_tokens", 0),
            finish_reason=p.get("finish_reason"),
            stop_reason=stop_reason,
            note=note,
        )
        try:
            audit.append(entry)
        except OSError:
            pass  # the audit must never break a chat


def _short(text: str) -> str:
    return safety.shorten(safety.redact(text), 200)


def _page_label(page: CurrentPage | None) -> str | None:
    if page is None:
        return None
    if page.product:
        return f"product:{page.product.product_id}"
    return page.page_type + (f":{page.category}" if page.category else "")


async def run_chat(
    message: str,
    history: list[ChatMessage],
    user: User | None,
    page: PageContext | None = None,
) -> ChatReply:
    deps = tools.ShopDeps(customer=tools.customer_profile(user), page=tools.resolve_page(page))
    recorder = _LoopRecorder(message, user, deps)
    agent = get_agent()
    start = time.perf_counter()
    try:
        async with agent.iter(
            message,
            message_history=to_model_history(history),
            deps=deps,
            usage_limits=USAGE_LIMITS,
        ) as run:
            async for node in run:
                if Agent.is_call_tools_node(node):
                    recorder.model_response(node.model_response)
                elif Agent.is_model_request_node(node):
                    recorder.tool_results(node.request)
            result = run.result
    except UsageLimitExceeded as exc:
        recorder.stopped("usage_limit", str(exc))
        raise
    except Exception as exc:
        recorder.stopped("error", f"{type(exc).__name__}: {safety.shorten(str(exc), 160)}")
        raise
    recorder.finished(result.output)
    _log_metrics(deps, result, time.perf_counter() - start)
    return result.output


if __name__ == "__main__":
    # Quick terminal test from the backend folder:  python agent.py "Do you have navy hoodies in M?"
    import asyncio
    import sys

    question = " ".join(sys.argv[1:]) or "What hoodies do you have under $70?"
    reply = asyncio.run(run_chat(question, [], None))
    print(reply.reply)
    print("products:", reply.product_ids)
