"""Tools the Campus Customs agent can call.

Every price and stock number the agent quotes comes from these functions,
which read data/campus_customs.db through db.py. The agent registers them in
agent.py; this file holds the logic so it can be tested without a model.
"""

import math
import re
from dataclasses import dataclass

import db
from models import (
    AlternativeMatch,
    Alternatives,
    CurrentPage,
    CustomerProfile,
    PageContext,
    PageType,
    Product,
    ProductDescription,
    ProductDetail,
    ProductPrice,
    ProductSummary,
    SizeAvailability,
    StockCheck,
    StockStatus,
    User,
)

SIZES = db.SIZE_ORDER
MAX_RESULTS = 12  # enough to fill the page's results shelf for "what X do you have?"
LOW_STOCK = 3  # 1-3 units left counts as low stock (same threshold as the website)

# Ways shoppers name sizes -> the size codes stored in the inventory table.
SIZE_ALIASES = {
    "xs": "XS", "extra small": "XS", "x-small": "XS", "xsmall": "XS",
    "s": "S", "small": "S", "sm": "S",
    "m": "M", "medium": "M", "med": "M",
    "l": "L", "large": "L", "lg": "L",
    "xl": "XL", "extra large": "XL", "x-large": "XL", "xlarge": "XL", "1xl": "XL",
    "xxl": "XXL", "2xl": "XXL", "xx-large": "XXL", "xxlarge": "XXL", "extra extra large": "XXL",
    "double xl": "XXL",
}

# Same shopper-friendly grouping as the website's category chips (frontend/src/categories.ts).
CATEGORIES = ["Hoodies", "Crewnecks", "T-shirts", "Quarter-zips", "Jackets & fleece", "Long sleeves"]

# Words shoppers use -> words that appear in the catalogue.
SYNONYMS = {
    "tee": "t-shirt",
    "tees": "t-shirt",
    "tshirt": "t-shirt",
    "hoody": "hoodie",
    "hooded": "hoodie",
    "sweater": "sweatshirt",
    "crew": "crewneck",
    "quarterzip": "quarter-zip",
    "1/4": "quarter-zip",
    "grey": "gray",
}

STOPWORDS = {
    "a", "an", "the", "and", "or", "for", "with", "in", "of", "to", "do", "you", "have", "any", "some",
    "i", "me", "my", "want", "need", "looking", "show", "find", "please", "is", "are", "it", "that",
    "yale", "campus", "customs",  # on almost every item, so they don't help rank
}


@dataclass
class ShopDeps:
    """Per-request context for one chat message, handed to the agent's instructions and tools.

    Built by main.py from the session cookie and the page context the website sends. Only
    checked data goes in: the customer comes from the users table, the product from the catalogue.
    """

    customer: CustomerProfile | None = None  # None for guests
    page: CurrentPage | None = None


def customer_profile(user: User | None) -> CustomerProfile | None:
    """The account fields the agent may see. No id, no password hash."""
    if user is None:
        return None
    return CustomerProfile(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        member_since=user.created_at[:10],
    )


_PAGE_TYPES: dict[str, PageType] = {
    "/": "home",
    "/products": "products",
    "/about": "about",
    "/login": "login",
    "/create-account": "create-account",
}


def resolve_page(page: PageContext | None) -> CurrentPage | None:
    """Turn the page context sent by the browser into a CurrentPage the agent can rely on.

    The product id is looked up in the catalogue (unknown ids are dropped), so the agent only
    ever sees real product data, never free text from the request. On a product page the price
    and stock by size are prefetched too (one fast DB read), so questions about "this" item can
    be answered without a tool call, saving a model round trip.
    """
    if page is None:
        return None
    path = page.path.split("?")[0].rstrip("/") or "/"
    product_id = page.product_id
    if product_id is None and path.startswith("/products/"):
        product_id = path.removeprefix("/products/")
    product, price, stock = None, None, None
    if product_id and (found := db.get_product(product_id)):
        product = ProductDescription(
            product_id=found.product_id,
            name=found.name,
            garment_type=found.garment_type,
            description=found.description,
            colors=found.colors,
        )
        price = found.price
        stock = {s.size: s.quantity for s in found.sizes}
    page_type: PageType = "product" if product else _PAGE_TYPES.get(path, "other")
    category = page.category if page.category in CATEGORIES else None
    return CurrentPage(
        path=path, page_type=page_type, product=product, category=category, price=price, stock_by_size=stock
    )


def category_of(garment_type: str) -> str:
    t = garment_type.lower()
    if "quarter-zip" in t or "1/4" in t:
        return "Quarter-zips"
    if "jacket" in t or "fleece" in t:
        return "Jackets & fleece"
    if "hood" in t:
        return "Hoodies"
    if "crewneck" in t or "mockneck" in t or "sweatshirt" in t:
        return "Crewnecks"
    if "long-sleeve" in t:
        return "Long sleeves"
    if "t-shirt" in t:
        return "T-shirts"
    return "Other"


def normalize_size(size: str | None) -> str | None:
    """'medium' -> 'M', '2XL' -> 'XXL'. Unknown sizes come back upper-cased so they can be reported."""
    if size is None or not size.strip():
        return None
    key = re.sub(r"\s+", " ", size.strip().lower())
    return SIZE_ALIASES.get(key, size.strip().upper())


def stock_status(quantity: int) -> StockStatus:
    if quantity <= 0:
        return "sold_out"
    if quantity <= LOW_STOCK:
        return "low_stock"
    return "in_stock"


def _tokens(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9/'-]+", text.lower())
    out = []
    for w in words:
        w = SYNONYMS.get(w, w)
        if w in STOPWORDS:
            continue
        if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
            w = w[:-1]  # hoodies -> hoodie
        out.append(w)
    return out


def search_products(
    query: str = "",
    category: str | None = None,
    color: str | None = None,
    max_price: float | None = None,
    size: str | None = None,
    in_stock_only: bool = False,
) -> list[ProductSummary]:
    """Rank catalogue items by the query words found in their name, type, description, colors
    and tags, after applying the filters. Rare words (a college, a sport) count for more than
    common ones ("crewneck"), and matches in the name get a bonus, so "Morse crewneck" surfaces
    Morse items first. Returns at most MAX_RESULTS items."""
    stock = db.stock_by_product()
    size = normalize_size(size)
    words = _tokens(query)
    products = db.list_products()

    def haystack(p: Product) -> str:
        return " ".join([p.name, p.garment_type, p.description, *p.colors, *p.search_tags]).lower()

    # Inverse document frequency over the whole catalogue: log(N / number of products containing the word).
    texts = [haystack(p) for p in products]
    weight = {w: math.log(len(texts) / (1 + sum(w in t for t in texts))) + 1 for w in set(words)}

    scored: list[tuple[float, ProductSummary]] = []
    for p, text in zip(products, texts):
        if category and category_of(p.garment_type).lower() != category.lower():
            continue
        if color and not any(color.lower() in c.lower() for c in p.colors):
            continue
        if max_price is not None and p.price > max_price:
            continue
        sizes = stock.get(p.product_id, {})
        if size and sizes.get(size, 0) <= 0:
            continue
        if in_stock_only and sum(sizes.values()) <= 0:
            continue

        name = p.name.lower()
        score = sum(weight[w] * (1.5 if w in name else 1.0) for w in words if w in text)
        if words and score == 0:
            continue
        scored.append(
            (
                score,
                ProductSummary(
                    product_id=p.product_id,
                    name=p.name,
                    garment_type=p.garment_type,
                    price=p.price,
                    colors=p.colors,
                    available_sizes=[s for s, q in sizes.items() if q > 0],
                ),
            )
        )

    scored.sort(key=lambda s: (-s[0], s[1].name))
    return [summary for _, summary in scored[:MAX_RESULTS]]


# ---------- Lookups for one product: description, price, stock ----------


class ProductNotFound(LookupError):
    """Raised when a product reference can't be matched; the message lists close matches."""


def _name_key(text: str) -> str:
    """'Branford 1/4-Zip' and 'branford 1 4 zip' -> 'branford 1 4 zip' (case, punctuation, spacing ignored)."""
    return " ".join(re.findall(r"[a-z0-9]+", text.lower()))


def find_product(product: str) -> ProductDetail:
    """Resolve a product_id or an exact product name to its DB record. Name matching ignores case,
    punctuation and spacing, so the agent can pass the shopper's wording straight in when they
    name a product exactly, with no search needed."""
    ref = product.strip()
    if found := db.get_product(ref):
        return found
    by_name = {_name_key(p.name): p.product_id for p in db.list_products()}
    if (key := _name_key(ref)) in by_name:
        return db.get_product(by_name[key])  # type: ignore[return-value]
    suggestions = ", ".join(f"{s.name} ({s.product_id})" for s in search_products(ref)[:3])
    raise ProductNotFound(
        f"No product is named {product!r}."
        + (
            f" Closest matches: {suggestions}. If one is clearly what the shopper meant, call again with its id;"
            " otherwise ask the shopper which one."
            if suggestions
            else " Use search_products to find it."
        )
    )


def get_product_description(product: str) -> ProductDescription:
    p = find_product(product)
    return ProductDescription(
        product_id=p.product_id,
        name=p.name,
        garment_type=p.garment_type,
        description=p.description,
        colors=p.colors,
    )


def get_price(product: str) -> ProductPrice:
    p = find_product(product)
    return ProductPrice(product_id=p.product_id, name=p.name, price=p.price, price_display=f"${p.price:,.2f}")


def check_stock(product: str, size: str | None = None) -> StockCheck:
    p = find_product(product)
    sizes = [SizeAvailability(size=s.size, quantity=s.quantity, status=stock_status(s.quantity)) for s in p.sizes]
    in_stock = [s.size for s in sizes if s.quantity > 0]
    sold_out = [s.size for s in sizes if s.quantity <= 0]
    total = sum(s.quantity for s in sizes)

    requested = normalize_size(size)
    match = next((s for s in sizes if s.size == requested), None)
    if requested is None:
        status, qty = None, None
        if not in_stock:
            summary = f"The {p.name} is sold out in every size."
        elif sold_out:
            summary = f"The {p.name} is in stock in {', '.join(in_stock)} and sold out in {', '.join(sold_out)}."
        else:
            summary = f"The {p.name} is in stock in every size ({', '.join(in_stock)})."
    elif match is None:
        status, qty = "not_offered", None
        summary = f"The {p.name} isn't made in size {requested}; sizes offered are {', '.join(s.size for s in sizes)}."
    else:
        status, qty = match.status, match.quantity
        if match.status == "sold_out":
            others = f" Sizes in stock: {', '.join(in_stock)}." if in_stock else " It is sold out in every size."
            summary = f"Size {requested} of the {p.name} is sold out.{others}"
        elif match.status == "low_stock":
            summary = f"Size {requested} of the {p.name} is in stock, but only {qty} left."
        else:
            summary = f"Size {requested} of the {p.name} is in stock ({qty} available)."

    # Sold out in the shopper's size: include the best substitutes right away, so the agent can
    # suggest them without a second (sequential) tool call and model round trip.
    alternatives = find_alternatives(p.product_id, requested, limit=3).alternatives if status == "sold_out" else []

    return StockCheck(
        product_id=p.product_id,
        name=p.name,
        requested_size=requested,
        requested_size_status=status,
        requested_size_quantity=qty,
        sizes=sizes,
        in_stock_sizes=in_stock,
        sold_out_sizes=sold_out,
        total_quantity=total,
        summary=summary,
        alternatives=alternatives,
    )


# ---------- Substitutes: find_alternatives ----------

# Garment and filler words: they describe the category (scored separately), not the theme.
_GENERIC_WORDS = {
    "hoodie", "hood", "crewneck", "t-shirt", "sweatshirt", "quarter-zip", "zip", "full", "pullover", "jacket",
    "fleece", "sweater", "long", "sleeve", "left", "chest", "logo", "college", "merch", "gear", "school",
    "shirt", "tri", "blend", "1", "4", "s", "l", "big", "basic", "men", "mens", "university",
    # construction / print details shared by many items
    "quarter", "drawstring", "kangaroo", "pocket", "crest", "lettering", "wordmark", "graphic", "ribbed",
    "cuff", "embroidered", "print", "printed", "short", "front", "back", "white", "heather", "gray", "navy",
    "blue", "black", "red", "green", "pink", "coral", "charcoal", "khaki", "cream", "maroon", "grey",
    "apparel", "clothing", "top", "casual",
}
MAX_ALTERNATIVES = 8


def _theme_words(p: Product) -> set[str]:
    """Distinctive words (college, sport, event, style) from a product's name and tags."""
    return {w for w in _tokens(" ".join([p.name, *p.search_tags])) if w not in _GENERIC_WORDS and len(w) > 2}


def find_alternatives(
    product: str,
    size: str | None = None,
    max_price: float | None = None,
    limit: int = 6,
) -> Alternatives:
    """In-stock substitutes for a product (in the given size, if any), most similar first.

    Similarity score = shared distinctive theme words weighted by rarity (a shared college or sport
    counts far more than a shared common word) + same category + shared colors + similar price.
    """
    original = find_product(product)
    size = normalize_size(size)
    stock = db.stock_by_product()
    products = db.list_products()
    themes = {p.product_id: _theme_words(p) for p in products}
    doc_freq: dict[str, int] = {}
    for words in themes.values():
        for w in words:
            doc_freq[w] = doc_freq.get(w, 0) + 1
    idf = {w: math.log(len(products) / df) + 0.5 for w, df in doc_freq.items()}

    o_theme = themes[original.product_id]
    o_category = category_of(original.garment_type)
    o_colors = {c.lower() for c in original.colors}

    scored: list[tuple[float, AlternativeMatch]] = []
    for c in products:
        if c.product_id == original.product_id:
            continue
        sizes = stock.get(c.product_id, {})
        available = [s for s, q in sizes.items() if q > 0]
        if (size and size not in available) or not available:
            continue
        if max_price is not None and c.price > max_price:
            continue

        shared = sorted(o_theme & themes[c.product_id], key=lambda w: -idf[w])
        same_category = category_of(c.garment_type) == o_category
        shared_colors = sorted(o_colors & {x.lower() for x in c.colors})
        price_gap = abs(c.price - original.price)

        score = sum(idf[w] for w in shared)
        score += 2.0 if same_category else 0.0
        score += min(len(shared_colors), 3) * 0.5
        score += 1.0 if price_gap <= 15 else 0.5 if price_gap <= 30 else 0.0
        if score <= 1.0:  # nothing meaningful in common beyond price
            continue

        reasons = []
        if shared:
            reasons.append("same " + " / ".join(w.title() for w in shared[:2]) + " theme")
        if same_category:
            reasons.append(f"also {o_category.lower()}" if o_category != "Other" else "same type")
        if shared_colors:
            reasons.append("also " + " / ".join(shared_colors[:2]))
        if price_gap <= 15:
            reasons.append("similar price")
        scored.append(
            (
                score,
                AlternativeMatch(
                    product_id=c.product_id,
                    name=c.name,
                    garment_type=c.garment_type,
                    price=c.price,
                    colors=c.colors,
                    available_sizes=available,
                    why_similar=", ".join(reasons),
                ),
            )
        )

    scored.sort(key=lambda s: (-s[0], s[1].price, s[1].name))
    in_size = stock.get(original.product_id, {}).get(size, 0) > 0 if size else None
    return Alternatives(
        for_product_id=original.product_id,
        for_product_name=original.name,
        size=size,
        original_in_stock_in_size=in_size,
        alternatives=[m for _, m in scored[: max(1, min(limit, MAX_ALTERNATIVES))]],
    )
