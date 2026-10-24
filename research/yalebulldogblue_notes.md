# Research: yalebulldogblue.com (Yale Bulldog Blue by Campus Customs)

Researched 2026-10-22 as reference for the HW4 storefront design and the agent's system prompt.

## Who they are

- Site title: "Yale Bulldog Blue Gear | Official Yale Merchandise, Apparel & Access"
- Footer: "Copyright © 2026 Yale Bulldog Blue by Campus Customs" — Bulldog Blue is the Yale storefront operated by **Campus Customs**.
- "Officially Licensed Merchandise" badge in header and footer.
- Physical store: **57 Broadway, New Haven, CT 06511** ("Come Visit Us!" map card in footer).
- Contact: **(475) 301-4205**, **orderdept@campuscustoms.com**. Contact form fields: Name, Email, Phone Number, Message.
- Many items are **made to order** (including custom alumni items with any graduation year).

## Policies (useful facts for the agent)

**Shipping**
- Made to order; most orders produced in **5–8 business days** (longer in peak seasons/promotions).
- Transit starts after production; mostly **UPS** domestically.
- Ships internationally; customer pays any customs/import fees.
- Tracking emailed when the order ships.
- Site does not publish shipping costs, free-shipping thresholds, or in-store pickup.

**Returns / refunds**
- Returns within **30 days of the shipping date**.
- Items must be unworn/unused with original tags and labels.
- **Final sale** and **custom-made items (e.g., Custom Alumni products) are not returnable**.
- Customer pays return shipping unless the store made an error.
- To return: ship it back with a trackable carrier and email the tracking number to orderdept@campuscustoms.com.
- Refunds exclude original shipping; 2–10 business days to appear.

## Catalogue structure (navigation)

- **Clothing**: Men's/Unisex, Womens, Youth, Infant & Toddler → T-Shirts & Tops, Jackets & Sweatshirts, Activewear, Polos, Bottoms
- **Accessories**: Hats, Neckwear, Jewelry, Pets, Bags, Souvenirs (Decals & Magnets, Keychains)
- **Home**: Decor, Pennants & Banners, Drinkware, Books, Office & Stationery
- **Collections**: Alumni, Class of 2026, Class of 2030
- **Residential Colleges** (14), **Sports** (21 teams), **Relatives** (Mom, Dad, Grandma, Aunt, Brother…), **Graduate & Professional Schools** (13)

Product naming conventions: "Big Yale …" (Big Yale Hoodie, Big Yale Pint Glass), "Arched Yale …", event items like "2025 Yale vs Harvard Distressed Hoodie", place items like "Beinecke Library Magnet".

Sample prices (USD): Big Yale Hoodie $39.99, Arched Yale Crewneck $69.99, 1900s Yale Y Hoodie $84.99, Arched Yale Dad Hat $29.99, Big Yale Mesh Back Hat $34.99, mugs $9.99–22.99, water bottles/tumblers $17.99–39.99, magnets/koozies $4.99, books $16.99–49.99. *Our agent must quote prices from campus_customs.db, not these.*

## Voice and tone

Upbeat, short, school-spirit slogans:
- "Yale Pride on the Go!"
- "Yale mornings start here"
- "Casual comfort, classic Bulldog pride"
- "ADD A TOUCH OF BULLDOG PRIDE"
- "SIP IN STYLE, THE BULLDOG WAY"
- "Shop Comfy Layers", "Shop Bulldog Blue"

## Visual style (from the site's theme CSS)

| Role | Value |
|---|---|
| Primary brand / buttons | Yale navy **#00366B** (official Yale Blue is #00356B) |
| Button hover | **#1A4A7A** |
| Secondary navy hover | #335E89 |
| Text / headings | **#1D1D1D** |
| Page background | #FFFFFF; light panels #F2F2F2 / #F4F4F4 |
| Footer background | warm cream **#F5F3ED** |
| Links | teal #046E82 |
| Sale / badge accent | coral **#F04F36** |
| Borders / inputs | #DDDDDD |
| Fonts | **Open Sans** (body, buttons), **Nunito Sans** (subheadings); headings weight 400, uppercase slogans |

Layout patterns:
- Header: logo, menu (mega-menu with category images), search, login, cart; "Officially Licensed Merchandise" strip.
- Hero / shoppable-image banners with a slogan and a "Shop …" call to action.
- Product grid of image cards: image (alternate image on hover), title, price, short material line (e.g., "50% Cotton, 50% Polyester Relaxed Fit"), "Quick shop" / "Choose options" button, "Sold out" or sale badge.
- Collection page: Availability filter (In stock / Out of stock), price range filter, sort (Featured, Best selling, A–Z, Price low→high, etc.).
- Footer: cream background, store address with map ("Come Visit Us!"), licensing badge, policy links (Terms, Refund, Privacy, Contact).

## Ideas for our build

- **Front end**: white page, navy #00366B header and buttons, cream #F5F3ED footer, Open Sans font, image-card product grid with an in-stock filter, coral badge for "Sold out" / "Low stock". The chat panel docked at the side or bottom right, in navy, with matching product cards appearing in the grid.
- **Agent prompt**: persona as the Campus Customs / Bulldog Blue shopping assistant; friendly, Bulldog-pride tone but concise. Always use tools to read price and size-level stock from the DB, and never guess. Know the store address, contact details, the 5–8 business day production time, and the 30-day return policy with its custom/final-sale exception. Say "I don't know" and point to orderdept@campuscustoms.com or (475) 301-4205 when unsure. Don't invent discounts.
