# Build prompt: Genessence Nexus, the manufacturing intelligence hub (concept POC, frontend only)

> Save this file as `docs/POC_PROMPT.md` in an empty project folder. Run it one milestone at a time (section 15).
> Start the first session with: "Read docs/POC_PROMPT.md and build milestone M1."
> "Genessence Nexus" is a working name. Change it in `src/config/brand.ts` only.
> v4.1, 16 Nov 2026: an action can be taken more than once per signal, alternate-supplier value is defined, QualityLot is marked Roadmap.
> v4, 16 Nov 2026:
> - Nexus is the central hub of the company: every employee has a profile. Role templates plus SAP-mapped scope; signal audience is computed, not hand-written (section 6).
> - Value Ledger: every saving is booked, attributed and proven by SAP documents (section 7.4).
> - KPI catalogue with default dashboards for each role, editable by the user (section 7.5).
> - Two scenarios that find money: S6 commodity pass-through clawback and S7 ECN obsolescence (section 10).
> - More Genessence modules in the catalogue: Price Approval Portal, Transport Portal, COIN, Costing & Specification System, Trolley Management.
> - "Add a user live" demo moment. The demo script is now 10 minutes (section 13).
> - Built in 4 milestones, with the invariants kept in `CLAUDE.md` (section 15).
> - Vendors stay in the Vendor Portal. A Nexus vendor role is shown as `Roadmap`.
> v3, 16 Nov 2026:
> - SAP-first, future-state concept, "bring your data" path, Nexus Assistant chatbot.
> - The SAP layer is now built on Amber's actual SAP field sheet. Copy `reference/SAP_Fields_Amber.xlsx` into `docs/` of the new project.
> - Light and dark themes are polished.
> - A mobile app preview page has been added.

---

## 0. Your role and the job

You are a senior frontend engineer and product designer. You are building a **pitch-grade, frontend-only concept POC** for Genessence. Genessence builds SAP-compliant software for manufacturers. Its first client is Amber Enterprises, an Indian HVAC and consumer-durables contract manufacturer.

**What this POC is:** a picture of the future. Every piece of software a manufacturer runs sits in one place, along with every data source. An intelligence layer on top tells each decision maker what is happening, what it means for them, and what to do next. It is the **central hub of the company**: every employee has a profile, and Nexus works out what each person sees from their role and scope. It also **finds money and proves it**: every resolved signal books a saving that SAP data later confirms.
- Some of what is shown exists today.
- Most of it is the roadmap.
- The POC shows the whole vision as if it were already live, with dummy data. Each capability carries a quiet badge (`Live`, `Pilot`, `Roadmap`) so the presenter stays honest.

**Hard rules:**
- Runs with **no backend, no real data, no network calls.**
- All data is dummy and internally consistent. If a shipment is late, the parts on it, the projects that need those parts, and the people who own those projects all line up.

## 1. The vision (the pitch in five points)

1. **Every system in one place.** Nexus brings together Genessence's own modules, the client's SAP, and any other tool the client already runs.
2. **No software? Bring your data.** If a function has no system, the client gives us its data (Excel, CSV, a shared folder, an API, an SAP extract). Nexus still produces the intelligence on top of it.
3. **Intelligence, not dashboards.** Nexus watches all of it, finds the signals that matter, follows their ripple across the business, tells the right person in time, and guides the next step. Users can also just **ask Nexus** in plain language.
4. **One hub, a profile for everyone.** Each person sees their own signals, KPIs and approvals, worked out from their role and scope. Add a new buyer and Nexus routes the right signals to them with no setup.
5. **Value, proven.** Nexus warns about risk and also finds money. Every saving is booked to a Value Ledger, and SAP documents confirm it.

> *"Your systems already know. Nexus makes sure the right person knows, in time, with the data and the next step."*

## 2. The problem we are selling against

At a typical manufacturer today, each system knows something the others never hear about:

| System | What it knows | Who it never tells |
|---|---|---|
| Cost Engine | Copper is up 8% in two weeks. Should-cost for 40 parts will rise. | Sourcing, NPD teams pricing a new model, Finance |
| EXIM | A compressor container from Shanghai is 9 days late. | NPD, whose DV build needs those compressors. The plant that planned on them. |
| NPD | A new 1.5T inverter AC needs a price lock this week. | Cost Engine, which could warn that the price is about to move |
| Tooling | The EPS mould failed trial T2. | The projects waiting on that tool |
| R&D | A launch milestone will slip 12 days. | Sales, the plant, Sourcing |
| Capex | The new moulding machine is 6 weeks late. | Production planning, NPD |
| Vendor Mgmt | A supplier's GST certificate expires in 5 days. | Every team with open POs, RFQs or shipments with that supplier |
| SAP QM / Excel quality sheets | A supplier's lot rejection rate tripled this month. | Sourcing, NPD (who are about to approve the same supplier for a new part) |
| Sales forecast in Excel | Summer pre-booking is up 18%. | Procurement, plant capacity, Capex |
| Cost Engine + SAP PO | Copper fell 6% last quarter. | The buyers whose vendors never brought their PO prices down |
| NPD (ECN) | A PCB has been superseded by a new revision. | Stores and Sourcing, who still hold stock and open POs for the old part |

## 3. Where data comes from: three doors into Nexus

The UI must make all three visible. This is the core of the "every software at one place" story.

**Door 1: Genessence modules (native)**
- Pre-built apps with a deep, real-time link to Nexus.
- Module catalogue with status badges:

| Status | Modules |
|---|---|
| **Live** | Cost Engine (should-cost + commodity intelligence), EXIM (import shipments, 23-stage lifecycle, duty, landed cost), NPD (new part / product development, NCD / ECN / Alternate Supplier), Tooling NTD (new tool development, trials), R&D Control Tower (stage gates CE, PROTO, DV, PP, MP), Capex (budget, RFQ, reverse auction, PO), Vendor Management (onboarding, compliance), Vendor Portal (one supplier login), Price Approval Portal (price approvals, approved price vs PO price), Transport Portal (FTL / PTL freight should-cost) |
| **Pilot** | COIN (cost optimisation and VAVE ideas pipeline), Costing & Specification System (chassis-based AC costing) |
| **Roadmap** | Quality (incoming inspection, supplier PPM, 8D, warranty), Production Planning & MES (plan vs actual, OEE), Inventory & Warehouse (stock cover, ageing), Maintenance (breakdowns, MTBF), Sales & Demand (forecast, orders), Finance (working capital, landed cost P&L), Sustainability / ESG (energy, carbon per unit), Workforce (skills, attendance, contract labour), Trolley Management (RFID tracking of customer-assigned trolleys) |

> Set every module badge to its real status before the demo.

**Door 2: SAP (primary ERP connector, the "SAP compliant" story)**
- SAP S/4HANA and SAP ECC are first-class. Show depth, not a logo.
- **Integration methods:** OData APIs, BAPI / RFC, IDocs, SAP BTP / Integration Suite (CPI), and CDS views for analytics. Each one shows a direction (read / write-back) and a schedule.
- **The SAP layer is built on Amber's actual SAP field sheet.** Amber's IT team supplied a field dictionary: 8 sheets, about 570 fields, each with an SAP table-field reference. The full condensed map is in **Appendix A**. The POC must use these exact field names and table-field codes wherever it shows SAP data: connector mapping screens, record detail sheets, source chips and Assistant citations. That way Amber's SAP team recognises their own system on screen.

| Amber SAP report | Key tables | Becomes in Nexus |
|---|---|---|
| Purchase Requisition (ME5A) | `EBAN`, `EBKN` | Requirement → the start of procure-to-pay |
| Purchase Order (ME2N/ME2M) | `EKKO`, `EKPO`, `EKET`, `LFA1` | Purchase order, open qty and value, release status |
| GRN | `MSEG`, `MKPF`, `EKBE`, `EKET` | Goods receipt, short qty, **delay days** vs `EKET-EINDT` |
| Material Master | `MARA`, `MARC`, `MBEW`, `MARM`, `MAST`, `AMPL` + Amber Z-fields | Part, with plant MRP data, price, BOM link, approved manufacturers |
| Inventory (MB52) | `MARD`, `MARC` | Stock by type: unrestricted, QI, blocked, in transit |
| FA Code | `ANLA`, `ANLC` | Capex asset, capitalisation, net book value |
| Import expense conditions | `PRCD_ELEMENTS` Z-conditions (`ZFR2` ocean freight, `ZCHA` CHA, `ZASD` anti-dumping, `ZDCS` demurrage...) | Landed cost per shipment and part |
| Vendor Master | `LFA1` (see note) | Vendor |

  The "Vendor Master" sheet in the file Amber sent is a copy of the PO sheet. Only `LFA1-NAME1` is confirmed. Use standard `LFA1`/`LFB1`/`LFM1` fields for the vendor, and show them in the UI with a `To confirm with Amber IT` tag. Fields the sheet marks "confirm in SE11" or "Custom Z-field – confirm" get the same tag on the SAP mapping screen.

- **Amber's own SAP fields that make the demo feel real.** They come from the Material Master sheet, and each should appear somewhere in the POC:
  - The **L1 to L6 commodity hierarchy**: L1 Category, L2 Commodity Family, L3 Commodity Group, L4 Commodity, L5 Sub Group, L6 Grade. It drives commodity impact: a copper spike hits every part whose L4 Commodity is Copper.
  - **Inverter Type** and **OBU / OBU Customer**. They let Nexus tie a part to a product line and to a customer.
  - **Sourcing Type** (Domestic / Import). It links a part to EXIM.
  - **Packing EPS / polybag / PP strap grams** and **EPR Category**. They feed the Cost Engine's EPS and polybag modules and a future ESG / EPR module.
  - **Size OD / ID / Thickness**, e.g. copper tube 9.52 OD × 0.35. These are the physical dimensions.
  - **Critical Part** (`MARC-KZKRI`), **ABC Indicator** (`MARC-MAABC`), **Planned Deliv. Time** (`MARC-PLIFZ`) and **Safety Stock** (`MARC-EISBE`). They drive the risk ranking and the stock-cover maths.

- **Other SAP areas** (QM `QALS`/`QMEL`, SD `VBAK`/`VBAP`, PM `EQUI`/`AUFK`, FI `ACDOCA`) are not in Amber's sheet yet. Show them as `Roadmap` mappings.

- **Write-back** (shown as a capability, simulated):
  - create a purchase requisition
  - update an info-record validity
  - block a vendor for purchasing
  - post a quality notification

  Each write-back needs human approval in Nexus.
- **Other ERPs** (Microsoft Dynamics 365, Oracle, Tally) appear as `Pilot` / `Roadmap` connectors.
- **Other sources:** Teamcenter PLM, ICEGATE, container tracking, LME and commodity feeds, email, Microsoft Teams.

**Door 3: Bring your data (no software needed)**
- For functions with no system. The client drops their data, and Nexus maps it and runs intelligence on it.
- **Accepted inputs:** Excel/CSV upload, shared folder (SharePoint / Google Drive / SFTP), email-in mailbox, REST API push, scheduled SAP extract.
- **The flow, shown as a clickable wizard (simulated):**
  1. **Upload.** Pick a sample file, e.g. `Sales_Forecast_FY27.xlsx` or `Incoming_Inspection_Oct.csv`.
  2. **Auto-detect.** Nexus detects the sheet and its columns.
  3. **Map columns.** Nexus maps the columns to Nexus entities: "Item No → Part", "Supplier → Vendor (fuzzy-matched to SAP `LFA1`, 94%)". Each mapping shows its confidence, and the user can correct it.
  4. **Data-quality report.** Rows OK, rows with an unknown part code, duplicates.
  5. **Schedule refresh.**
  6. **First insights.** These appear within the wizard. Example: "3 suppliers in this file have PPM above 2,000 and 2 of them are about to be approved in NPD."
- After the wizard runs, a **"Data Source" card** appears in the Source Hub. Roadmap module tiles show "Powered by your data today, native module coming". This is the key concept: intelligence first, software later.

## 4. Hard constraints

- **Frontend only.**
  - No server, no API routes, no database, no auth provider, no real AI or LLM calls.
  - Seed data lives in TypeScript files.
  - App state lives in a Zustand store persisted to `localStorage`, with a "Reset demo" control.
- **No real data.**
  - All people, vendors, vendor codes, prices, POs and shipment refs are fictional.
  - Industry vocabulary is fine: plant city names, product lines, commodities, Indian port codes, HS codes, incoterms, SAP table names.
  - Never put real employee names or real supplier names next to made-up commercial figures.
- **Deterministic.** Freeze "today" in `src/config/demoClock.ts` (default `2026-11-16`, IST). Compute every relative date from that constant.
- **Static build.** It must work offline after first load and deploy to any static host. Use HashRouter.
- **Honest badges.**
  - Anything simulated (SAP sync, write-back, upload parsing, email / Teams, the chatbot's reasoning) shows a small `Simulated` tag.
  - Every module and connector shows `Live`, `Pilot` or `Roadmap`.
  - A presenter setting can hide the badges for a cleaner demo. They are on by default.

## 5. Stack

- **Core:** Vite, React 18, TypeScript strict, Tailwind CSS v4, react-router (HashRouter), Zustand with persist.
- **UI:** Recharts, lucide-react, date-fns, sonner, and Radix or shadcn/ui primitives.
- **Ripple graph:** hand-rolled SVG with a layered layout. Do not use a heavy graph library.
- **Fonts:** Inter for UI, JetBrains Mono for codes, IDs, money and dates.

## 6. Users, roles and profiles (the central hub)

Nexus is where every employee works from, so it is built on **profiles**, not a fixed list of demo personas.
- A **role template** gives the defaults.
- A person's **scope** says what is theirs.
- **Personal settings** sit on top.
- Everything a person sees (signals, KPIs, approvals, Assistant answers) is computed from these three. Nothing is hand-assigned per signal.

### 6.1 Role templates (`src/config/roles.ts`)

Each template holds:
- `subscribes`: the signal types it receives, each with a minimum severity
- `defaultKpis`: KPI ids from the KPI catalogue (section 7.5)
- `landing`: the page it opens on
- `permissions`: entity and field access
- `approvals`: what it can approve, with limits (e.g. Plant Head approves capex up to ₹ 10 L)

22 templates:

| Function | Role templates |
|---|---|
| Leadership | MD, CFO, COO |
| Sourcing | Head of Sourcing, Category Manager, Buyer |
| Cost | Cost Engineer |
| NPD / R&D | Head of R&D / NPD, NPD Project Manager, Design Engineer |
| Tooling | Tooling Engineer |
| EXIM | EXIM Manager, EXIM Executive |
| Quality | Head of Quality, Supplier Quality Engineer |
| Planning & plant | Supply Chain Planner (PPC), Plant Head, Stores In-charge |
| Finance | Finance Controller / AP |
| Customer | Key Account Manager |
| Admin | SAP / IT Admin |
| External | Vendor, `Roadmap`. Vendors stay in the Vendor Portal. Nexus shows which signals are shared with them there (`Simulated`). |

### 6.2 Scope, mapped to SAP

Scope says what belongs to a person. Map it to SAP wherever SAP has the concept, so Amber's IT team recognises it.

| Scope dimension | SAP / source | Example |
|---|---|---|
| Plants | `MARC-WERKS` | 1001 Rajpura |
| Purchasing groups | `EKKO-EKGRP` / `MARC-EKGRP` | P01 copper desk. In SAP a buyer effectively is a purchasing group. |
| MRP controllers | `MARC-DISPO` | 101 |
| Commodities | Amber Z-fields L1 to L4 | L4 = Copper |
| Projects | NPD / R&D / NTD | `NCD-FY-2026-0041` |
| Vendors | `LFA1-LIFNR` | 0000104321 |
| Customers | OBU Customer (Amber Z-field) | Coolwave |

Leadership roles have scope `all`.

### 6.3 Personal settings

- Dashboard edits: add, remove and reorder KPI tiles, or reset to the role default.
- Notification channels per severity: in-app, email, Teams, WhatsApp. All except in-app are `Simulated`. Quiet hours.
- A **delegate** with dates. While the person is on leave, their signals and approvals route to the delegate, and "Who knows" shows this.
- Language and theme.

### 6.4 Computed audience (`src/engine/audience.ts`)

1. Take the signal's `entityRefs` and walk the graph to collect attributes: plants, purchasing groups, MRP controllers, L4 commodities, projects, vendors, customers.
2. A user is in the audience when their role subscribes to that signal type at that severity, AND their scope overlaps those attributes. Leadership needs the severity match only.
3. Apply delegation.
4. Give each recipient a **reason**, e.g. "Scope match: purchasing group P01, commodity Copper". The Impact Explorer's "Who knows" panel shows it.

Signals no longer store a hand-written audience. An optional `audienceOverride` exists for edge cases. `check:seed` asserts that each hero scenario's computed audience equals an expected list.

### 6.5 Login and onboarding

**Login:** a tenant selector, then a user directory with search and filters by function and plant. 8 **featured** users sit on top for the demo. The directory holds about 30 users. All names are fictional. Each card shows the name, title, plant scope, and one line on "what Nexus does for me".

| Featured user | Role template | Scope | Lands on |
|---|---|---|---|
| Vikram Rao | MD | All | Command Center (executive) |
| Anjali Menon | CFO | All | Command Center (finance lens) |
| Rohit Malhotra | Head of Sourcing | All purchasing groups | Signal Inbox |
| Sneha Iyer | Cost Engineer | L4 Copper, Aluminium | Commodity 360 |
| Arvind Pillai | Head of R&D / NPD | All projects | Programme view |
| Kavita Joshi | NPD Project Manager | `NCD-FY-2026-0041`, Coolwave programme | My Work |
| Farhan Qureshi | EXIM Manager | All import shipments | Shipments |
| Manoj Bhatt | Plant Head | 1001 Rajpura | Plant 360 |

**On login:**
- A **critical-signal pop-up** lists 1 to 3 new critical signals in this user's computed audience, with a "Review now" button.
- The **Nexus Assistant** greets the user with a one-line brief: "Good morning Kavita. 2 things need you today."

**First-login onboarding** (for a newly added user), 3 steps:
1. Confirm role.
2. Pick scope: plant, purchasing groups, commodities, projects.
3. Pick channels.

The dashboard then builds itself from the role's default KPIs, with a short "Here's what Nexus will watch for you" summary: the signal types, and how many open signals already match.

### 6.6 Add a user live (demo moment)

From People & Roles, the presenter adds a user: "Supplier Quality Engineer, plant 1001 Rajpura, commodity L4 BLDC Motor, vendor Sundara Precision Components". She completes onboarding, and the S4 pop-up appears straight away with the reason "Scope match: plant 1001, vendor Sundara Precision Components". No rule or signal was edited. This is the moment that proves the hub.

## 7. Information architecture

Left nav, grouped:

**Decide**

1. **Command Center** (`/`): role-aware home (section 7.1).
2. **Signal Inbox** (`/signals`)
   - Filters: severity, source (module / SAP / data drop), plant, entity type, status.
   - Status flow: New → Acknowledged → In action → Resolved, or Dismissed with a reason.
3. **Impact Explorer** (`/signals/:id`): the hero screen (section 7.2).
4. **Nexus Assistant** (`/assistant`): the full-page chatbot (section 8). It is also available everywhere as a floating launcher and drawer.
5. **Value Ledger** (`/value`): every saving Nexus helped deliver, from identified to finance-validated (section 7.4).

**Explore (360 views, one shared layout)**

6. The 360 pages:
   - Part 360
   - Vendor 360 (with a scorecard: OTD, quality PPM, cost index, compliance)
   - Project 360
   - Shipment 360
   - Plant 360
   - Commodity 360
   - Product Model 360 (BOM with risk heat per line)

**All software (the "one place" layer)**

7. **App Launcher** (`/apps`): the client's whole software estate on one grid.
   - What the grid contains:
     - Genessence modules (Live / Roadmap)
     - SAP Fiori app tiles (simulated deep links, e.g. "Manage Purchase Orders", "Stock – Single Material")
     - other tools (Teamcenter, Outlook, the plant MES, Excel trackers)
   - Each tile shows status, last sync, and 1 to 3 headline KPIs.
   - "Open" leads to a **module summary page** inside Nexus (`/apps/:id`). That page shows read-only KPIs, recent records and signals from that system, plus a deep-link placeholder.
   - Roadmap modules open a **concept page**: what the module will do, which signals it will raise, and "Powered by your data today" if a data drop feeds it.
8. **Source Hub** (`/sources`): all connections in one list.
   - Genessence modules, the SAP connector (detail page with the section 3 mapping table, method, schedule, and a last-run log of objects read / written), other connectors, and data drops.
   - Each entry shows health, freshness and record counts.
   - **SAP Field Explorer** (`/sources/sap/fields`): a searchable, filterable table of the Amber SAP field dictionary from Appendix A, grouped by report.
     - Columns: field name, table-field, data type and length, description, a "Used by Nexus for" chip, and a status chip (`Mapped`, `To confirm with Amber IT`, `Not used yet`).
     - A coverage meter shows "312 of 570 fields mapped". Clicking a field shows which Nexus screens and signals use it.
     - This screen tells Amber's IT team: "we already speak your SAP."
   - **Procure-to-pay chain view:** one PR → PO → GRN → Invoice chain drawn as linked cards, using the real field names: `EBAN-BANFN` → `EKKO-EBELN` / `EKPO-EBELP` → `MSEG-MBLNR` (mvt `101`) → `RBKP-BELNR`. Highlight the delay-days calculation against `EKET-EINDT`.
9. **Bring Your Data** (`/sources/new`): the upload and mapping wizard from Door 3.
10. **Data Fabric** (`/fabric`): the architecture-as-product screen.
   - **Diagram:** sources (3 doors), then canonical entities, then signal engine, then people and actions.
   - **Entity resolution:** one vendor known by an SAP `LFA1` number, a VMS code, an EXIM code and a name in an Excel file. Nexus merges them into one golden record with match confidence, and one conflict waits for a human.
   - **Lineage:** click any KPI and see which source and fields produced it.

**Mobile**

- **Mobile App Preview** (`/mobile`): shows what Nexus looks like as a phone app. Section 7.3 has the details.

**Govern**

11. **Rules** (`/rules`): a signal rule list with toggle, last fired time and fire count, plus a static "New rule" builder that saves to the store.
    Example: *"WHEN commodity change > 5% in 14 days AND part sensitivity > 0.3 THEN notify Sourcing owner + NPD PM of projects in PP Pricing, severity High."*
12. **Audit Trail** (`/audit`): an append-only log of every action, approval and SAP write-back.
13. **People & Roles** (`/admin/people`):
    - **Users:** the directory, add a user, assign role and scope, set a delegate.
    - **Role templates:** subscriptions, default KPIs, approvals and field access per role. Editable, saved to the store.
    - **Audience preview:** pick any signal and see who would get it and why.
    - **Field access:** role-based access to entities and fields. It explains why the Assistant only answers with what that user may see.
14. **My Profile** (`/me`): my role, my scope, what I own (projects, vendors, purchasing groups), my subscriptions, channels and quiet hours, my delegate, and the value I booked this year.

**Always present**

- ⌘K global search
- notification bell
- user switcher (searches the directory, featured users on top)
- tenant switcher
- **Assistant launcher** (bottom-right)
- **Presenter panel** (`Shift+D`), with controls to:
  - fire any scenario live
  - toggle the badges
  - reset the demo
  - jump to any step of the demo script

### 7.1 Command Center

- **Header:** greeting, the demo date, tenant and plant scope, and a one-line Assistant brief.
- **Row 1, KPI tiles** (from the user's KPI layout; role defaults are in section 7.5), for example:
  - value delivered FYTD (₹ Cr, from the Value Ledger)
  - savings vs target
  - ₹ at risk (30 days)
  - launches at risk
  - shipments delayed
  - commodity exposure (₹ Cr)
  - supplier PPM
  - capex utilisation
  - critical signals open
  - signal-to-action time
- **Row 2:**
  - **Top risks** (ranked cards): severity, headline, source chip, entity chips, ₹ / days impact, owner, "Open impact".
  - **Cross-system pulse:** systems × health (on track / attention / critical), including SAP and data drops.
- **Row 3:**
  - **Launch timeline:** NPD and R&D projects, with slip markers by cause (ship = import, wrench = tooling, ₹ = cost, shield = quality).
  - **Commodity watch:** sparklines for Copper, Aluminium, HR coil, ABS, PP, Styrene Monomer and USD/INR, each with its 30-day change and forecast arrow.
- **Row 4, Value:** a stacked bar of value by type (hard saving, cost avoidance, cash released, revenue protected, penalty avoided) for the user's scope, and the 3 latest wins with their status.

### 7.2 Impact Explorer

1. **Header:**
   - severity, title, source, raised time, owner
   - actions: Acknowledge, Assign, Snooze, Dismiss, "Ask Nexus about this"
2. **What happened:** the source data.
   - Shows things like a commodity chart with a forecast band, a shipment stage rail with planned vs revised ETA, a trial table, or a quality trend.
   - Show the source record ID, e.g. `SAP PO 4500012345 / item 10`.
3. **Ripple graph:** signal → parts → POs / shipments → projects / BOMs → plants → people.
   - Clicking a node opens a side sheet linked to its 360 page.
   - Edges carry labels such as "on shipment", "in BOM of", "needed for DV build by 02 Dec".
4. **Impact summary:**
   - ₹ impact, with the formula shown
   - slip days per project
   - units at risk
   - plants affected
5. **Recommended workflows:** 2 to 4 options.
   - Each option shows its effect, cost and owner, plus a "Proceed" button.
   - Proceed opens a 2 to 3 step stepper with pre-filled data.
   - Finishing it:
     - updates the signal status
     - writes to the audit trail
     - shows the record it created, e.g. "AS-FY-2026-0012 created in NPD" or "SAP purchase requisition 1000045678 created (Simulated)"
     - books a Value Ledger entry with status `Committed`, showing lever, baseline, formula and ₹ (section 7.4)
   - **A signal can take several workflows.** Each completed workflow books its own entry. The signal stays `In action` and lists the completed and remaining actions, until its owner marks it `Resolved` or every recommended action is done or dismissed. Example: in the demo, the NPD PM raises the Alternate Supplier request on S2 on desktop (step 5), and later the MD approves the air-freight partial for the same S2 on the phone (step 13).
6. **Who knows:** the users in the computed audience, the reason each one was included (scope match or delegation), whether each has seen it, and the channel (in-app, email, Teams, WhatsApp; all except in-app marked `Simulated`).
7. **Decision latency:** the time from when the first system knew (`firstKnownAt`) to when the owning user acknowledged. Example: "EXIM knew 9 days ago. NPD acknowledged 4 hours after Nexus told them."

### 7.3 Mobile App Preview (`/mobile`)

This page shows what Nexus feels like as a native phone app, for the "the MD gets it on his phone" moment.

**Layout of the preview page** (desktop presenter view):
- **Centre:** a realistic, generic phone frame (rounded device, notch / dynamic island, status bar reading 9:41 with signal and battery). Do not use Apple or Samsung branding.
- **Left rail:** a "Scenes" list the presenter clicks to jump between app states.
- **Right rail:** feature callouts that change with the current scene.
- **Toolbar:** a light / dark toggle that applies to the phone only, and a user picker.

**The app inside the frame** is a real, clickable mobile UI built from the same store and engine as the desktop app. It is not a set of screenshots. Its screens:
1. **Lock screen push notification.** It reads "Nexus · Critical: Compressor shipment ATF-IMP-2026-066 delayed 9 days. Coolwave launch at risk." Tap it to open the app on that signal. The presenter can fire this live from the Presenter panel, and it slides in.
2. **Splash and biometric sign-in.** A Face ID-style animation, shown as `Simulated`.
3. **Today (home):**
   - The user's greeting and Assistant brief.
   - 3 swipeable KPI cards from the user's KPI layout (MD default: value delivered FYTD, ₹ at risk, launches at risk).
   - A "Needs you" list.
4. **Signals:** a feed with severity chips. Swipe right to Acknowledge, swipe left to Snooze. Pull to refresh.
5. **Signal detail:**
   - What happened: a compact chart or stage rail.
   - The impact numbers.
   - A **vertical ripple list** that replaces the desktop graph on small screens.
   - Recommended actions shown as large buttons.
   - **Proceed** opens a bottom-sheet stepper.
6. **Approvals:** pending approvals in one list, e.g. a capex PO release (`EKKO-FRGZU`), an SAP PR (`EBAN`), a price-lock request, and a Value Ledger entry awaiting Finance validation. Each has an Approve / Reject bottom sheet and a "swipe to approve" control.
7. **Ask Nexus:** a full-screen chat with a voice-input button (it animates a waveform, then fills in a canned question; `Simulated`), suggested chips, and rich answer cards sized for mobile.
8. **Entity quick view:** a Part, Shipment or Vendor card with key SAP fields (for example `MARA-MATNR`, `MARC-PLIFZ`, unrestricted stock `MARD-LABST`) and a "Call vendor" or "Share" action.
9. **Profile:** theme (System / Light / Dark), notification preferences by severity and module, language (English / हिन्दी), quiet hours, my scope (read-only) and my delegate.

**Mobile app conventions:**
- A bottom tab bar with Today, Signals, Ask, Approvals and Me. Badges show counts.
- Large tap targets (44px minimum).
- Safe-area padding.
- Haptic-style micro-animations on actions, done as a scale pulse.
- Bottom sheets instead of modals.
- Skeleton loading.

**Standalone and installable:**
- **Phone layout:** the same mobile screens are served at `/m/*` without the frame, so a presenter can open the URL on a real phone.
- **Web app manifest:** add a `manifest.webmanifest` and icons, so "Add to Home Screen" works as a PWA. That is the "it's already an app" moment.
- **Root redirect:** on viewports narrower than 640px, the root route redirects to `/m`.

### 7.4 Value Ledger (`/value`)

Nexus does not only warn. It books the value of every action it helped with, and SAP data later proves it. This is the screen the CFO signs off on.

- **Entry fields:** id (`VAL-FY27-0001`), signal, lever, value type, baseline, formula, ₹ amount, owner, plant, status, evidence.
- **Value types.** Keep them separate. Never show one "savings" total without the split.
  - **Hard saving:** price below baseline.
  - **Cost avoidance:** an increase that did not happen.
  - **Cash released:** working capital freed (inventory, payment terms).
  - **Revenue protected:** units delivered on time × contribution per unit.
  - **Penalty avoided:** demurrage and detention (`ZDCS`, `ZCDT`), line-stop cost, customer penalties.
- **Baselines**, configurable per tenant in `src/config/savings.ts`:
  - last price paid (`EKPO-NETPR` on the previous PO)
  - standard price (`MBEW-STPRS`)
  - budget
  - should-cost
  - forecast price (for avoidance)
- **Status pipeline:** Identified → Committed → Realised → Finance-validated.
  - **Identified:** a signal estimated it.
  - **Committed:** a workflow was completed.
  - **Realised:** SAP evidence arrived. Example: GRN `MSEG-BWART` 101 posted at the locked `EKPO-NETPR`. Realised value = (forecast price − locked price) × GR qty. Show the evidence document numbers.
  - **Finance-validated:** the Finance Controller or CFO approves it, on desktop or as a mobile approval.
- **Attribution.** When several signals touch the same project or part, `src/engine/attribution.ts` splits the value by rule (default: by ₹ contribution) so totals are never double-counted. The entry shows "shared with SIG-xxx".
- **Views:**
  - a waterfall from identified to validated, FYTD
  - value by type, lever, plant, function and person
  - savings vs target per sourcing category (targets set per tenant)
  - an ROI strip: validated value ÷ Nexus subscription fee (dummy fee in tenant config)
- **Seed:** about 25 entries across all statuses, including the history of the 6 resolved signals. S1, S2, S6 and S7 add entries when their workflows run. Every ₹ figure is computed by the engine.
- **Board pack:** a "Board pack" button opens a print-styled page (print CSS and `window.print()`): value waterfall, top 5 wins, top 5 open risks, launches at risk. "Email to board" carries a `Simulated` tag.

### 7.5 KPI catalogue and dashboards by role

`src/config/kpis.ts` defines every KPI once:
- `id`, `label`, `unit`
- `formula`: the name of an engine function
- `sourceFields`: the module or SAP table-fields it uses (these feed the hover provenance)
- `goodDirection`
- `drill`: the page it opens

Dashboards are lists of KPI ids. The role sets the default and the user can change it ("Edit dashboard": add from the catalogue, remove, reorder, reset to the role default).

Default layouts:

| Role | Value KPIs (₹) | Operational KPIs | Key sources |
|---|---|---|---|
| MD | Value delivered FYTD by type, ROI multiple | Launches on time %, decision latency, critical signals open | Value Ledger, R&D |
| CFO | PPV (actual vs standard price), commodity exposure hedged %, landed-cost variance (estimated vs actual Z-conditions) | Inventory days, QI + blocked stock value, capex utilisation | `EKPO-NETPR` vs `MBEW-STPRS`, `PRCD_ELEMENTS-KWERT`, `MARD-INSME` / `MARD-SPEME`, `ANLC` |
| Head of Sourcing, Category Manager | Savings vs target, should-cost gap pipeline, pass-through recoverable (S6), reverse-auction savings | Spend under contract %, single-source exposure, PR → PO cycle time, POs without a PR | `EKPO-INFNR`, `EKPO-KONNR`, `AMPL`, `EBAN-BADAT` → `EKKO-BEDAT`, `EBAN-EBELN` |
| Buyer | Price-lock savings on my purchasing groups | PRs ageing, POs awaiting release, contracts expiring in 30 days | `EBAN`, `EKKO-FRGZU`, `EKKO-KDATE` |
| Cost Engineer | VAVE savings implemented (COIN), packaging cost per unit (EPS / polybag grams) | Should-cost coverage % of spend, commodity forecast accuracy | Cost Engine, COIN, Material Master Z-fields |
| Head of R&D / NPD, NPD PM | Target-cost attainment at PP gate, tooling cost vs budget, obsolescence avoided (S7) | Gate slip days, first-time-right tool trials, blockers open | NPD, NTD, R&D, `MARD-LABST` |
| EXIM Manager / Executive | Demurrage and detention avoided, air freight avoided | BOE-to-clearance days, ETA accuracy, shipments under query | EXIM, `ZDCS`, `ZCDT`, `ZFR1` |
| Head of Quality, SQE | Cost of poor quality avoided (returns, blocked stock released) | Supplier PPM, lots in QI, 8Ds open and ageing | `MSEG-BWART` 122 / 103 / 105, `MARD-INSME` / `MARD-SPEME` |
| Supply Chain Planner | Premium freight avoided | Stock cover vs safety stock, parts at stock-out risk, lead-time drift (actual vs `MARC-PLIFZ`) | `MARD-LABST`, `MARC-TRAME`, `MARC-EISBE`, `MARC-PLIFZ`, GRN delay days |
| Plant Head | Line-stop hours avoided × ₹ per hour | Critical parts below cover, supplier PPM, capex on time | `MARC-KZKRI`, `MARD`, Capex |
| Finance Controller | Value awaiting validation, value validated FYTD | Landed-cost variance, inventory value by stock type | Value Ledger, `PRCD_ELEMENTS`, `MARD` × `MBEW-VERPR` |
| Key Account Manager | Revenue protected for my customers | Customer launches at risk, price-revision notices pending | R&D, NPD, OBU Customer |

Roles not listed take the closest template's layout.

**PPV formula:** (`EKPO-NETPR` ÷ `EKPO-PEINH` − `MBEW-STPRS` ÷ price unit) × GR qty, netting movement types 102 and 122.

**Decision latency** is the cross-role headline KPI. Show it on every signal and as a trend line ("9 days → 4 hours").

## 8. Nexus Assistant (the chatbot)

A conversational layer over everything in Nexus. In the POC it is **scripted and deterministic**, with no LLM. It must still feel smart and answer from the seed data.

**Where it lives:**
- A floating launcher that opens a right-side drawer on every page.
- A full page at `/assistant` with conversation history on the left.
- Context-aware: opened from a signal, a 360 page or a KPI, it already knows that context ("Ask about this shipment").

**What it can do (show all of these):**
1. **Answer across systems.** "Which launches are at risk because of imports?" returns a table of projects with cause, slip days and links.
2. **Look up any entity.** "Status of ATF-IMP-2026-066", "What's our exposure to Hanbit Copper Tube?", "Show part CT-1180". These are resolved with an entity matcher over the seed, so they work for every ID, name and code in the data, not just the hero ones.
3. **Explain a signal.** "Why is this critical?" gets a short, step-by-step reasoning with numbers and the formula.
4. **Charts in answers.** Answers can include inline charts and KPI cards, e.g. copper 90-day trend, ₹ exposure by plant, supplier PPM trend.
5. **Cite sources.** Every answer ends with source chips naming the module or SAP table-field, plus an "as of" time.
   - SAP chips use Amber's field names, e.g. `SAP EKPO-NETPR`, `SAP MSEG-BWART 101`, `SAP MARD-LABST`.
   - Other chips name the module or file, e.g. `EXIM shipment` or `Sales_Forecast_FY27.xlsx`.
   - Clicking an SAP chip opens that field in the SAP Field Explorer.
6. **Explain SAP.** Users can ask what a field or code means and get a plain-language answer from Appendix A.
   - "What does movement type 122 mean?" → return to vendor.
   - "What is ZDCS?" → Container demurrage / storage charges.
   - "Why is this PO not released?" → `EKKO-FRGZU` release state.
7. **Take actions, with confirmation.** "Raise an alternate supplier request for the compressor" renders an action card with pre-filled fields and Confirm / Edit / Cancel buttons. Confirming runs the same workflow as the Impact Explorer and writes to the audit trail.
8. **Daily brief.** "What should I focus on today?" gives a top 3 for that user's role and scope.
9. **What-if.** "What if copper goes up another 5%?" recomputes the ₹ exposure with the cost engine function and shows the delta.
10. **Ask your uploaded data.** "Which suppliers in the inspection file are also in active NPD projects?" This shows that Door 3 data is queryable.
11. **Follows permissions.** If a user asks for something outside their role or scope, the Assistant says so politely. Example: the Plant Head asking about the CFO's capex budget across all plants.
12. **Language.** A Hindi / English toggle with 4 to 5 pre-translated answers, to show the direction. Mark it `Roadmap` if you prefer.
13. **Value questions.** "How much have we saved this quarter?" returns the ledger split by type and status, with a chart. "What's my savings vs target?" answers for the user's own scope.
14. **Who gets this?** "Who would be told if Hanbit Copper Tube is late?" runs the audience engine and lists users with their reasons.
15. **Find money.** "Where can we recover money?" lists the S6 and S7 opportunities with ₹ and the next step.

**Implementation (frontend only):**
- **`src/assistant/intents.ts`:** about 30 intents. Each intent holds:
  - match patterns (keywords or regex)
  - required entities
  - a resolver function that computes the answer from the store and engine
  - a renderer that returns rich blocks (`text`, `table`, `chart`, `kpi`, `entityLinks`, `actionCard`, `sources`)
- **`src/assistant/entityMatcher.ts`:** finds IDs, codes, names and plant / commodity words in the user's text (fuzzy, case-insensitive).
- **Streaming feel:** stream answers word-by-word (about 15 ms per token), with a short "Looking at EXIM, SAP MM, NPD..." step list first, so the audience sees which systems it checks.
- **Prompts:** suggested-prompt chips change per role and per page. Follow-up chips appear under each answer.
- **Fallback:** "In the full product I'd query this live across your systems. Here's what I can show now:" followed by the closest 3 intents.
- **History:** conversation history is persisted. A "Clear chat" button resets it.
- **Badge:** the Assistant carries a `Simulated` tag.
- **About panel:** a short "How it works in production" panel. It says the production Assistant is an LLM that uses the data fabric's permissioned tools, can read SAP and other sources, always cites what it used, and only writes after human confirmation.

## 9. Canonical data model (seed shape)

Write `src/data/types.ts`, and put the seed in `src/data/seed/<tenant>/*.ts`. Every foreign key must resolve. `npm run check:seed` asserts this.

```
Tenant        { id, name, industry, erp: { system: 'SAP S/4HANA'|'SAP ECC'|..., methods[] }, modules: {id, status}[] }
Source        { id, kind: module|sap|connector|datadrop, name, status, lastSync, records, objects[] }
Plant         { code, name, city, state, sapPlant (4-digit, e.g. 1001), productLines[] }
RoleTemplate  { id, name, function, subscribes: {signalType, minSeverity}[], defaultKpis[], landing, permissions[], approvals: {type, limitInr?}[] }
UserProfile   { id, name, title, roleId, featured?,
                scope: { all?, plants[], purchasingGroups[] /*EKGRP*/, mrpControllers[] /*DISPO*/, commodities[] /*L4*/, projects[], vendors[], customers[] },
                kpiLayout?, channels: {severity, channel}[], quietHours?, delegate?: {userId, from, to}, language, theme }
KpiDef        { id, label, unit, formula /*engine function name*/, sourceFields[], goodDirection, drill }
ValueEntry    { id, signalId?, lever, type: hard|avoidance|cash|revenue_protected|penalty_avoided, baseline: {kind, value}, formula, amountInr,
                ownerId, plant?, status: identified|committed|realised|validated, evidence[] /*SAP doc refs*/, sharedWith[], validatedBy?, at }
Commodity     { slug, name, category, unit, series[], forecast[] }
Vendor        { id, name, country, category, status, sapVendor (LFA1, e.g. 0000104321), aliases: {sourceId, code}[], compliance[], scorecard: {otd, ppm, costIndex} }
// SAP-shaped records keep SAP field names in a `sap` object, so detail sheets can show "label · TABLE-FIELD · value".
Part          { code /*MARA-MATNR*/, supersededBy? /*via ECN*/, description /*MAKT-MAKTX*/, materialType /*MARA-MTART ROH|HALB|FERT|VERP*/, materialGroup /*MARA-MATKL*/,
                commodityHierarchy { l1, l2, l3, l4, l5, l6 } /*Amber Z-fields*/, inverterType?, obuCustomer?, sourcingType: 'Domestic'|'Import',
                sizeOd?, sizeId?, sizeThickness?, packingEpsG?, packingPolybagG?, eprCategory?, baseUom /*MARA-MEINS*/, grossWeight /*MARA-BRGEW*/,
                plants: { plant /*MARC-WERKS*/, purchasingGroup /*MARC-EKGRP*/, mrpType /*MARC-DISMM*/, plannedDelivDays /*MARC-PLIFZ*/,
                          safetyStock /*MARC-EISBE*/, abc /*MARC-MAABC*/, criticalPart /*MARC-KZKRI*/, standardPrice /*MBEW-STPRS*/, movingPrice /*MBEW-VERPR*/ }[],
                hsCode, vendors[], shouldCost, sensitivity, kgPerUnit }
ProductModel  { id, name, productLine, tonnage, starRating, customer (fictional), plannedUnitsQ, bom /*MAST-STLAN usage 1*/: {partCode, qtyPer}[] }
PurchaseReq   { banfn /*EBAN-BANFN 10xxxxxxxx*/, item /*EBAN-BNFPO*/, docType /*EBAN-BSART*/, material, qtyRequested /*EBAN-MENGE*/, qtyOrdered /*EBAN-BSMNG*/,
                deliveryDate /*EBAN-LFDAT*/, plant, purchasingGroup, requisitioner /*EBAN-AFNAM*/, releaseStrategy /*EBAN-FRGST*/, poNumber? /*EBAN-EBELN*/ }
PurchaseOrder { ebeln /*EKKO-EBELN 45xxxxxxxx*/, docType /*EKKO-BSART NB|UB|Z-import|Z-capex*/, category /*EKKO-BSTYP F|L|K*/, purchasingGroup /*EKKO-EKGRP*/,
                purchOrg /*EKKO-EKORG*/, vendor /*EKKO-LIFNR*/, docDate /*EKKO-BEDAT*/, currency /*EKKO-WAERS*/, releaseState /*EKKO-FRGZU*/,
                lines: { item /*EKPO-EBELP*/, material /*EKPO-MATNR*/, plant /*EKPO-WERKS*/, qty /*EKPO-MENGE*/, netPrice /*EKPO-NETPR*/, priceUnit /*EKPO-PEINH*/,
                         acctAssignment /*EKPO-KNTTP, A = asset*/, deliveryDate /*EKET-EINDT*/, stillToDeliverQty, stillToInvoiceQty }[] }
GoodsReceipt  { mblnr /*MSEG-MBLNR*/, item /*MSEG-ZEILE*/, movementType /*MSEG-BWART 101|102|103|105|122*/, postingDate /*MKPF-BUDAT*/, deliveryNote /*MKPF-XBLNR*/,
                ebeln, ebelp, material, plant, vendor, qty /*MSEG-MENGE*/, shortQty, delayDays /*GR date vs EKET-EINDT*/, assetCode? /*EKKN-ANLN1*/ }
StockPosition { plant /*MARD-WERKS*/, sloc /*MARD-LGORT*/, material, unrestricted /*MARD-LABST*/, qualityInsp /*MARD-INSME*/, blocked /*MARD-SPEME*/, inTransit /*MARC-TRAME*/ }
Asset         { anln1 /*ANLA-ANLN1*/, description /*ANLA-TXT50*/, capitalisedOn /*ANLA-AKTIV*/, acquisitionValue /*ANLC-KANSW*/, accDepreciation /*ANLC-KNAFA*/, capexNo? }
LandedCost    { shipmentRef, ebeln, conditions: { type /*ZFR2|ZINS|ZCHA|ZCFS|ZASD|ZDCS|ZTHC...*/, name, amountInr }[] }
SapField      { report, label, tableField, dataType, description, status: mapped|to_confirm|unused, usedBy[] }   // generated from Appendix A
Shipment      { ref, poNumbers[], vendorId, mode, incoterm, pol, pod, plant, stage, etdPlanned, etdActual?, etaPlanned, etaRevised?, containers[], lines[] }
QualityLot    { lot (SAP QALS), partCode, vendorId, plant, date, qtyInspected, qtyRejected, decision }   // Roadmap: Amber's sheet has no QM fields. S4 uses GoodsReceipt (MSEG-BWART 103/105/122) + StockPosition (MARD-INSME/SPEME). Seed QualityLot only for the Roadmap QM concept page.
DemandLine    { sourceId (datadrop), productModelId, month, units }
Project       { id, type: NCD|NPD|ECN|AS|RND|NTD, title, productModelId?, stage, stagePlan[], owner, needs[], rag }
Tool          { id, title, commodity, vendorId, stage, trials[], neededByProject, etaCommissioning }
CapexRequest  { no, title, plant, budgetCr, status, vendorId?, deliveryPlanned, deliveryRevised?, enablesProject? }
Signal        { id, sourceId, type, severity, title, raisedAt, entityRefs[], facts, impact, audienceOverride? /*audience is computed, section 6.4*/, firstKnownAt, valueEstimate?, recommendations[], status, ruleId }
Recommendation{ id, title, effect, cost, owner, steps[], target: {system, recordType}, createdRecordRef? }
AuditEntry    { at, userId, signalId?, action, detail, writeBack? }
ChatMessage   { id, role, blocks[], at, context? }
```

Impact and value numbers come from pure functions in `src/engine/`: `costImpact`, `slipPropagation`, `audience`, `qualityRisk`, `demandGap`, `whatIf`, `passThrough`, `obsolescence`, `valueLedger`, `attribution`, `kpis`. The UI and the Assistant both call these. Nothing is typed into the UI by hand. `check-seed.ts` verifies that the stored signal impacts equal what the engine computes.

### Reference vocabulary

- **Plants:** Rajpura, Dehradun DDN-IV/V/VI, Rudrapur, Jhajjar P1/P2, Noida, Supa, Sri City, Kancheepuram. SAP plant codes are 4 digits.
- **Product lines and models:**
  - RAC (split / window, 0.75 to 2.0 TR, 3 and 5 star, inverter)
  - LCAC / Cassette (2 to 4 TR)
  - Ductable (5.5 to 21 TR)
  - Tower AC
  - Air Purifier & Water Dispenser
- **Customers (fictional):** "Coolwave", "Nordis", "Himalaya Cooling", "Brand A (Japanese OEM)".
- **Commodities:**
  - LME Copper about 11,100 USD/MT
  - Aluminium in USD/MT
  - HR/CR coil in INR/MT
  - ABS, PP and HDPE in INR/kg
  - Styrene Monomer and Pentane in USD/MT
  - USD/INR about 89
  - Duty: BCD 7.5% + SWS 10%
- **Parts:**
  - Compressor Assy (rotary, R32)
  - BLDC Fan Motor
  - Copper Tube IGT 7mm × 0.22mm
  - Aluminium fin stock
  - Service Valve
  - Outdoor inverter PCB Assy
  - EPS packing set 1.5T
  - Wire harness 0.75 sqmm
  - Condenser coil bracket
  - ODU fan guard
  - Louver panel
- **EXIM:**
  - Shipment refs like `ATF-IMP-2026-066`
  - POLs: CNSHA, CNNGB, KRPUS, THLCH, VNHPH
  - PODs: INNSA1, INMUN1, INMAA1, and the Patli and Garhi ICDs
  - Incoterms: FOB and CIF
  - Stages: `so_confirmed`, `in_transit`, `about_to_reach`, `boe_filed`, `under_query`, `customs_cleared`, `delivered`
- **NPD:**
  - IDs: `NCD-FY-2026-0041`, `ECN-FY-2026-0007`, `AS-FY-2026-0009`
  - Stages: Supplier Sourcing, Supplier Dispatch, Design & Feasibility, R&D Testing & TQR, DQA Testing, R&D Approval, FPA Docs, PP Pricing, PP Order & Delivery, Closure
- **R&D:**
  - Stage gates: CE → PROTO → DV → PP → MP
  - Slip reason codes: SUPPLIER, TEST_FAIL, DESIGN_CHANGE, WAITING_DEPT, CUSTOMER, CAPACITY, LAB_SLOT
- **Tooling:**
  - Stages: RFQ → DFM → Mould Design → Manufacturing → Trials T1..Tn → Commissioning
  - Trial checks: dimensional, surface Ra, hardness, flash, ejection, fit, cycle time
- **Capex:** requests like `CAP-2526-0014`, amounts in ₹ Crore, plant-head approval needed above ₹10 L.
- **Vendors (fictional):**
  - Names: "Shenghai Compressor Co.", "Hanbit Copper Tube", "Sundara Precision Components", "ThermoPack EPS", "Meridian Cargo Logistics"
  - Each vendor has an SAP vendor number plus 1 to 3 aliases in other sources. This feeds the entity resolution story.

### Seed volume

- **Amber tenant (full):**
  - 10 plants
  - 22 role templates and about 30 users (8 featured)
  - 8 commodities with 12 months of series data
  - 30 vendors
  - 60 parts
  - 6 product models with BOMs
  - 25 POs
  - 18 shipments
  - 40 quality lots (Roadmap QM concept page only; S4 is driven by GRNs and stock)
  - 2 data drops (sales forecast, incoming inspection)
  - 20 projects
  - 6 tools
  - 10 capex requests
  - about 48 signals, including 6 resolved ones with audit history
  - about 25 Value Ledger entries across all statuses
- **Second tenant:** a light seed (section 11).

## 10. Hero scenarios (build first, make flawless)

Each scenario exists in the seed as an open signal. Each can be fired live from the Presenter panel. Each has a working recommended workflow, and the Assistant can explain it.

**S1. Copper forecast spike** (Cost Engine + SAP info records → Sourcing, NPD, Finance)
- **Signal:** LME Copper is up 8.4% in 14 days, with a forecast of a further +4 to 7%.
- **Affected parts:** 38 parts whose Amber Z-field `L4 Commodity` = Copper and whose sensitivity is above 0.3. Copper tubes are identified by `Size OD` × `Thickness`, e.g. 9.52 × 0.35. Last prices come from `EKPO-NETPR` on open POs and from info records `EKPO-INFNR`.
- **Cost impact:**
  - ₹ 412 per unit on the 1.5T 5-star inverter split
  - ₹ 2.3 Cr exposure this quarter
- **Projects caught by it:**
  - `NCD-FY-2026-0041` is in PP Pricing, and its quote validity expires in 3 days
  - `ECN-FY-2026-0007` is mid-negotiation
- **Notify:** Head of Sourcing, Cost Engineer, NPD PM, CFO
- **Workflows:**
  - Request a price lock from 3 vendors
  - Forward-buy 2 months of copper tube. This creates SAP PR `EBAN-BANFN` 1000045678 with `EBAN-BSART` NB, purchasing group P01 and a release strategy; it is `Simulated`.
  - Send a customer price-revision notice
  - Re-run should-cost at the forecast high

**S2. Import delay hits a launch** (EXIM → NPD, R&D, Plant, MD)
- **Signal:** `ATF-IMP-2026-066`, 2 × 40' of rotary compressors on SAP PO `4500012345`.
- **Route:** CNSHA → INNSA1 → Patli ICD → Rajpura.
- **Delay:** the shipment was rolled, so the ETA moves +9 days.
- **Project hit:** the DV build of "Coolwave 1.5T 5-star Inverter 2027" slips 11 days. That moves the PP gate and the customer launch.
- **Plant hit:** 4,200 December units at risk at Rajpura.
  - Stock cover: unrestricted `MARD-LABST` plus in-transit `MARC-TRAME`, against safety stock `MARC-EISBE`. Cover runs out on 28 Nov.
  - The part is flagged `MARC-KZKRI` Critical Part.
- **Cost of waiting:** a vessel rolled at origin does not cause demurrage, so the exposure is the line stop: revenue at risk = units at risk × contribution per unit. The port risk comes after arrival. If the BOE is not filed in advance, containers can sit past their free days at a congested INNSA1, and each extra day costs about ₹ 38,000 for the 2 containers (`ZDCS` + `ZCDT`). Show the landed-cost waterfall (`ZFR2`, `ZINS`, BCD, `ZCHA`, `ZCFS`, `ZTHC`...) on Shipment 360.
- **After arrival:** the GRN (`MSEG-BWART` 101) will post with Delay Days computed against `EKET-EINDT`.
- **Workflows:**
  - Air-freight 300 units as a partial, with the cost shown
  - Re-sequence the DV build
  - Raise an Alternate Supplier request (creates `AS-FY-2026-0012` in NPD)
  - Notify the customer programme manager

**S3. Tool trial failure** (Tooling → NPD, R&D)
- **Signal:** the EPS packing mould failed trial T2, on dimensional and flash.
- **What it does:** the job goes back to Mould Design for the failed component only.
  - Commissioning moves +16 days
  - `NCD-FY-2026-0049` FPA is blocked
  - The R&D "EPS tooling" activity goes red
- **Workflows:**
  - T3 fast-track
  - Bridge supply from a soft tool
  - DQA deviation waiver

**S4. Supplier quality from SAP stock and GRN data** (SAP MM → Sourcing, NPD, Plant)
- **Signal:** BLDC fan motor deliveries from "Sundara Precision Components" show returns to vendor (`MSEG-BWART` 122) and GRs into blocked stock (103) rising from 650 to 2,400 PPM over 6 weeks. 1,150 units are sitting in quality inspection and blocked stock (`MARD-INSME`, `MARD-SPEME`) at Rajpura.
- **Data sources:** these fields are all in Amber's sheet. Full SAP QM (`QALS`) is shown as the `Roadmap` upgrade.
- **Compliance on top:** the same vendor's GST certificate expires in 5 days (Vendor Mgmt).
- **Conflict:** NPD is about to approve this vendor for a new part in `NCD-FY-2026-0052`.
- **Workflows:**
  - Raise a supplier 8D / quality notification (SAP `QMEL`, `Simulated`)
  - Hold the NPD approval
  - Shift the share of business to the alternate vendor
  - Send a VMS regularisation request

**S5. Demand uplift from a data drop** (Door 3: `Sales_Forecast_FY27.xlsx` → Procurement, Plant, Capex)
- **Signal:** summer pre-booking is up 18% for 1.5T models. This comes from the client's uploaded sales forecast; there is no sales software.
- **What it means:**
  - BOM explosion shows the compressor and copper tube cover falls short in March
  - Jhajjar P2 moulding capacity is short because the capex machine `CAP-2526-0014` is 6 weeks late
- **Workflows:**
  - Raise planned purchase requisitions (SAP, `Simulated`)
  - Outsource fan-guard moulding
  - Expedite the capex machine
- **Why it matters:** this scenario shows "no software, still intelligence".

**S6. Commodity pass-through clawback** (Cost Engine + SAP PO and GRN → Sourcing, Finance)
- **Signal:** LME Copper averaged 6.1% lower in Q2 FY27 (Jul to Sep 2026) than in Q1. 9 vendors supplying parts with `L4 Commodity` = Copper kept the same `EKPO-NETPR` on POs raised after the fall.
- **The story with S1:** copper is rising now. "Before the rise hits, claim back the fall."
- **Engine (`passThrough`):**
  - expected price = last agreed price × (1 − copper share × index change). Copper share comes from the part's should-cost breakdown.
  - recoverable = (actual − expected) × qty received since the fall (GRN `MSEG-BWART` 101, netting 102 and 122), plus the same on still-to-deliver qty.
- **Impact:** about ₹ 64 L recoverable on received qty and ₹ 21 L on open qty. The engine computes the exact figures from the seed.
- **What happened view:** a vendor table with index change, price change, recoverable ₹, and whether the contract has an index-linked price clause.
- **Notify (computed):** Category Manager and Buyers for purchasing group P01, Head of Sourcing, Finance Controller.
- **Workflows:**
  - Raise a price-revision claim / debit note to the vendor (shared through the Vendor Portal, `Simulated`)
  - Update info-record prices (SAP write-back on `EKPO-INFNR`, `Simulated`, needs approval)
  - Add an index-linked price clause to the next contract
  - Carry the claim into the next RFQ
- **Value:** hard saving, `Committed` when the claim is raised. It turns `Realised` when the next GRN posts at the revised price.

**S7. ECN obsolescence** (NPD ECN + SAP MM → Stores, Sourcing, Planner, Finance)
- **Signal:** `ECN-FY-2026-0011` replaces the Outdoor inverter PCB Assy with a new revision, cut-in on 01 Jan 2027 at Rajpura and Supa.
- **The old part:**
  - about 750 units in stock (`MARD-LABST`) at moving price `MBEW-VERPR`, about ₹ 18 L
  - 2 open POs with about 1,000 units still to deliver (`EKPO-MENGE` minus GR qty), about ₹ 24 L
  - demand until cut-in (BOM × plan) covers only about 600 units
- **Engine (`obsolescence`):** excess = stock + open qty − demand until cut-in. ₹ at risk = excess × price.
- **Notify (computed):** Stores In-charge and Planner for the two plants, the Buyer for that purchasing group, the NPD PM who owns the ECN, Finance Controller.
- **Workflows:**
  - Reduce or cancel the open PO quantity (SAP write-back, `Simulated`, needs approval)
  - Move the cut-in date later to consume stock (ECN change, needs R&D approval)
  - Return to vendor (`MSEG-BWART` 122) or rework
  - Move the remainder to service spares
- **Value:** cost avoidance (PO qty reduced) plus cash released.

**S8. Lead-time drift** ships as a **Rule example**, not a hero scenario: *"WHEN average GRN delay days over 90 days > 30% of `MARC-PLIFZ` THEN suggest a `MARC-PLIFZ` update (write-back, `Simulated`) to the Planner."*

**Value booked by each scenario's workflow:**
- S1 price lock: cost avoidance against the forecast price.
- S2 air-freight partial: revenue protected minus air-freight cost, plus demurrage and detention avoided.
- S2 alternate supplier: revenue protected on the units the second source covers (units × contribution per unit), `Committed` when `AS-FY-2026-0012` is raised. When the air-freight partial is also run, attribution splits revenue protected between the two actions by units covered, so the same unit is never counted twice.
- S3 T3 fast-track: revenue protected.
- S4 hold and shift share: cost of poor quality avoided.
- S5 planned PRs: revenue protected.
- S6 and S7: as above.

**Compound moment.** S1 and S2 hit the same project.
- **In the UI:** its Project 360 shows a **"Why is this project at risk?"** stack that combines the signals with their contributions: 11 days from the import, and ₹ 412 per unit from copper.
- **In the Assistant:** asking "Is the Coolwave launch safe?" gives the same combined answer, with sources.
- **In the Value Ledger:** the value from acting on both is split between them by the attribution rule, so it is not counted twice.
- **The point:** no single system could show this.

## 11. Second tenant (proves "for every client")

**"Kestrel Auto Components"**, a fictional auto-parts manufacturer with 3 plants on SAP S/4HANA.

- **What it has:**
  - Live modules: Cost Engine and EXIM only.
  - Everything else is fed by data drops: production plan, quality.
- **Its scenario:** an aluminium price rise hits the die-cast housings.
- **What switching tenant changes:**
  - Branding initials
  - The App Launcher (more Roadmap tiles, "Powered by your data")
  - The Source Hub
  - The Assistant's suggested prompts
  - The users and their scopes (same role templates)
  - The Value Ledger and savings targets
- **The message:** Nexus is configured per client, not rebuilt.

## 12. Design direction: professional, modern, light and dark

**Benchmark the feel against** Linear, Vercel, Stripe Dashboard and SAP Fiori Horizon. Aim for enterprise-grade restraint with modern polish.
- It is calm and data-dense, made for executives.
- Typography and whitespace carry the hierarchy, not boxes and colour.
- Systems are identified by small colour chips, never by colouring whole screens.
- Density varies: hero screens get room, tables are tight.
- No walls of identical cards, no gradients-everywhere, no default component-library look.

**Modern details to include:**
- A frosted, translucent top bar with backdrop blur.
- A collapsible sidebar with icon-only mode.
- 1px hairline borders and soft layered shadows (`0 1px 2px` + `0 8px 24px` at low alpha).
- Radius 10 to 12 on cards and 8 on controls.
- Inter with `font-feature-settings: "cv11", "ss01", "tnum"` for numbers.
- Subtle hover lift on cards.
- A focus ring in the accent colour.
- Command palette (⌘K).
- Keyboard shortcuts with hints, e.g. `G S` for Signals.
- Inline sparklines.
- Animated number count-up on KPI first render.
- An empty-state illustration style made of simple line icons.

**Themes:**
- **Theme control** in the top bar and the profile menu: `System` (default, follows `prefers-color-scheme`), `Light` or `Dark`. The choice is saved per user and applied before first paint, so there is no flash.
- **Implementation:** every colour is a CSS variable in `src/styles/tokens.css` under `:root` (light) and `[data-theme="dark"]`. Tailwind reads these variables. No hard-coded hex values in components.
- **Charts** (Recharts) read the tokens too. Grid lines, axes, tooltips and series colours all switch with the theme.
- **Dark mode is a first-class design**, not an inversion:
  - Surfaces are layered: the background is darkest and raised surfaces get lighter.
  - Text is not pure white.
  - Status colours are tuned for dark backgrounds.
  - Shadows are replaced by lighter borders.
- **Contrast:** both themes must pass WCAG AA for text and status chips.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F7F7F5` | `#0B0D10` |
| `--surface` | `#FFFFFF` | `#12151A` |
| `--surface-2` (raised / hover) | `#F2F1EE` | `#191D23` |
| `--border` | `#E4E2DD` | `#262B33` |
| `--border-strong` | `#D4D1CA` | `#343A44` |
| `--text` | `#14161A` | `#E8EAED` |
| `--text-2` | `#585D66` | `#A2A8B3` |
| `--text-3` (meta, ≥12px only) | `#7C818A` | `#7A808B` |
| `--accent` | `#0D9488` | `#2DD4BF` |
| `--accent-hover` | `#0B7A6E` | `#5EEAD4` |
| `--accent-soft` | `#E6F4F2` | `#0F2E2B` |
| `--critical` / bg | `#B91C1C` / `#FEE2E2` | `#F87171` / `#3A1414` |
| `--attention` / bg | `#92400E` / `#FEF3C7` | `#FBBF24` / `#36270A` |
| `--info` / bg | `#1D4ED8` / `#DBEAFE` | `#60A5FA` / `#0F213D` |
| `--resolved` / bg | `#047857` / `#D1FAE5` | `#34D399` / `#0C2E22` |

**Source chips.** Same hue in both themes, with lightness adjusted in dark mode:

| Source | Colour |
|---|---|
| SAP | `#0A6ED1` |
| Cost | `#A8710E` |
| EXIM | `#6D4F9E` |
| NPD | `#C2540C` |
| Tooling | `#0E7C7B` |
| R&D | `#3B5BDB` |
| Capex | `#A32B20` |
| Vendor | `#153F90` |
| Quality | `#9D174D` |
| Data drop | `#57534E` |

**Rules (review-gated):**
- Green is used only for resolved or terminal states.
- Text is 12px minimum.
- No em dashes in UI copy.
- Numbers use tabular numerals.
- Use Indian formats: ₹, lakh and crore (`₹ 2.3 Cr`, `₹ 68 L`), dates as `16 Nov 2026`, IST.
- Every number carries a unit, and on hover shows its source (module or SAP table-field) and "as of" time.
- Every screen is checked in both themes before it counts as done.

**Assistant look:**
- A distinct but quiet surface.
- Answer blocks reuse app components.
- A "checking systems" step list using source chips.

**Motion:**
- Toasts slide in.
- The ripple graph draws left to right.
- The Assistant streams its answers.
- Page transitions are 150 to 200ms fades.
- Use skeletons, never spinners.
- Respect `prefers-reduced-motion`.

**Responsive:**
- Desktop is designed for a 1440px projector and stays usable at 1280px.
- Below 640px the app switches to the mobile app layout (section 7.3).

## 13. The 10-minute demo script (the app must support exactly this)

1. **Login as MD.** The critical pop-up shows 3 signals. The Assistant brief says: "3 things need you today."
2. **Command Center.** Show value delivered FYTD next to ₹ at risk, then launches at risk, commodity watch, and the cross-system pulse, which includes SAP and data drops.
3. **App Launcher.** Show every system in one place: Genessence modules, SAP Fiori tiles, other tools, and Roadmap tiles marked "Powered by your data".
4. **Open S2 (import delay).** Walk the ripple graph from shipment to compressors to DV build to launch to Rajpura to the people affected. Show "Who knows" with each person's reason, and the decision latency. Say: "EXIM knew 9 days ago. Today NPD knows too."
5. **Switch to the NPD PM.** She has the same signal. Proceed with "Raise Alternate Supplier": `AS-FY-2026-0012` is created, appears in the audit trail, and a Value Ledger entry is `Committed`.
6. **Project 360.** Show the compound risk: copper plus import delay.
7. **Presenter fires S1 live.** A toast appears and the bell count goes up. Switch to Head of Sourcing and request a price lock. Then open S6 on the same commodity: "Before copper rises, claim back the fall. ₹ 64 L recoverable."
8. **Value Ledger.** Show the waterfall from identified to validated. Open one entry whose SAP evidence (a GRN at the locked price) turned it `Realised`. Switch to the CFO and validate it. Open the board pack.
9. **Add a user live** (section 6.6). Log in as her and the S4 pop-up appears. Say: "Nobody configured that. Her role and scope did."
10. **Open the Assistant.** Ask four things:
    - "Which launches are at risk because of imports?" It returns a table with sources.
    - "What if copper goes up another 5%?" It recomputes the exposure.
    - "Raise a PR for 2 months of copper tube." It shows an action card, confirm it, and an SAP PR is created (`Simulated`).
    - "How much have we saved this quarter?" It returns the ledger split with a chart.
11. **Bring Your Data.** Upload `Sales_Forecast_FY27.xlsx`, map the columns, and S5 appears. Say: "You don't have sales software? Give us the data."
12. **Source Hub, SAP Field Explorer and Data Fabric.** Show Amber's own SAP fields ("312 of 570 mapped"), the PR → PO → GRN chain with delay days, entity resolution and lineage.
13. **Mobile App Preview.** Fire the S2 push notification onto the phone's lock screen, tap through, swipe to approve the air-freight partial, and ask Nexus by voice. Toggle the phone to dark mode. Then open the same URL on a real phone.
14. **Switch tenant to Kestrel.** Same platform, a different industry, configured instead of rebuilt.

**Short version (6 minutes):** steps 1, 2, 4, 7, 8, 9 and 13.

## 14. Project structure

```
src/
  config/        brand.ts, demoClock.ts, tenants.ts, roles.ts, kpis.ts, savings.ts
  data/          types.ts, seed/{amber,kestrel}/*.ts, samples/ (demo upload files as JSON + display names)
  engine/        costImpact.ts, slipPropagation.ts, audience.ts, qualityRisk.ts, demandGap.ts, whatIf.ts, passThrough.ts, obsolescence.ts,
                 valueLedger.ts, attribution.ts, kpis.ts, search.ts
  assistant/     intents.ts, entityMatcher.ts, blocks.tsx, AssistantDrawer.tsx, AssistantPage.tsx
  store/         useNexus.ts (currentUser, users, roles, tenant, signals, audit, value, sources, chat, presenter)
  components/    ui/, SignalCard, SeverityBadge, SourceChip, StatusBadge (Live/Pilot/Roadmap), EntityChip,
                 KpiTile, Sparkline, StageRail, RippleGraph, ImpactSummary, WorkflowStepper,
                 CriticalPopup, CommandPalette, SimulatedTag, AppTile
  pages/         Login, CommandCenter, SignalInbox, ImpactExplorer, Entity360/*, AppLauncher, AppSummary,
                 ConceptModule, SourceHub, SapConnector, SapFieldExplorer, P2PChain, BringYourData, DataFabric, Rules, Audit,
                 People, RoleTemplates, MyProfile, Onboarding, ValueLedger, BoardPack
  mobile/        MobilePreview.tsx (frame + scenes), app/ (Today, Signals, SignalDetail, Approvals, Ask, EntityQuick, Profile, LockScreen), components/ (TabBar, BottomSheet, SwipeRow)
  data/sap/      sapFields.ts (generated from docs/SAP_Fields_Amber.xlsx; see Appendix A)
  styles/        tokens.css (light + dark), globals.css
  theme/         ThemeProvider.tsx (system/light/dark, no-flash inline script in index.html)
public/          manifest.webmanifest, icons/
scripts/         check-seed.ts, check-assistant.ts, gen-sap-fields.ts (xlsx → sapFields.ts, run once; commit output)
```

## 15. Build order: 4 milestones

Do not build this in one pass. Before M1, write the invariants into the root `CLAUDE.md` so every session keeps them:
- no network, no backend
- the badge rules (`Live` / `Pilot` / `Roadmap`, `Simulated`)
- the design tokens and the section 12 rules
- Indian formats, and no em dashes in UI copy
- every number comes from `src/engine`
- every SAP field comes from `sapFields.ts`
- every audience is computed

Run each milestone in its own session. A milestone is done only when its checks pass and REESE has reviewed it.

**M1. Foundation and one scenario end to end**
1. Tokens for both themes, the ThemeProvider, the shell, the demo clock, and the store with reset. Build dark mode from day one.
2. `gen-sap-fields` turns the xlsx into `sapFields.ts`. Then types (SAP-shaped), seed, engine and `check:seed`.
3. Role templates, users, scope and the computed audience. The login directory with featured users.
4. Signal Inbox and Impact Explorer with S2 end to end, including "Who knows" reasons, decision latency and a Value Ledger entry.

**M2. The decide layer**
5. KPI catalogue, and the Command Center for each role, with Edit dashboard.
6. Value Ledger, attribution and the board pack.
7. Pop-up, notifications, and live firing from the Presenter panel.
8. S1, S3, S4, S6 and S7 end to end. The compound moment.
9. Nexus Assistant: drawer, page, the first 10 intents, entity matcher, action cards. Then expand to about 30 intents.

**M3. Every system in one place**
10. 360 pages, on one shared layout.
11. App Launcher, module summaries and concept pages.
12. Source Hub, SAP connector detail, SAP Field Explorer, P2P chain, Bring Your Data wizard (S5), Data Fabric.
13. Rules, Audit, People & Roles (add a user, onboarding, audience preview), My Profile.

**M4. Reach and polish**
14. Mobile App Preview and the `/m/*` standalone mobile app, plus the PWA manifest.
15. Second tenant, ⌘K, keyboard shortcuts.
16. Polish: empty states, provenance on hover, reduced motion, checks at 1280px, on a real phone, and every screen in both themes.
17. Rehearse the section 13 script end to end.

**If time runs short, cut in this order:** Hindi; the Rules builder (keep the list); Kestrel depth (keep the switch); 360 pages beyond Part, Shipment, Vendor and Project.

## 16. Acceptance criteria

- **Build checks:** `npm run dev`, `build`, `typecheck`, `check:seed` and `check:assistant` all pass. There are no console errors.
- **No network:** no network requests after the first load.
- **Hero scenarios:** all 7 (S1 to S7) must, in full:
  - open from the inbox
  - be explorable in the ripple graph, with every node clickable to a 360 page
  - resolve through a workflow that writes to the audit trail and shows the record it created
  - fire live, with the pop-up appearing only for users in the computed audience
  - book a Value Ledger entry when the workflow completes
  - be explainable by the Assistant, with cited sources
- **Assistant:**
  - Answers the demo-script questions correctly from engine output.
  - Resolves any seeded ID, code or name.
  - Renders tables, charts and action cards.
  - Confirmed actions write to the audit trail.
  - Out-of-role questions get a polite refusal.
  - Unknown questions get a graceful fallback.
- **Bring Your Data:** the wizard runs end to end and makes a new source and S5 appear.
- **Switching:** changing user changes the content. Changing tenant changes the modules, sources, data and Assistant prompts.
- **Computed numbers:** every ₹ and days figure comes from `src/engine`, and its formula is visible.
- **Reset:** "Reset demo" restores the seed, clears the chat, removes the data drop, removes users added in the demo, and restores the Value Ledger.
- **Badges:** every module and connector carries an accurate `Live` / `Pilot` / `Roadmap` badge, and simulated things carry the `Simulated` tag.
- **No real data:** no real person names, vendor codes or commercial figures. Check this by grepping the seed.
- **Profiles and audience:**
  - Every signal's audience is computed from role and scope. No signal stores a hand-written list except `audienceOverride`.
  - Adding a user with a matching scope makes the matching open signals appear for them at once, with reasons.
  - A delegate receives signals and approvals for the dates set.
  - Each role lands on its own page with its default KPIs. A user's dashboard edits persist, and reset to the role default.
- **Value Ledger:**
  - Every entry has a type, baseline, formula and status. Totals by type add up to the headline figure.
  - No value is counted twice across signals that share a project or part. `check:seed` checks the attribution.
  - `Realised` entries show their SAP evidence documents.
- **SAP fields:**
  - Every SAP field shown in the UI uses a label and table-field that exist in `sapFields.ts`.
  - The SAP Field Explorer lists all fields from Amber's sheet, with an accurate status.
  - Unconfirmed fields carry `To confirm with Amber IT`.
- **Themes:**
  - System, Light and Dark all work, with no flash on load.
  - Charts, the ripple graph, the Assistant and the mobile app all follow the theme.
  - AA contrast holds in both themes.
- **Mobile app:**
  - The `/mobile` preview runs all 9 screens inside the phone frame, including a live push notification and swipe-to-approve.
  - `/m` works on a real phone at 360 to 430px wide.
  - The PWA installs to the home screen.

## 17. Out of scope

- Real auth, backend, SAP calls, file parsing, or LLM calls. Uploads use bundled sample files, and the user only picks a file name.
- Editing data inside source systems, beyond the simulated write-back confirmations.
- Accessibility beyond keyboard navigation, focus rings, AA contrast, and reduced motion.

## 18. Process (Genessence crew)

Follow the crew workflow in the root `CLAUDE.md`. Before any screen counts as done, an independent adversarial review (REESE) must read the actual code.
- **What REESE checks against:** section 12 (design rules) and section 16 (acceptance criteria).
- **What REESE returns:** SHIP, APPROVE-WITH-CHANGES or DENY, plus a confidence score.
- **Must pass:** the demo script in section 13 and the Assistant questions in it.

---

## Appendix A: Amber SAP field dictionary (condensed)

**Source:** `docs/SAP_Fields_Amber.xlsx`, from Amber IT. It has 8 sheets. Each sheet lists Data Field, Field Description, Detailed Description, Numeric/Alphanumeric, SAP Data Type (Length) and SAP Table-Field. `scripts/gen-sap-fields.ts` must read the full sheet, including the descriptions. The list below is the condensed map for planning.

**Purchase Requisition** (`EBAN`, ~119 fields; key ones):
- Document Type `EBAN-BSART`
- Purchase Requisition `EBAN-BANFN` (e.g. 1000012345)
- Item `EBAN-BNFPO`
- Material `EBAN-MATNR`, Short Text `EBAN-TXZ01`
- Quantity requested `EBAN-MENGE`, Quantity ordered `EBAN-BSMNG`
- Delivery Date `EBAN-LFDAT`
- Plant `EBAN-WERKS`, Storage Location `EBAN-LGORT`
- Purchasing Group `EBAN-EKGRP`, Purch. Organization `EBAN-EKORG`
- Requisitioner `EBAN-AFNAM`, Requisition date `EBAN-BADAT`
- Processing status `EBAN-STATU`
- Release: indicator `EBAN-FRGKZ`, strategy `EBAN-FRGST`, group `EBAN-FRGGR`, date `EBAN-FRGDT`
- Purchase order `EBAN-EBELN`, PO item `EBAN-EBELP`
- Desired / Fixed Vendor `EBAN-LIFNR` / `EBAN-FLIEF`
- Valuation Price `EBAN-PREIS`, Total Value `EBAN-RLWRT`, Currency `EBAN-WAERS`
- Acct Assignment Cat. `EBAN-KNTTP`
- MRP Controller `EBAN-DISPO`
- Planned Deliv. Time `EBAN-PLIFZ`
- Requirement Urgency / Priority `EBAN-PRIO_URG` / `EBAN-PRIO_REQ`
- Manufacturer Part No. `EBAN-MFRPN`
- Funds Center / Fund / Budget Period `EBKN-FISTL` / `EBKN-GEBER` / `EBKN-BUDGET_PD`
- Blocking Indicator `EBAN-BLCKD`
- Deletion Indicator `EBAN-LOEKZ`

**Purchase Order** (ME2N/ME2M, `EKKO`/`EKPO`, 78 fields):
- Plant `EKPO-WERKS`, Storage Location `EKPO-LGORT`
- Purchasing Doc. Type `EKKO-BSART` (NB standard, UB stock transfer, Amber Z-types: import, capex, service, job-work)
- Purch. Doc. Category `EKKO-BSTYP` (F PO, L scheduling agreement, K contract, A RFQ)
- Purchasing Group `EKKO-EKGRP` (e.g. P01 copper desk, P05 plastics desk), Purch. Organization `EKKO-EKORG`
- Purchasing Document `EKKO-EBELN` (e.g. 4500012345, stored as text), Item `EKPO-EBELP`
- Document Date `EKKO-BEDAT`
- Supplier / Supplying Plant `EKKO-LIFNR` / `EKKO-RESWK`, Name of Supplier `LFA1-NAME1`
- Material `EKPO-MATNR`, Short Text `EKPO-TXZ01`, Material Group `EKPO-MATKL`
- Order Quantity `EKPO-MENGE`, Order Unit `EKPO-MEINS`
- Net Price `EKPO-NETPR`, Price Unit `EKPO-PEINH`, Net Order Value `EKPO-NETWR`, Currency `EKKO-WAERS`
- Calculated in the report: Still to be delivered (qty / value), Still to be invoiced (qty / value), Open value, Total open value
- Acct Assignment Cat. `EKPO-KNTTP`, Item Category `EKPO-PSTYP`
- Release: group `EKKO-FRGGR`, indicator `EKKO-FRGKE`, strategy `EKKO-FRGSX`, state `EKKO-FRGZU`
- Purchasing Info Rec. `EKPO-INFNR`, Outline agreement `EKPO-KONNR`
- Validity Per. Start / End `EKKO-KDATB` / `EKKO-KDATE`
- Quotation Deadline `EKKO-ANGDT`
- Tax Code `EKPO-MWSKZ`
- Deletion Indicator `EKPO-LOEKZ`
- Characteristic Values 1 to 3 (classification)

**GRN** (`MSEG`/`MKPF`, 48 fields):
- Plant `MSEG-WERKS`, Supplying Plant `EKKO-RESWK`
- Vendor `MSEG-LIFNR`, Vendor Name `LFA1-NAME1`
- Movement Type `MSEG-BWART`: 101 GR vs PO, 102 reversal, 103 to blocked stock, 105 release from blocked, 122 return to vendor, 161 returns PO. Net out 102 and 122 when totalling.
- Delivery Note `MKPF-XBLNR`
- PO.No `MSEG-EBELN`, Item `MSEG-EBELP`, PO.Dt `EKKO-BEDAT`
- GR. Doc `MSEG-MBLNR`, Item `MSEG-ZEILE`
- GR. Date `MKPF-BUDAT`, Entry Date / Time `MKPF-CPUDT` / `MKPF-CPUTM`
- Material Code `MSEG-MATNR`, Material Text `MAKT-MAKTX`
- PO Quantity `EKPO-MENGE`, GR. Qty. `MSEG-MENGE`, UOM `MSEG-MEINS`, Delivery Note Quantity `MSEG-LSMNG`
- Total Recd. Qty (sum of EKBE), Short Quantity (calc)
- **Delay Days (calc), against Dly.Dt `EKET-EINDT`**
- Accounting Document `BKPF-BELNR`, IR. Doc `RBKP-BELNR`
- PR NO `EBAN-BANFN`, PR Date `EBAN-BADAT`, Requisitioner `EBAN-AFNAM`
- Asset Code `EKKN-ANLN1`, Asset desc `ANLA-TXT50`
- Project Code `EKKN-PS_PSP_PNR`
- Del Complete `EKPO-ELIKZ`
- Over / Under delivery tolerance `EKPO-UEBTO` / `EKPO-UNTTO`
- Sales Order `MSEG-KDAUF`
- Blocked GR Qty (calc)

**Material Master** (181 fields):
- **General:** Material Code `MARA-MATNR`, Description `MAKT-MAKTX`, Created On / By `MARA-ERSDA` / `MARA-ERNAM`, Material Type `MARA-MTART` (ROH, HALB, FERT, VERP, ERSA, Z-types), Material Group `MARA-MATKL` + `T023T-WGBEZ`, Old Material Number `MARA-BISMT`, Base UoM `MARA-MEINS`, Gross / Net Weight `MARA-BRGEW` / `MARA-NTGEW`, Volume `MARA-VOLUM`, L × W × H `MARM-LAENG/BREIT/HOEHE`, QM in Procurement `MARA-QMPUR`, Batch Mgmt `MARA-XCHPF`, Manufacturer Part No. `MARA-MFRPN`, Cross-Plant Status `MARA-MSTAE`, AMPL validity `AMPL-DATUV` / `AMPL-DATBI`.
- **Amber custom Z-fields** (confirm the technical names with Amber IT):
  - Inverter Type
  - Category Type
  - Sourcing Type
  - L1 Category, L2 Commodity Family, L3 Commodity Group, L4 Commodity, L5 Commodity Sub Group, L6 Commodity Grade (each with a description)
  - Material Sub Group
  - Special Grade Code
  - OBU and OBU Customer
  - Size Thickness / OD / ID
  - EPR Category
  - Packing EPS / polybag / PP strap in grams
- **Plant / MRP:** Plant `MARC-WERKS`, Purchasing Group `MARC-EKGRP`, MRP Type `MARC-DISMM`, MRP Controller `MARC-DISPO`, Procurement Type `MARC-BESKZ`, Special Procurement `MARC-SOBSL`, Reorder Point `MARC-MINBE`, Safety Stock `MARC-EISBE`, Planned Deliv. Time `MARC-PLIFZ`, GR processing time `MARC-WEBAZ`, Lot size min / max / fixed `MARC-BSTMI` / `BSTMA` / `BSTFE`, Max Stock `MARC-MABST`, ABC Indicator `MARC-MAABC`, Critical Part `MARC-KZKRI`, Control Code (HSN) `MARC-STEUC`, Assembly / Component Scrap `MARC-AUSSS` / `MARC-KAUSF`, Post to Insp. Stock `MARC-INSMK`, Plant-Specific Status `MARC-MMSTA`, Profit Center `MARC-PRCTR`.
- **Valuation:** Standard price `MBEW-STPRS`, Moving price `MBEW-VERPR`, Price control `MBEW-VPRSV`, Valuation Class `MBEW-BKLAS`, Costing Lot Size `MBEW-LOSGR`.
- **BOM and routing:** Alternative BOM `MAST-STLAL`, BOM Usage `MAST-STLAN`, Routing Group `PLKO-PLNNR`.

**Inventory** (MB52, 31 fields):
- Plant `MARD-WERKS`, Storage Location `MARD-LGORT` + `T001L-LGOBE`
- Material `MARD-MATNR`, Material Type `MARA-MTART`, Material Group `MARA-MATKL`
- Unrestricted `MARD-LABST`, Quality Inspection `MARD-INSME`, Restricted-Use `MARD-EINME`, Blocked `MARD-SPEME`, Returns `MARD-RETME`
- Stock in Transit `MARC-TRAME`, In transfer (plant) `MARC-UMLMC`, GR Blocked `MARC-BWESB`
- A value column for each stock type (calculated)

**FA Code** (asset):
- Asset code `ANLA-ANLN1`, description `ANLA-TXT50`
- Capitalisation date `ANLA-AKTIV`
- Acquisition Value `ANLC-KANSW`, Accumulated Depreciation `ANLC-KNAFA`
- Net Balance (calc)

**Import expense conditions** (`PRCD_ELEMENTS-KWERT`, INR, Z-conditions on import POs):

| Group | Conditions |
|---|---|
| Freight & ex-works | ZFR2 Ocean Freight, ZFR1 Air Freight, ZEXW Ex-works, ZFV1 Domestic Freight-Import, ZIHC Inland Haulage |
| Insurance | ZINS Insurance |
| Duties | ZASD Anti Dumping Duty, ZCES Cess, ZROT RoDTEP, ZSSD Shipment Stamp Duty |
| CHA | ZCHA CHA Agency, ZCHB CHA Bond, ZCBG CHA Bond & BG, ZCSN CHA SIIMS & NFIMS |
| CFS | ZCFS CFS, ZGRC CFS Ground Rent, ZWHC CFS Warehouse |
| Container | ZDCS Demurrage/Storage, ZCDT Detention, ZCDC Damage, ZCSC Scanning, ZCLO Load/Unload |
| DO & shipping | ZADC Airline DO, ZHDC House DO, ZSLC Shipping Line, ZTHC Terminal Handling |
| Other | ZSEC Shipment Exam, ZCCC Courier Clearance, ZHSS High Sea Sale, ZVHC Vehicle Halting, ZMIS Misc |
| Generic | DRG1 % Gross discount / surcharge, DRV1 Fixed Amount |

Use these conditions for the landed-cost breakdown on Shipment 360 and in S2. Use ZDCS and ZCDT for "every day of delay costs ₹ X in demurrage / detention".

**Vendor Master:** the sheet Amber supplied is a duplicate of the PO sheet. Ask Amber IT for the real vendor-master fields (`LFA1`, `LFB1`, `LFM1`: name, GSTIN, PAN, payment terms, purchasing block, etc.). Until then, show the standard fields with the `To confirm with Amber IT` tag.
