# Genessence Nexus: design brief

## What it is

Genessence Nexus is a decision hub for manufacturers. It sits on top of the client's SAP and the Genessence modules (Cost Engine, EXIM, NPD, Tooling, R&D Control Tower, Capex, Vendor Management). It watches all of them and turns what they know into signals: "copper is up 8%", "a compressor container is 9 days late", "a mould failed its trial". It then traces each signal across the business: parts, purchase orders, projects, plants, customers and the people responsible. The right person gets the news with the numbers and a recommended next step. Every action taken books its value to a ledger, and SAP documents later prove that value.

One line: **"Your systems already know. Nexus makes sure the right person knows, in time, with the data and the next step."**

## Project context

- **Who builds it.** Genessence, a small team that builds SAP-compliant workflow software for Indian manufacturers.
- **First client.** Amber Enterprises, a large Indian contract manufacturer of air conditioners and components. Amber has around 26 plants in North and South India, imports compressors, copper and electronics from China, Korea and Thailand, and builds for many AC brands.
- **The problem.** Genessence's modules each run in their own silo. EXIM knows a shipment is late, but NPD, whose prototype build needs those parts, never hears. The Cost Engine sees copper rising, but the buyer negotiating a price this week doesn't.
- **This build.** A frontend-only concept POC with realistic dummy data, used to pitch the platform to Amber leadership and future clients in other industries. A second, fictional client (an auto-parts maker) shows that the platform is configured per client, not rebuilt.
- **Data is real-shaped.** Field names come from Amber's actual SAP dictionary (EKPO-NETPR, MSEG-BWART, MARD-LABST and so on). Stage names come from the real modules. All names and figures are fictional.

## Who sees it, and where

**In the room**

The pitch is shown live on a projector (1440 px wide) to:
- the Managing Director and CFO
- the heads of Sourcing, R&D, EXIM and Quality, plus plant heads
- the client's SAP/IT lead

These people are senior, sceptical and numerate. They read ₹ in lakh and crore. They judge credibility in seconds: if a number looks invented or a screen looks like a template, the pitch is lost.

**In daily use (the vision being sold)**
- **MD and CFO:** a morning view of ₹ at risk, value delivered and launches at risk, often on a phone.
- **Buyers, cost engineers, NPD project managers, EXIM managers and planners:** their own queue of signals, which they open, judge and act on.
- **Finance:** validating savings against SAP evidence.

**Key screens**
1. **Command Center:** greeting, a one-line brief, KPIs, top risks, launch timeline, commodity watch, value.
2. **Signal Inbox:** a triage list.
3. **Impact Explorer:** the hero screen. It shows what happened, a ripple graph from the source record to the people affected, ₹ and days of impact with the formula shown, recommended workflows, who knows, and decision latency.
4. **Value Ledger:** identified, committed, realised, then finance-validated, plus a printable board pack.
5. **360 views:** part, vendor, project, shipment, plant, commodity and model.
6. **App Launcher and Source Hub:** every system in one place, including SAP field mapping.
7. **Nexus Assistant:** a chat that answers with tables, charts, SAP field citations and action cards.
8. **Mobile app:** push notification, triage and approvals.

## Design language

### The idea: "the instrument panel of a factory"

It should feel like a precision instrument that a CFO would trust and an engineer would respect. Think of what makes Apple's software good, not how it looks on the surface:
- **Clarity:** content first, chrome last.
- **Deference:** the interface steps back so the numbers lead.
- **Depth:** layers that explain hierarchy, used rarely and on purpose.

Add the editorial confidence of a good financial report (FT, Bloomberg Terminal restraint, Stripe's documentation) and the honesty of engineering drawings.

### Why the current UI reads as "AI slop" (do not repeat)

- **Decorative colour with no meaning:** gradient blobs, mesh backgrounds, glowing orbs.
- **Glassmorphism on every surface:** blur used as decoration, not to separate layers.
- **Purple-to-pink gradient heroes** and gradient buttons.
- **Identical rounded cards in grids,** each with a tiny grey label and a big number. Everything gets the same weight, so nothing leads.
- **Uniform 24px radii, soft shadows everywhere,** pill badges on every word.
- **Many small coloured chips competing on one line**, for source, severity, status and IDs.
- **Generic greeting heroes** ("Good morning, Vikram") taking a third of the screen.
- **Icons beside every label, emoji-like sparkles, and "AI" glyphs** on buttons.
- **Motion for its own sake:** drifting backgrounds, everything fading in.

### Principles

1. **One thing leads per screen.** The Impact Explorer leads with ₹ at risk and the cause, the Command Center with what needs you now. Everything else is quieter. Use scale and weight for hierarchy, not boxes.
2. **Numbers are the hero, and they are typeset like a financial report.** Use large figures with tabular numerals, the unit in a lighter weight, and the formula and source directly beneath in small text. A number without its source does not ship.
3. **Colour carries meaning only.** The UI is near-monochrome (warm off-white or graphite). Use one brand accent for interaction. Use status colour only where status exists: red for critical or at risk, amber for attention, green only for resolved. A screen with no problems should look calm and almost colourless.
4. **Structure through alignment, not containers.** Use a strict 12-column grid, generous outer margins and tight inner spacing. Separate with hairline rules and whitespace, not cards inside cards. Reserve cards for things you can act on.
5. **Show the mechanism.** The ripple graph and the stage rails are the product's proof, so draw them like engineering diagrams: thin strokes, clear labels, real dates, no decorative curves.
6. **Density where people work, air where people decide.** Tables, inbox and the SAP Field Explorer are dense, scannable and keyboard-first. The hero and Impact summary are spacious.
7. **Depth is functional.** Layers exist only for things that sit above the page (sheets, popovers, the assistant drawer, modals), with one consistent shadow. Use no blur, or blur only on the top bar.
8. **Motion explains change.** A signal arrives, a value moves from Committed to Realised, the ripple draws from cause to effect: each at 150–250 ms, never decorative, and off under reduced motion.

### Typography

- **One family, used with discipline.** SF Pro on Apple devices, Inter elsewhere. JetBrains Mono for SAP codes, document numbers and IDs only.
- **Scale:**

  | Role | Size | Weight |
  |---|---|---|
  | Display figure | 40–56 px | semibold |
  | Page title | 24–28 px | semibold |
  | Section | 13 px uppercase, tracked, muted | — |
  | Body | 14 px | — |
  | Meta (minimum) | 12 px | — |

- **Write headlines as statements of fact,** for example "Compressor shipment rolled. DV build slips 11 days." Avoid labels like "Shipment Delay Alert".

### Colour

- **Light:** paper `#F7F7F5`, ink `#14161A`, secondary `#585D66`, hairlines `#E4E2DD`.
- **Dark:** `#0B0D10` base, `#12151A` raised.
- **Accent:** one per client brand (teal by default; Amber could use a deep amber or indigo). Use it only for primary actions, links, focus and the selected state.
- **Status:** critical `#B91C1C`, attention `#92400E`, info `#1D4ED8`, resolved `#047857`. Each has a pale background used sparingly.
- **Source systems:** a small 8 px colour dot each, never a fill.

### Components (tone)

- **Buttons:** one primary per view, in solid accent with an 8px radius. Secondary buttons are outlined or plain text.
- **Badges:** severity only. Make status plain text in the right colour. Make IDs mono text, not chips.
- **Tables:** sticky headers, numbers right-aligned, row hover, and numbers in neutral ink unless they mean something.
- **Charts:** thin lines, no gridline clutter, direct labels on the series instead of legends, forecast as a dashed band. Safety stock or target as a single reference line.
- **Empty states:** one calm sentence about what Nexus is watching. No illustrations.

### Voice

- **Plain, specific and calm,** like a sharp chief of staff. For example: "Kaveri is already approved for this compressor at Supa. Extending to Rajpura covers 1,200 units."
- **Indian formats:** ₹ 57.6 L, ₹ 2.3 Cr, 16 Nov 2026, IST.
- **No em dashes. No exclamation marks. No "AI-powered".**

## Constraints

- **Design tokens only:** CSS variables, with both themes designed rather than inverted, and WCAG AA contrast in both.
- **Screens:**
  - **Desktop:** designed at 1440 px for a projector, and usable at 1280 px.
  - **Phone:** the app layout at 360–430 px.
- **Keyboard and accessibility:** full keyboard access, visible focus, and 12 px minimum text.
- **Honesty markers:** simulated integrations carry a small "Simulated" tag, and modules carry Live / Pilot / Roadmap badges. Keep these quiet but present.
- **Stack:** React with Tailwind v4, Recharts, lucide icons (used sparingly).

## References for feel

Apple Stocks, Health and Wallet, plus Apple's Human Interface Guidelines on hierarchy, clarity and deference; the Stripe Dashboard; Linear; Bloomberg Terminal (density and restraint); FT data graphics; and Swiss-style engineering drawings.
