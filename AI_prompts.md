# AI Prompts

Problem 1: Vibe coder prompts

Ok now we start a new homework. We will be working out of folder HW4. Please create the file AI_prompts.md in this folder and keep it updated as we work. This is, as usual, the log of what I am typing in the vibe coder.

How do I open a session in the HW4 folder like you suggest

In the AI_prompt file, we need to put one section for each problem. Each section must include: 1. The problem number and title, 2. the prompts I type in

No need to do anything now, but here is some context for this assignment. The store Campus Customs needs a real customer website with a helpful chatbot. We will build a React + Vite TypeScript front end and a Python FastAPI backend whose brain is a PydanticAI agent. Shoppers should be able to browse products, create an account, chat about merch, see matching items appear on the page, and get honest answers about price and stock from a local database. We are given campus_customs.db with tables for the product catalogue, inventory by size, and users (with hashed passwords). Product image file paths are in the catalogue table.  Use our PORTKEY_API_KEY from previous assignments. I will send instructions in future prompts, but in the end, we will push our project to a public GitHub repo and submit the repo URL on Canvas. Do not commit the database or product images.            THIS YOU CAN DO FIRST: Research yalebulldogblue.com to learn the style of Campus Customs page and information for our agent prompt.

Please insert at the very beginning of the AI_prompt file the header Problem 1: Vibe coder prompts.  Once this is done we will move to Problem 2

---

Problem 2: Analyse the database

Starting Problem 2: Analyse the database

Look at the database data/campus_customs.db and understand the fields of each table. At a minimum you should understand catalogue, inventory and users.  Start the file output/harness.md. Write down each table and its fields, and one short line on why each field matters for the shop or the chatbot. We will keep growing this harness in later problems (models, tools, safety, specs).  Do all this but I will also look at the database on my side to make sure I understand also!

---

Problem 3: Build the Campus Customs website

Starting Problem 3: Build the Campus Customs website

Scaffold a React + Vite + TypeScript front end for a Campus Customs. Put a nav bar at the top that links to the main pages:  -Home  -Products  -About us  -Log in  -Create account      Pull Campus-Customs-style wording from yalebulldogblue.com for Home and About US, but write these pages in your own voice (do not copy the original site text).  On the Products page, show product images from the catalogue (use the image paths in the database) with basic product info (name, price, short description).   Make each product open a single-item page (large image on one side, full product text on the other - description, price, sizes/stock when you have them). Clicking a card on Products should take the shopper there.  Add a chat interface in the bottom right of the site (a floating chat panel is fine). It does not need to talk to an agent yet - a stub that will call our backend later is enough for this problem. You will need a small API soon  to read the database. It is fine to start a simple FastAPI app in backend/main.py just to serve products and images, then grow it into the agent backend in Problem 5.

I got this error in the terminal when trying to run the backend: Here is the printout from the Terminal prompts and replies:

PS C:\Users\cb2736\OneDrive - Yale University\Documents\Courses\MGT 409 E1 AI Foundations for Managers\HW4> python -m uvicorn main:app --app-dir backend --reload --port 8000
INFO:     Will watch for changes in these directories: ['C:\Users\cb2736\OneDrive - Yale University\Documents\Courses\MGT 409 E1 AI Foundations for Managers\HW4']
ERROR:    [WinError 10013] An attempt was made to access a socket in a way forbidden by its access permissions
PS C:\Users\cb2736\OneDrive - Yale University\Documents\Courses\MGT 409 E1 AI Foundations for Managers\HW4>

OK I can try it again now, correct?

It works now, the site is running

---

Problem 4: Create account and login

Starting Problem 4: Create account and login

Build a normal create-account/login flow.    -Create account: first name, last name, email, password (and confirm password)    -Log in: email and password.      ; new accounts go into the users table. Make sure to store passwords securely so hackers (human or AI) cannot access them (hash function).   The seed database already has a test user you can use while building. Email: test@campuscustoms.yale.edu, Password: password, Hash function: PBKDF2-HMAC-SHA256, 120,000 iterations (stored as pbkdf2_sha256$salt$hash). Now login checks a password: 1. never un-hash the stored value. Only re-hash what the user typed and compare. 2. Read the salt out of the stored string (the middle piece) - do not make a new one at login   3. Hash the typed password with that same salt, then compare to the stored hash. Use a constant-time compare. 4. Signup and login must use the same hash settings (same function, same salt handling, same iteration count). If they differ, even the right password will not match. 5. Surest check: log in as the seeded test user and as a brand new account just created in the app     Confirm that we can log in as that user, and that a brand new account you create also works.  Update output/harness.md with how auth works (what you store for a user and how passwords are protected)

Refreshing localhost:5173 does not work

Just a white page

It works now

---

Problem 5: PydanticAI agent backend

Start Problem 5: PydanticAI agent backend

Build the shop chatbot as a Pydantic AI agent behing FastAPI, plugged into your front-end chat widget. Put the API app in backend/main.py - this is the file you run with Uvicorn. Keep the agent as these four files next to it (same idea as Homework 3): backend/prompts/prompt.md (system prompt (grow this same file later)), backend/agent.py (agent entry/wiring), backend/tools.py (tools the agent can call), backend/models.py (Pydantic/PydanticAI structured types).  In main.py, expose a chat route so a message from the website returns a reply from the agent (and whatever else you need for product/auth). You will need the AI model API key for the agent.  Put Campus Customs voice and safety basics into prompts/prompt.md (you will expand tools and safety later). Start or update types in models.py for chat replies/product cards as needed.   In output/harness.md, note how the front end talks to FastAPI and how the agent is loaded (prompt file + model). Make sure the backend runs from the backend/ folder like this: uvicorn main:app --reload --port 8000

I just ran this command in a terminal ; [Environment]::SetEnvironmentVariable("Path", [Environment]::GetEnvironmentVariable("Path","User") + ";C:\Users\cb2736\AppData\Local\Python\pythoncore-3.14-64\Scripts", "User")

You mention to run the uvicorn command from the backend folder, how do I do that

I get this error in the terminal:

uvicorn : The term 'uvicorn' is not recognized
as the name of a cmdlet, function, script file,
or operable program. Check the spelling of the
name, or if a path was included, verify that
the path is correct and try again.
At line:1 char:1
+ uvicorn main:app --reload --port 8000
+ ~~~~~~~
    + CategoryInfo          : ObjectNotFound: (
   uvicorn:String) [], CommandNotFoundExceptio
  n
    + FullyQualifiedErrorId : CommandNotFoundEx
   ception

where do I see if I am in the backend folder

what is the prompt in the terminal to switch it to the hw4 folder

What is a good test or tests to write in the chat

I did every single test you suggested and all answered came out correctly. I also logged in as Test with the username and password and it greeted me as Test and worked correctly

---

Problem 6: Tools: product info and stock

Starting Problem 6: Tools: product info and stock

Give the agent tools that look up real information from campus_customs.db: 1. Product description, 2. Price and 3. How many are in stock (by size when the customer asks).   The agent must use the database - it should not invent prices or quantities. If a size is out of stock, say so clearly.  Expand prompts/prompt.md so the agent knows to call these tools for price and stock questions. Add or update return types in models.py.  In output/harness.md, list each tool and explain which model fields you chose for lookup results and why

Skip the search when the name is exact

---

Problem 7: Chat search that updates the page

Starting Problem 7: Chat search that updates the page

Now we will add a neat feature the the site. When a customer asks about a type of item - for example "what hoodies do you have" - the agent should search the catalogue and the website should dynamically show those matching items as product cards (image, name, price, short info). This is an API contract: the agent returns structured product matches and then the front end renders them on the website. It should look really cool.  After the dynamic product cards are loaded by your new feature, make sure the same single-item page behavior you built in Problem 3 still works: each product card - including the ones the chat just put on the page - should still open that detail view (large image + full info) when clicked.  Update prompts/prompt.md and output/harness.md so it is clear how search results reach the page.

Please suggest a few good questions so I can test the feature

With this question in the chat: navy hoodies in size M, the answer in the chat was:  Sorry, I can't reach the store right now. Please try again in a moment.

the navy hoodies in size M is fixed, and all other questions worked well

---

Problem 8: Customer memory

Starting Problem 8: Customer memory

When a shopper is logged in, save their chat history in the database in an appropriate table and reload it when they return. The agent should know who is chatting (name, email) - put that in agent deps (or an equivalent clear pattern) and/or tools the agent can call. Also pass enough page context that if someone is on a product page and asks "do you have this in pink?" , the agent knows which item they mean. hint: you can put code into the agent context. Guests can still chat, but history only needs to persist for logged-in users. Document in output/harness.md: how user chat history is stored, what customer fields the agent sees, and how page context is passed.

Ok I will do that test

The test worked, it answered about the right item

---

Problem 9: Usability improvements

Starting Problem 9: Usability improvements

Now that the core shop works, improve it. We need to choose and implement: 2 front-end usability improvements and 2 agent/backend usability improvements. Front-end improvements are things the make the site look better and make it easier to use. Agent/backend improvements are things that make the agent output better, more accurate, or safer. These could be new agent tools or things that make the agent run faster or cheaper. Please make 4-5 suggestions for each and I will choose which one we will implement

Let's do F2 (In stock in my size filter on the products page), F4 (clickable product names in chat replies), B2 (find_alternatives tool) and B5 (faster, cheaper agent runs)

Give me one test I can do on my side for each one of the 4 new improvements

All 4 tests worked

---

Problem 10: Style the website

Starting Problem 10: Style the website

Now we need to add creative design so the site feels like a real Campus Customs storefront - fonts, color, hierarchy, motion, product presentation, chat feel. I get more points for imaginative and innovative design. Please describe options that you would suggest so I can can choose and decide which ones we will implement.

The Game day is coming soon, so I pick C for the overall look so can you rearrange and suggest individual features, and dynamic features that are best suited for this theme

Base + D1,D2,D3,D4,D5,D6,D7, E1, P1,P2,H1,H2

It all looks great and The boola secret animation works

One more thing, bottom right add this: Design by Labubu Carl as a clickable link to https://www.linkedin.com/in/carl-breau/, then add a small labubu inspired character, that waves when you hover over it, next to the link

Remind me how the TD trigger works so I can test it

Both TD triggers worked

Write output/usability. For each of the improvements say: what you added, why it helps a camput customs shopper or the business.

Write output/usability. For each of the improvements say: what you added, what is does, and how it could help improve the experience of the shopper or the business.

you are right, I gave the wrong instruction about the design file. Now about the changes we just did in problem 10, write output/design.md and write what we changed. When relevant, explain why it should help customers stick around and buy. Keep it concrete and short as we have many changes,

Did you mention the labubu reference at the bottom

---

Problem 11: Site testing (app check)

Starting Problem 11: Site testing (app check)

We need to test the live site and document it in a new file called output/app_check.html (a page we can double click open). I did manual testing for all features already, so I will let you do this testing and build the file. In this file, include clear screenshots and short captions for: 1. Chat checking the inventory level of an item (honest stock/price from the DB), 2. The dynamic search-result cards appearing after a category question (e.g. hoodies) 3. One of the usability features added in Problem 9 (I let you choose the one you think may have the most impact). Make the html easy to grade: heading for each check, screenshot, one or two sentences on what the screenshot proves. Put the screenshot image files in output/app_check_images/ and link them from app_check.html with relative paths (for example app_check_images/inventory.png)

The app_check.html opened in a browser window here in Claude, but when I click on the links on the file, like "chat checks inventory", there is no reaction

You are right it works fine when I click on it in file explorer

---

Problem 12: Audit trail, safety, finish harness

Starting Problem 12: Audit trail, safety, finish harness

Keep an append-only output/audit_train.json of agent-loop activity (time, tool name, short args/result, stop reason). Do not wipe it between runs. Please suggest some safety rules to give to the agent and put them in prompts/prompt.md   Finish output/harness.md so it is clear how the system works: 1. Model fields in models.py and why you chose them, 2. Tools and abilities, 3. Safety rules and 4. Specs (loop limits, results caps, models, how to run front + back)

keep audit_trail.json, the name is fine

---

Problem 13: Push to GitHub and submit the URL

Starting Problem 13: Push to GitHub and submit the URL

[3 screenshots of the expected file layout: hw4/ with AI_prompts.md, requirements.txt, .env.example, .gitignore, README.md, frontend/ (Vite React TypeScript app), backend/ (main.py: FastAPI app, run with: uvicorn main:app --reload --port 8000; agent.py; models.py; tools.py; prompts/prompt.md), output/ (harness.md, design.md, usability.md, app_check.html, app_check_images/ screenshots linked from app_check.html, audit_trail.json); and a local-only data pack: data/ with campus_customs.db and products/ (images referenced by the catalogue)]

The code should already be in a folder called hw4, and push it to a public GitHub repository. Please give me the repo URL (the link graders can open and clone), which I will upload to the class platform called Canvas. We do not upload a zip for this homework. Do not put the real .env, campus_customs.db or product images in the GitHub repo. Use .gitignore. Include .env.example with placeholders only. See the expected file layout in the screen shot. I take two screenshots so you can see all text to the right. Local-only data pack (not in git) - see third screeshot starting with data/   The agent itself is four files under backend/: prompts/prompt.md, agent.py, tools.py and models.py. README.md should explain how to run the front end and back end after placing the data pack.

Can I open the website from the github page

So graders will clone it and will be able to see the website locally, correct

push the latest changes
