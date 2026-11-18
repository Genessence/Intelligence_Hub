# Genessence Nexus POC: project contract

Frontend-only concept POC of the Genessence Nexus manufacturing intelligence hub. The full spec is `docs/POC_PROMPT.md` (v4.1). Build one milestone per session (spec section 15).

## Commands
- `npm run dev`: dev server
- `npm run typecheck`: TypeScript, strict
- `npm run check:seed`: seed integrity + engine consistency + hero audiences
- `npm run gen:sap`: regenerate `src/data/sap/sapFields.ts` from `docs/SAP_Fields_Amber.xlsx`. Run once, commit the output.
- `npm run build`: static build to `dist/`. Do not run it while the dev server is running.

## Stack
Vite 6, React 18, TypeScript strict, Tailwind v4 (CSS-first, `@tailwindcss/vite`), react-router 6 (HashRouter), Zustand 5 with persist, Recharts, lucide-react, sonner, date-fns, and Radix Dialog / Tooltip. Fonts are bundled with `@fontsource`, so there is no Google Fonts call.

## Invariants (never break these)
1. **No network, no backend.** No fetch, no external fonts or CDNs, and no LLM calls. The app must work offline after first load.
2. **Honest badges.** Every module and connector shows `Live` / `Pilot` / `Roadmap`. Anything simulated (SAP sync, write-back, email, Teams, WhatsApp, uploads, the Assistant's reasoning) shows `<SimulatedTag />`.
3. **Design tokens only.** Colours come from the CSS variables in `src/styles/tokens.css`, which has light and dark sets. There is no raw hex in components. Charts read tokens via `cssVar()`.
4. **Section 12 rules:**
   - Green only for resolved or terminal states.
   - Text is 12px minimum.
   - Tabular numerals for numbers.
   - Every screen is checked in both themes.
5. **Indian formats.** Use `fmtInr` (₹, lakh, crore) and `fmtDate` (`16 Nov 2026`), in IST. **No em dashes in UI copy.**
6. **Every number comes from `src/engine`.** No ₹ or day figure is typed into the UI or the seed text. The seed holds raw facts, and `check:seed` verifies the stored impacts against the engine.
7. **Every SAP field comes from `sapFields.ts`.** Reference fields through `sapField('EKPO-NETPR')`. `check:seed` fails if a code used in `src/` is missing from the registry.
8. **Every audience is computed.** Use `src/engine/audience.ts` with role template + scope + delegation. Signals never store a hand-written audience, except the optional `audienceOverride`.
9. **Deterministic time.** Get "now" only from `src/config/demoClock.ts`, never from `new Date()`.
10. **Fictional data only.** No real employee names, real vendor codes or real commercial figures.

## Process
- An implementer works alongside an independent adversarial reviewer (REESE, `../agents/reese/CLAUDE.md`). A milestone is done only when its checks pass and REESE has reviewed the actual code.
- Mark deliberate shortcuts with a `ponytail:` comment naming the ceiling.

## Architecture notes
- Tenants: `src/data/index.ts` (`DBS`). Pages read the current tenant with `useDb()`; never import a seed directly in UI code.
- Scenarios: `src/engine/scenarios/*` implement `impact` and `book` per signal type. Attribution is marginal: an action books only the change it makes after the actions already done.
- KPIs: `src/engine/kpis.ts`. Role defaults are in `src/config/roles.ts`.
- Store: `src/store/useNexus.ts`, persisted as `nexus-demo-v2`. "Reset demo" restores the seed.

## Milestone status
- M1 Foundation + S2 end to end: done, REESE APPROVE-WITH-CHANGES; the 7 must-fixes are applied
- M2 to M4: built and integrated. Final REESE review APPROVE-WITH-CHANGES; all 9 must-fixes applied, with regression checks in check:seed.
- UI: default is Nexus 3.0 (Apple-grade spec v3, data-ui=apple: grey canvas, solid tiles, glass top bar only, blue action, status colours for status, module icon tiles). Classic keeps the five colour schemes.
