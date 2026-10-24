# Campus Customs: Usability Improvements

We implemented four improvements: two on the website (front end) and two in the shopping agent (backend). They were chosen from a list of ten candidates because they address real gaps we saw in the data and in testing. Every number below was checked against `campus_customs.db` or measured with `backend/benchmark.py`.

| # | Improvement | Type |
|---|---|---|
| F2 | "In stock in my size" filter | Website |
| F4 | Clickable product names in chat replies | Website |
| B2 | `find_alternatives` tool (substitutes for sold-out sizes) | Agent |
| B5 | Faster, cheaper agent runs | Agent / backend |

---

## F2: "In stock in my size" filter (Products page)

**What we added**
- A filter bar on the Products page: **"In stock in my size"** with buttons *Any, XS, S, M, L, XL, XXL*, plus a **"Hide sold-out items"** switch.
- A **size row on every product card** (XS S M L XL XXL). Sold-out sizes are struck through, and the shopper's size is highlighted.
- **"My size" memory:** the chosen size is saved in the browser, and product pages open with it already selected.
- Backend support: each product now carries `available_sizes`, computed in the same database query as the rest of the product data.

**What it does**
- Picking a size shows only products that can actually be bought in that size, and says what was hidden. For example: *"80 items in stock in M · 22 sold out in M hidden · show all sizes"*. It combines with the category chips and search ("21 hoodies in stock in M").
- Opening a product after choosing a size immediately shows that size's status ("In stock", "Only 2 left", "Sold out").
- Filters live in the web address (`/products?category=Hoodies&size=M`), so a filtered view can be bookmarked or shared.

**How it helps the shopper**
- **No dead ends.** 145 of the 612 size/product combinations are sold out. Before, a shopper found that out only after opening a product page. Now they browse only what they can buy.
- **Fewer clicks:** set the size once and every page respects it.
- Shoppers can see at a glance which sizes are left, which is especially useful for less common sizes like XS and XXL.

**How it helps the business**
- **More completed purchases:** shoppers who hit sold-out items often leave; showing what's available keeps them shopping.
- **Fewer support questions** ("do you have this in M?"), because the answer is on the card.
- The size data could later show which sizes sell out most and guide restocking.

---

## F4: Clickable product names in chat replies

**What we added**
- Every **product name in an assistant reply becomes a link** to that product's page, including products the reply mentions that aren't shown as cards.
- Simple formatting in replies: **bold** text and real bullet lists.

**What it does**
- The chat loads the list of all 102 product names once and matches them in each reply (longest names first, case-insensitive). For example, "*Sorry, the Baseball Left Chest Crewneck is sold out in XL… try the Yale Sports Crewneck Baseball*" turns both names into links.
- Clicking a name opens the product page while the chat stays open, and the chat updates to "Viewing *that product*", so the shopper can ask "is this in M?" right away.
- It's built safely from plain text, so a reply can never inject code into the page.

**How it helps the shopper**
- **One click from recommendation to product page.** Before, a shopper had to remember the name and search for it.
- The conversation keeps going: open a suggestion, ask about "this", come back.
- Replies with lists and bold are easier to scan.

**How it helps the business**
- **Shorter path from interest to purchase:** every product the assistant recommends is a direct entry point to its page.
- Shoppers explore more of the catalogue through the assistant's suggestions.
- Clicks on chat links could later be tracked to measure how much the assistant drives sales.

---

## B2: `find_alternatives` tool (substitutes for sold-out sizes)

**What we added**
- A new agent tool, **`find_alternatives(product, size, max_price, limit)`**. It returns similar products that are **in stock in the shopper's size**, each with a short reason ("same Baseball theme, also crewnecks, similar price").
- `check_stock` now **automatically includes the top 3 substitutes** whenever the requested size is sold out.
- Prompt rules: when a size is sold out, say so clearly, list the sizes in stock, and suggest 2–3 substitutes with their reasons.

**What it does**
- Similarity is scored from real catalogue data:
  - shared **college, sport or theme** (rare words like "Morse" or "Baseball" count far more than common ones),
  - same **category**,
  - shared **colors**,
  - similar **price**.
- Only items actually in stock in that size can be suggested.
- Example, "Is the Baseball Left Chest Crewneck available in XL?" → *"Sorry, it's sold out in XL; S, M, L and XXL are available. Two alternatives in XL: Yale Sports Crewneck Baseball (same baseball theme and crewneck style) and Tri Blend Sports Baseball T Shirt (same baseball theme)."* Both appear as cards on the page.

**How it helps the shopper**
- **A "no" becomes a useful answer:** instead of "sold out", the shopper gets similar items they can actually buy, in their size, with a reason for each.
- The suggestions match what the shopper cares about (their college, their sport), not just the same color.
- They never get a substitute that is itself sold out in their size.

**How it helps the business**
- **Saves sales that would otherwise be lost:** a sold-out size is a moment where a shopper often leaves; a relevant in-stock substitute keeps the sale.
- **Moves inventory** that is in stock.
- **More accurate and consistent answers:** substitutes come from a scored database lookup, not from the model guessing search words. It also takes **one tool call instead of several**, which is faster and cheaper (see B5).

---

## B5: Faster, cheaper agent runs

**What we added**
- **A benchmark** (`backend/benchmark.py`) that runs 8 fixed shopper questions through the agent and measures time, model round trips, tool calls and tokens. Results are saved in `output/benchmark_before.json` and `output/benchmark_after.json`.
- **A shorter system prompt:** 13,355 → 6,749 characters, with the same rules. Repeated text was removed, and the tool table was dropped because each tool already describes itself.
- **Product-page prefetch:** when the shopper is on a product page, that product's live price and stock are put in the agent's context, so questions about "this" item need no tool call.
- **Substitutes inside `check_stock`** (from B2), so a sold-out question needs no second, sequential lookup.
- **Shorter chat history:** the last 8 messages (was 12), each capped at 400 characters.
- **A per-message metrics log** (`backend/logs/chat_metrics.jsonl`) recording time, round trips, tools used and tokens for every live chat message. It stores no message text or personal data.

**What it does**
- The measurements showed the time and cost come from **model round trips and the text sent with every request**, not from our database (tools run in 0.4–2.6 ms). So we cut those:

| Measure (8 questions) | Before | After | Change |
|---|---|---|---|
| Input tokens | 60,496 | 46,793 | **−23%** |
| Uncached (full-price) input tokens | 13,503 | 9,626 | **−29%** |
| Total answer time | 42.9 s | 36.4 s | **−15%** |
| "Do you have this in pink?" on a product page | 2 round trips, 1 tool | **1 round trip, 0 tools** | about 2× fewer model calls |

- Answer quality and safety were re-tested after the change: prices and stock still match the database, sold-out answers now include substitutes, and the safety tests still pass.
- Honest note: our first attempt made things *worse* (+17% tokens), because adding a tool and rules grew every request. The benchmark caught it, and the shorter prompt fixed it.

**How it helps the shopper**
- **Faster answers,** especially on product pages, where "is this in L?" now needs a single model call.
- Better answers: sold-out questions now come with substitutes without extra waiting.

**How it helps the business**
- **Lower running costs:** about 23–29% fewer tokens per conversation means a lower model bill as chat use grows.
- **Scales better:** fewer model calls per question means more shoppers can be served for the same cost and capacity.
- **Measurable:** the metrics log shows speed and cost on the live site, so future changes can be checked with data rather than guesswork.

---

## Summary

| Improvement | For the shopper | For the business |
|---|---|---|
| **F2** In stock in my size | Browse only what they can buy, size remembered | Fewer dead ends and lost shoppers; fewer "is it in M?" questions |
| **F4** Clickable names in chat | One click from a suggestion to the product page | Shorter path to purchase; the chat becomes a sales channel |
| **B2** `find_alternatives` | A sold-out size becomes "here's something like it in your size" | Saves sales that would be lost; moves in-stock inventory |
| **B5** Faster, cheaper runs | Quicker answers, better sold-out replies | −23% tokens, −15% time; measurable cost per chat |

*The Game Day design changes from Problem 10 (countdown scoreboard, LED ticker, player cards, jersey sizes, Night Game mode, press box chat and more) are described in `output/design.md`.*
