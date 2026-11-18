# Genessence Nexus

**The manufacturing intelligence hub.** Your systems already know. Nexus makes sure the right person knows, in time, with the data and the next step.

Nexus sits on top of a manufacturer's SAP and the Genessence modules: Cost Engine, EXIM, NPD, Tooling (NTD), R&D Control Tower, Capex and Vendor Management. It turns what each system knows into a signal and traces that signal through parts, purchase orders, projects, plants and customers to the people responsible. Each person gets the ₹ and days of impact, with the formula shown, and a recommended next step. Every action books its value to a ledger, which SAP documents later prove.

This repository is a **frontend-only concept POC** for pitching to Amber Enterprises and future clients. It has no backend, makes no network calls and uses no real data. All names and figures are fictional, but the shapes are real: field names come from Amber's SAP field dictionary, and stage names come from the Genessence modules.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

Sign in as **Vikram Rao (MD)**, review the critical pop-up, then open the Command Center.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Static build to `dist/`, deployable to any static host |
| `npm run preview` | Serve the build |
| `npm run typecheck` | TypeScript, strict |
| `npm run check:seed` | Seed integrity, engine figures, computed audiences, attribution (no double counting), source scans (no network, no raw hex, no em dashes, SAP codes must exist in the registry) |
| `npm run check:assistant` | Every Assistant intent and demo question resolves |
| `npm run gen:sap` | Regenerate `src/data/sap/sapFields.ts` from `docs/SAP_Fields_Amber.xlsx` |

Requires Node 20 or later.

## What's inside

**Decide**
- **Command Center:** the decision that needs you, with the impact path and the fix on the table. Also shows ₹ in play by severity, value delivered, launch gate rails, open signals and system health.
- **Signal Inbox:** signals routed to you by role and scope, each with a reason.
- **Impact Explorer:**
  - what happened
  - a ripple graph from the source record to the people affected
  - impact with formulas
  - recommended workflows, run as steppers that create records and book value
  - who knows, and decision latency
- **Ask Nexus:** a scripted assistant that answers with tables, charts, SAP field citations and action cards.
- **Value Ledger:** identified, committed, realised, then finance-validated; attribution; ROI; a printable board pack.

**Explore:** Part, Vendor, Project, Shipment, Plant, Commodity and Model 360 views.

**All software**
- **App Launcher:** every system in one place, including roadmap modules.
- **Source Hub:** the SAP connector, the SAP Field Explorer, and the procure-to-pay chain from PR to PO to GRN to invoice.
- **Bring Your Data:** an upload and mapping wizard.
- **Data Fabric:** entity resolution and lineage.

**Govern:** Rules, the audit trail, People and Roles (add a user live, role templates, audience preview), My Profile and onboarding.

**Reach**
- **Mobile App Preview:** a phone frame with nine screens, live push and swipe to approve.
- **Standalone app:** `/#/m`, installable as a PWA.
- **Presenter panel:** Shift+D, or the user menu. It fires scenarios live, steps through the demo script, hides the badges and resets the demo.

**Two tenants:** Amber Enterprises (full) and Kestrel Auto Components (fictional, light seed). Switch between them on the sign-in page.

**Two interfaces:** **Nexus 3.0** (the default: grey canvas, solid tiles, glass top bar only, one blue for action, module icon tiles) and **Classic** (dense, with five colour schemes). Both come in light and dark.

## Hero scenarios

| | Scenario | Source to impact |
|---|---|---|
| S1 | Copper forecast spike | Cost Engine to should-cost exposure, price lock, forward buy (SAP purchase requisition) |
| S2 | Compressor shipment rolled | EXIM to stock-out, line stop, DV build and PP gate slip, air partial, alternate supplier |
| S3 | Tool trial failure | Tooling to FPA delay, customer gate penalty, fast-track |
| S4 | Supplier quality | SAP GRN movements 103 and 122 to rejection cost, return to vendor, share shift |
| S5 | Demand uplift from a data drop | Sales Excel upload to compressor and fan-guard constraints |
| S6 | Commodity pass-through | Copper fell, but vendor PO prices didn't; recoverable from received and open quantities |
| S7 | ECN obsolescence | Stock plus open POs minus demand to cut-in gives the excess; PO reduction and return to vendor |

Every ₹ and day figure is computed in `src/engine`. Attribution is marginal: an action books only the change it makes after the actions already done. A customer gate slips by its worst open cause, never by the sum of causes.

## Project structure

```
src/
  config/      brand, demo clock (frozen at 16 Nov 2026 IST), roles (22 templates), routes
  data/        types, seed per tenant (amber, kestrel), SAP field registry (generated)
  engine/      scenarios (S1 to S7), audience, KPIs, value ledger, ripple, formats
  store/       Zustand store, persisted to localStorage ("Reset demo" restores the seed)
  components/  shell, ripple graph, workflow stepper, pop-ups, presenter panel, module icons
  pages/       Command Center, inbox, explorer, value, 360 views, apps, platform pages
  assistant/   intents, entity matcher, chat UI
  mobile/      phone preview and standalone app
  styles/      tokens.css (Classic), apple.css (Nexus 3.0), globals.css
scripts/       gen-sap-fields, check-seed, check-assistant
docs/          POC_PROMPT.md (spec), DESIGN_BRIEF.md, SAP_Fields_Amber.xlsx
```

## Ground rules

These are the project invariants, enforced by `check:seed`. See `CLAUDE.md` for details.

1. No network and no backend. The app works offline after first load.
2. Honest badges: `Live`, `Pilot` or `Roadmap` on modules, and `Simulated` on anything simulated.
3. Design tokens only; no raw hex in components.
4. Indian formats (₹ lakh and crore, `16 Nov 2026`, IST) and no em dashes in UI copy.
5. Every number comes from the engine, and every SAP field comes from the registry.
6. Audiences are computed from role and scope, never hand-written.
7. Time comes from the demo clock, never the wall clock.
8. Fictional people, vendors and figures only.

## Stack

Vite 6, React 18, TypeScript (strict), Tailwind CSS v4, react-router (HashRouter), Zustand, Recharts, Radix primitives, lucide-react, sonner, date-fns, and bundled fonts (Inter, JetBrains Mono).

## Confidentiality

`docs/SAP_Fields_Amber.xlsx` is Amber Enterprises' internal SAP field dictionary. Keep this repository private.

---

Genessence · internal concept POC
