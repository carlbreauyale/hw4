# Campus Customs: Game Day storefront with an AI shopping assistant

MGT 409 · Homework 4. A customer website for **Campus Customs** (Bulldog Blue, officially licensed Yale apparel) with a chatbot that gives honest answers about price and stock from the store database.

- **Front end:** React + Vite + TypeScript. Browse products, product pages with live stock by size, create an account / log in, and a chat panel that puts matching products on the page. The site has a "Game Day" design for Yale vs Harvard, Nov 21, 2026 at Fenway Park.
- **Back end:** Python FastAPI. Its brain is a **PydanticAI agent** using `gpt-6-astra` via Portkey and the OpenAI SDK. Every price and stock number comes from `campus_customs.db` through the agent's tools.

## Repository layout

```
hw4/
├── AI_prompts.md          # log of every prompt typed in the vibe coder
├── requirements.txt       # Python dependencies (backend)
├── .env.example           # settings template (placeholders only)
├── .gitignore
├── README.md
├── frontend/              # Vite React TypeScript app
├── backend/
│   ├── main.py            # FastAPI app; run with: uvicorn main:app --reload --port 8000
│   ├── agent.py           # ┐
│   ├── models.py          # │ the agent: entry/wiring, Pydantic types, tools, system prompt
│   ├── tools.py           # │
│   ├── prompts/prompt.md  # ┘
│   ├── db.py              # SQLite access used by the API and the tools
│   ├── auth.py            # password hashing, login sessions
│   ├── audit.py           # append-only audit trail writer
│   ├── safety.py          # redaction helpers
│   └── benchmark.py       # speed/token benchmark
├── output/
│   ├── harness.md         # how the whole system works (data, models, tools, safety, specs)
│   ├── design.md          # Problem 10 design changes
│   ├── usability.md       # Problem 9 usability improvements
│   ├── app_check.html     # Problem 11 live-site checks (open by double-clicking)
│   ├── app_check_images/  # screenshots linked from app_check.html
│   ├── audit_trail.json   # append-only log of agent-loop activity
│   └── benchmark_before.json / benchmark_after.json
├── research/              # notes on yalebulldogblue.com (style and store facts)
└── tests/app_check.py     # re-captures the app_check screenshots from the running site
```

**The agent** is four files under `backend/`: `prompts/prompt.md` (system prompt), `agent.py` (entry/wiring), `tools.py` (tools the agent can call) and `models.py` (Pydantic/PydanticAI types).

## 1. Place the data pack (local only, not in git)

The database and product images are **not** in this repository. Put the course data pack in a `data/` folder at the top level:

```
hw4/
└── data/
    ├── campus_customs.db
    └── products/          # images referenced by the catalogue (image_file_path)
```

## 2. Configure the API key

Copy `.env.example` to `.env` in the `hw4` folder and set your key:

```bash
cp .env.example .env
```

```
PORTKEY_API_KEY=your-portkey-api-key-here
```

`PORTKEY_MODEL` (default `gpt-6-astra`) and `PORTKEY_BASE_URL` (default `https://api.portkey.ai/v1`) are optional. The real `.env` is git-ignored.

## 3. Install

Requires **Python 3.12+** and **Node.js 20+**. From the `hw4` folder:

```bash
pip install -r requirements.txt
```

```bash
npm --prefix frontend install
```

## 4. Run the back end (terminal 1)

```bash
cd backend
```

```bash
uvicorn main:app --reload --port 8000
```

The API is at http://127.0.0.1:8000 (health check: `/api/health`). If `uvicorn` isn't on your PATH, use `python -m uvicorn main:app --reload --port 8000`.

## 5. Run the front end (terminal 2)

From the `hw4` folder:

```bash
npm --prefix frontend run dev
```

Open **http://localhost:5173**. The Vite dev server forwards `/api` and `/images` to the back end on port 8000, so start the back end first.

## Try it

- **Log in** with the seeded test user `test@campuscustoms.yale.edu` / `password`, or create an account.
- **Chat** ("Ask the coach", bottom right):
  - "What hoodies do you have?" puts product cards on the page.
  - "How many Morse 1 4 Zip do you have in size S, and how much is it?" gives honest stock and price from the database.
  - On a product page, ask "Do you have this in XL?" If XL is sold out, you get in-stock alternatives.
- **Products page:** filter by category and by **"In stock in my size"**.
- **Extras:** the Day/Night Game switch in the nav, a football that moves as you scroll, and type `boola` anywhere for a surprise.

## How it works and where to read more

| Topic | Document |
|---|---|
| Architecture, database, auth, agent, tools, models and fields, safety rules, specs (loop limits, caps, how to run) | `output/harness.md` |
| Usability improvements (size filter, chat links, alternatives tool, faster/cheaper agent) | `output/usability.md` |
| Game Day design | `output/design.md` |
| Live-site test screenshots | `output/app_check.html` |
| Agent-loop audit log | `output/audit_trail.json` |

## Notes

- **What's kept out of git:** the data pack, `.env`, the session signing key (`backend/.session_secret`, created automatically) and runtime logs (`backend/logs/`).
- **Saved chats:** logged-in shoppers' chats are stored in the `chat_messages` table of your local database. Guests' chats are not saved.
- **Optional tools:**
  - `cd backend` then `python benchmark.py compare` prints the before/after speed and token table.
  - `python tests/app_check.py` re-captures the live-site screenshots; it needs `pip install playwright` and Microsoft Edge.
