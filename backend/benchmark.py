"""Measure the agent's speed and token cost on a fixed set of chat questions.

Run from the backend folder:
    python benchmark.py before        # writes ../output/benchmark_before.json
    python benchmark.py after         # writes ../output/benchmark_after.json
    python benchmark.py compare       # prints a before/after table

Each question goes through the same path as /api/chat (agent.run_chat's history handling,
usage limits) as a guest on the given page. Model answers vary a little run to run, so each
question runs REPEATS times and the averages are reported.
"""

import asyncio
import json
import sys
import time
from pathlib import Path

import agent
import tools
from models import ChatMessage, PageContext

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"
REPEATS = 2

# A realistic earlier conversation (long assistant replies), to measure the cost of history.
LONG_HISTORY = [
    ChatMessage(role="user", content="What hoodies do you have?"),
    ChatMessage(
        role="assistant",
        content="I found 12 hoodies from $68.00 to $88.00; they're on the page above. Highlights: the Basic Hoodie "
        "Big Yale is a navy pullover with big white YALE lettering, the Brooks Brothers Double Knit Full Zip "
        "Hoodie Yale is a premium full-zip, and the Champion Reverse Weave Hoodie is a heavyweight classic. "
        "There are also sport hoodies for baseball, hockey, golf and more. Tell me your size and I can narrow "
        "it down to what's in stock.",
    ),
    ChatMessage(role="user", content="Which ones are navy?"),
    ChatMessage(
        role="assistant",
        content="Navy options include the Basic Hoodie Big Yale ($68.00), the Brooks Brothers Double Knit Full Zip "
        "Hoodie Yale ($88.00), the Champion Reverse Weave Hoodie 1 ($68.00), the Crew Left Chest Hoodie "
        "($68.00) and the Ua Gameday Double Knit Hood ($45.00). They're shown on the page. Want me to check a "
        "size for any of them?",
    ),
    ChatMessage(role="user", content="Is the Basic Hoodie Big Yale available in XL?"),
    ChatMessage(
        role="assistant",
        content="Yes, the Basic Hoodie Big Yale is in stock in XL, but only 2 left. It's $68.00, a navy pullover "
        "with a front kangaroo pocket, drawstring hood and large white YALE lettering across the chest.",
    ),
] * 2  # 12 messages

QUESTIONS: list[tuple[str, str, list[ChatMessage], PageContext | None]] = [
    ("price", "How much is the Basic Hoodie Big Yale?", [], None),
    ("browse", "What hoodies do you have?", [], None),
    ("stock", "Is the Baseball Left Chest Crewneck available in XL?", [], None),
    ("filtered list", "navy hoodies in size M", [], None),
    ("sold out → similar", "I need the Crew Left Chest Hoodie in M, what can I get instead?", [], None),
    (
        "this (product page)",
        "Do you have this in large?",
        [],
        PageContext(path="/products/morse-1-4-zip", product_id="morse-1-4-zip"),
    ),
    ("long history follow-up", "And what about in large?", LONG_HISTORY, None),
    ("policy", "What's your return policy?", [], None),
]


async def run_one(message: str, history: list[ChatMessage], page: PageContext | None) -> dict:
    a = agent.get_agent()
    deps = tools.ShopDeps(customer=None, page=tools.resolve_page(page))
    start = time.perf_counter()
    result = await a.run(
        message,
        message_history=agent.to_model_history(history),
        deps=deps,
        usage_limits=agent.USAGE_LIMITS,
    )
    seconds = time.perf_counter() - start
    u = result.usage
    return {
        "seconds": round(seconds, 2),
        "requests": u.requests,
        "tool_calls": u.tool_calls,
        "input_tokens": u.input_tokens,
        "cached_tokens": u.cache_read_tokens,
        "output_tokens": u.output_tokens,
        "reply": result.output.reply,
        "products": len(result.output.product_ids),
    }


async def run_all(label: str) -> None:
    rows = []
    for name, message, history, page in QUESTIONS:
        runs = [await run_one(message, history, page) for _ in range(REPEATS)]
        avg = {k: round(sum(r[k] for r in runs) / len(runs), 2) for k in runs[0] if isinstance(runs[0][k], (int, float))}
        rows.append({"name": name, "message": message, **avg, "sample_reply": runs[-1]["reply"]})
        print(f"{name:<24} {avg['seconds']:>6}s  req={avg['requests']:<4} tools={avg['tool_calls']:<4} "
              f"in={avg['input_tokens']:<8} cached={avg['cached_tokens']:<8} out={avg['output_tokens']}")
    OUTPUT_DIR.mkdir(exist_ok=True)
    path = OUTPUT_DIR / f"benchmark_{label}.json"
    path.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(f"saved {path}")


def compare() -> None:
    before = {r["name"]: r for r in json.loads((OUTPUT_DIR / "benchmark_before.json").read_text(encoding="utf-8"))}
    after = {r["name"]: r for r in json.loads((OUTPUT_DIR / "benchmark_after.json").read_text(encoding="utf-8"))}
    keys = ["seconds", "requests", "tool_calls", "input_tokens", "cached_tokens", "output_tokens"]
    print("| Question | " + " | ".join(f"{k} (before → after)" for k in keys) + " |")
    print("|---|" + "---|" * len(keys))
    totals = {k: [0.0, 0.0] for k in keys}
    for name in before:
        if name not in after:
            continue
        cells = []
        for k in keys:
            b, a = before[name][k], after[name][k]
            totals[k][0] += b
            totals[k][1] += a
            cells.append(f"{b:g} → {a:g}")
        print(f"| {name} | " + " | ".join(cells) + " |")
    print("| **Total** | " + " | ".join(f"**{round(b, 1):g} → {round(a, 1):g}**" for b, a in totals.values()) + " |")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "after"
    if mode == "compare":
        compare()
    else:
        asyncio.run(run_all(mode))
