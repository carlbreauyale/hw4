"""Pydantic types shared by the API and the PydanticAI agent."""

from typing import Literal

from pydantic import BaseModel, Field


class SizeStock(BaseModel):
    size: str = Field(description="One of XS, S, M, L, XL, XXL")
    quantity: int = Field(ge=0, description="Units on hand in this size")


class Product(BaseModel):
    """A catalogue item as shown on product cards."""

    product_id: str
    name: str
    garment_type: str
    description: str
    colors: list[str]
    search_tags: list[str]
    price: float = Field(description="Price in USD, from the catalogue table")
    image_url: str = Field(description="URL the front end can load the product photo from")
    total_stock: int = Field(ge=0, description="Units on hand across all sizes")
    available_sizes: list[str] = Field(default=[], description="Sizes with at least one unit in stock, XS..XXL")


class ProductDetail(Product):
    """A catalogue item plus its stock by size, for the single-item page."""

    sizes: list[SizeStock]


class User(BaseModel):
    """A shopper account as the API returns it. Never includes password_hash."""

    id: int
    first_name: str
    last_name: str
    email: str
    created_at: str


class SignupRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)


# ---------- Chat (website <-> FastAPI) ----------


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class PageContext(BaseModel):
    """Where the shopper is on the website when they send a message (sent by the chat widget)."""

    path: str = Field(default="/", max_length=200, description="URL path, e.g. /products/basic-hoodie-big-yale")
    product_id: str | None = Field(default=None, max_length=120, description="Set on a product page")
    category: str | None = Field(default=None, max_length=40, description="Products-page category filter, if any")


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    # Used for guests only; for logged-in shoppers the server reloads history from the database.
    history: list[ChatMessage] = Field(default=[], max_length=50)
    page: PageContext | None = None


class SavedChatMessage(BaseModel):
    """One message from a logged-in shopper's saved history (GET /api/chat/history)."""

    role: Literal["user", "assistant"]
    content: str
    products: list[Product] = Field(default=[], description="Cards shown with this reply, refreshed from the DB")
    created_at: str


ShopCategory = Literal["Hoodies", "Crewnecks", "T-shirts", "Quarter-zips", "Jackets & fleece", "Long sleeves"]


class ChatResponse(BaseModel):
    """What /api/chat returns to the website (the API contract for chat search results).

    `products` are full product cards read fresh from the DB, in the agent's order. When it is
    non-empty the front end shows them on the page in the results shelf, titled `results_title`,
    with a "See all" link to the Products page when `category` is set.
    """

    reply: str
    products: list[Product] = []
    results_title: str | None = None
    category: ShopCategory | None = None


# ---------- Agent (deps, tools and structured output) ----------


class CustomerProfile(BaseModel):
    """Who is chatting: the logged-in shopper's account fields the agent may use.
    Deliberately excludes the user id, password hash and other customers' data."""

    first_name: str
    last_name: str
    email: str
    member_since: str = Field(description="Account creation date, YYYY-MM-DD")


PageType = Literal["home", "products", "product", "about", "login", "create-account", "other"]


class CurrentPage(BaseModel):
    """The page the shopper is on, resolved and checked against the database by the backend."""

    path: str
    page_type: PageType
    product: "ProductDescription | None" = Field(
        default=None, description="The product being viewed on a product page ('this', 'it' refer to it)"
    )
    # Prefetched from the DB when the message arrives, so "this" questions need no tool call.
    price: float | None = Field(default=None, description="The viewed product's price in USD, read live")
    stock_by_size: dict[str, int] | None = Field(
        default=None, description="The viewed product's units on hand per size, read live"
    )
    category: str | None = Field(default=None, description="Category filter on the Products page")


StockStatus = Literal["in_stock", "low_stock", "sold_out"]


class ProductSummary(BaseModel):
    """One search hit: enough to pick candidates. Exact stock counts come from check_stock."""

    product_id: str = Field(description="Use this id with the other tools and in product_ids.")
    name: str
    garment_type: str
    price: float = Field(description="Price in USD from the database")
    colors: list[str]
    available_sizes: list[str] = Field(description="Sizes with at least one unit in stock, XS..XXL order")


class ProductDescription(BaseModel):
    """Result of get_product_description: what the item is and looks like, from the catalogue."""

    product_id: str
    name: str
    garment_type: str = Field(description="Catalogue garment type, e.g. 'pullover hoodie'")
    description: str = Field(description="Catalogue description; the only source for design details")
    colors: list[str] = Field(description="Colors listed in the catalogue; empty means not recorded")


class ProductPrice(BaseModel):
    """Result of get_price: the current catalogue price."""

    product_id: str
    name: str
    price: float = Field(description="Price per item in US dollars, exactly as stored")
    currency: Literal["USD"] = "USD"
    price_display: str = Field(description="Ready-to-quote price, e.g. '$68.00'")


class AlternativeMatch(BaseModel):
    """One substitute suggested by find_alternatives."""

    product_id: str
    name: str
    garment_type: str
    price: float = Field(description="Price in USD from the database")
    colors: list[str]
    available_sizes: list[str] = Field(description="Sizes in stock right now")
    why_similar: str = Field(description="Short reason it's a good substitute, e.g. 'same college (Morse), quarter-zip'")


class Alternatives(BaseModel):
    """Result of find_alternatives: in-stock substitutes for a product, best first."""

    for_product_id: str
    for_product_name: str
    size: str | None = Field(description="Normalized size the substitutes must be in stock in, if given")
    original_in_stock_in_size: bool | None = Field(
        description="Whether the original product itself is in stock in that size (None if no size given)"
    )
    alternatives: list[AlternativeMatch]


class SizeAvailability(BaseModel):
    size: str = Field(description="XS, S, M, L, XL or XXL")
    quantity: int = Field(ge=0, description="Units on hand right now")
    status: StockStatus = Field(description="sold_out = 0, low_stock = 1-3, in_stock = 4+")


class StockCheck(BaseModel):
    """Result of check_stock: live inventory for one product, optionally focused on one size."""

    product_id: str
    name: str
    requested_size: str | None = Field(description="Normalized size the shopper asked about, if any")
    requested_size_status: StockStatus | Literal["not_offered"] | None = Field(
        description="Status of the requested size; not_offered if we don't make that size"
    )
    requested_size_quantity: int | None = Field(description="Units on hand in the requested size")
    sizes: list[SizeAvailability] = Field(description="Every size we stock for this product, XS..XXL")
    in_stock_sizes: list[str]
    sold_out_sizes: list[str]
    total_quantity: int = Field(description="Units on hand across all sizes")
    summary: str = Field(description="One plain sentence stating the answer; safe to quote")
    alternatives: list[AlternativeMatch] = Field(
        default=[],
        description="Only when the requested size is sold out: up to 3 similar items in stock in that size",
    )


class ChatReply(BaseModel):
    """The agent's structured answer. The backend turns product_ids into product cards from the DB."""

    reply: str = Field(description="The message shown to the shopper, in Campus Customs voice.")
    product_ids: list[str] = Field(
        default=[],
        max_length=12,
        description=(
            "product_id values (exactly as returned by the tools) of the items to show on the page as "
            "product cards, best match first. For 'what X do you have' questions, include all relevant "
            "search matches (up to 12). Empty if no specific product is relevant."
        ),
    )
    results_title: str | None = Field(
        default=None,
        max_length=60,
        description="Short heading for the product cards on the page, e.g. 'Hoodies' or 'Navy hoodies in M'. "
        "Required when product_ids is not empty.",
    )
    category: ShopCategory | None = Field(
        default=None,
        description="The single store category the shopper is browsing, if any, so the page can link to all of it.",
    )


# ---------- Audit trail (output/audit_trail.json) ----------

AuditStopReason = Literal["tool_calls", "retry", "final_result", "usage_limit", "error"]


class AuditToolCall(BaseModel):
    """One tool the model called in a loop iteration, with a short version of what came back."""

    tool: str = Field(description="Tool name; final_result is the structured answer itself")
    args: str = Field(description="Arguments as compact JSON, shortened (max ~200 chars)")
    result: str | None = Field(default=None, description="What the tool returned, shortened (max ~200 chars)")


class AuditEntry(BaseModel):
    """One agent-loop iteration: the model's response, the tools it called, and why the step ended."""

    run_id: str = Field(description="Groups the iterations of one chat message")
    iteration: int = Field(description="1-based step within the run")
    time: str = Field(description="UTC time the step was recorded (ISO 8601)")
    shopper: str = Field(description="'guest' or 'user:<id>' (no names or emails)")
    page: str | None = Field(default=None, description="Where the shopper was, e.g. 'product:morse-1-4-zip'")
    message: str = Field(description="The shopper's message, shortened and with card numbers/emails masked")
    model: str | None = None
    tool_calls: list[AuditToolCall] = []
    input_tokens: int = 0
    output_tokens: int = 0
    finish_reason: str | None = Field(default=None, description="The model's own finish reason, if reported")
    stop_reason: AuditStopReason = Field(
        description="tool_calls / retry = loop continues; final_result = answered; usage_limit / error = stopped"
    )
    note: str | None = Field(default=None, description="Error or limit details when the run stopped early")


# CurrentPage refers to ProductDescription, which is defined after it.
CurrentPage.model_rebuild()
