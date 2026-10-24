# Campus Customs: "Game Day" Design (Problem 10)

**Concept.** The 142nd Yale vs Harvard **The Game** is on **Saturday, Nov 21, 2026 at Fenway Park**. We styled the store as a stadium on game week, with scoreboards, an LED ticker, jerseys, a football field and a press box, so the site feels like a live event, not a catalogue. Everything is drawn in code (CSS and SVG), and every number shown comes from real data: the database, the store facts and the game date.

**Why it matters:** an event gives shoppers a reason to buy *now*, and a site that's fun to explore keeps them browsing longer, which means more products seen and more chances to buy.

## Look and feel

| Change | What it is | Why it helps |
|---|---|---|
| Scoreboard typography | *Bebas Neue* (tall sports lettering) for headings, prices and buttons; *Open Sans* for reading text | Feels like stadium signage and jersey lettering; prices stand out |
| Stadium palette | Yale navy + white, scoreboard amber digits, stadium-light blue glows; Harvard crimson only for the rival | Strong Yale identity; the rivalry color adds excitement without taking over |
| Jersey stripes and pennants | Sleeve stripes on labels; section titles on felt pennants | Ties the site to the actual apparel; school-spirit mood |

## Features

| Change | What it does | Why it helps customers stay and buy |
|---|---|---|
| **Countdown scoreboard** (home) | YALE vs HARVARD scoreboard with flip-clock days, hours, minutes and seconds to game day | **Urgency:** a live countdown plus "printed to order in 5–8 days" nudges shoppers to order before the game |
| **LED ticker** (top of every page) | Scrolling strip: days to The Game, live stock counts ("78 styles in stock in size L"), 30-day returns, the store address | Repeats reasons to buy on every page; live stock numbers build trust |
| **"Gear Up for Fenway"** (home + collection) | A shelf of the real game merch (The Game tee, football tees, Gameday hood, Bulldog designs), "GAME DAY" badges and a "Shop Game Day" collection | Puts the most timely products first; one click to a curated collection |
| **Football scroll tracker** | Field strip under the nav; the ball moves as you scroll, and the end zone flashes "TD!" at the bottom | Playful reward for scrolling, so shoppers see more of the page and more products |
| **TOUCHDOWN! celebration** | Confetti burst when the chat puts products on the page | Makes using the assistant fun and draws the eye to the recommended products |
| **Player-card products** | Cards styled as football trading cards that **flip on hover** to a "stats" back (price, sizes in stock, color swatches) | Key buying info (sizes, colors) without opening the page; flipping invites exploring more items |
| **Day Game / Night Game** | A switch for a dark stadium theme, remembered between visits | Comfort for evening shoppers, and a memorable touch |
| **Jersey size picker** (product page) | Sizes drawn as jerseys: "BENCHED" when sold out, "2 LEFT" when low | Stock is clear at a glance; "2 left" adds healthy urgency |
| **LED stock board** (product page) | Stock per size as scoreboard numbers (green, amber for low, red "OUT") | Honest, glanceable availability, so fewer surprises and more confident buying |
| **Press box chat** | Chat styled as a broadcast booth with "● LIVE" and **Bulldog Bot**, a bulldog avatar; launcher "Ask the coach" | A friendly character makes shoppers more likely to ask for help, and the assistant leads them to products |
| **"Huddling…" indicator** | Spinning football with "Huddling… / Calling the play…" while the bot thinks | Makes the wait feel shorter and on-theme, so fewer shoppers give up |
| **"Boola Boola" easter egg** | Typing *boola* shows a cheer card, confetti and the real Boola Boola T Shirt ($32) | A surprise worth sharing, and it ends on a product link |
| **Stat tiles, hang-tag price** | "100% officially licensed", "5–8 days to print", "30-day returns" as LED tiles; the price on a hang tag | Trust signals where they're seen; the price reads like a real store tag |
| **Design credit** | "Design by Labubu Carl" (LinkedIn link) with a small waving Labubu-inspired buddy in the footer | Personal signature; small delight at the end of the page |

## Quality checks

- **Accessible:** for people who turn on "reduce motion", animations stop and the information stays. Screen-reader labels are on the timer, jerseys and stock board.
- **Mobile:** tested at phone width (375 px), with no horizontal scrolling. The scoreboard and pennants resize, and cards don't flip on touch (the shopping info stays on the front).
- **Night mode:** every page checked; two unreadable labels found and fixed.
- **Honest data:** stock, counts and prices come live from the database; game facts come from the official announcements.
- Build and lint clean, no console errors; tested in the browser (details in `output/harness.md`, Section 8).
