// Shipment delay -> stock cover -> line stop -> project slip -> gate slip (S2). Pure functions over the seed.
import type { Db, Signal } from '@/data/types'
import { DEMO_TODAY } from '@/config/demoClock'
import { addDays, daysBetween, maxDate } from './dates'
import { getProject, getShipment, partPlant, stockOf } from './lookup'

export interface Mitigation {
  stockDrawForProject: number // units pulled from plant stock for a build (re-sequence)
  projectPartsArrive?: string // date an air partial lands, covering project needs
  inflows: { date: string; qty: number; label: string }[] // extra supply for production (air partial, alternate source)
}

export const NO_MITIGATION: Mitigation = { stockDrawForProject: 0, inflows: [] }

export interface ProjectSlip {
  projectId: string
  forStage: string
  plannedStart: string
  readyPlanned: string
  readyRevised: string
  newStart: string
  slipDays: number
  slotRule: string
  gate?: { name: string; planned: string; floatDays: number; slipDays: number }
}

export interface ShipmentImpact {
  shipmentRef: string
  partCode: string
  plant: string
  qty: number
  delayDays: number
  plannedArrival: string
  revisedArrival: string
  unrestricted: number
  safetyStock: number
  dailyUse: number
  available: number
  coverDays: number
  stockOutDate: string
  belowSafetyDate: string
  lineStopDays: number
  shortfallPlanned: number
  unitsAtRiskGross: number
  unitsCovered: number
  unitsAtRisk: number
  contributionPerUnit: number
  inrAtRisk: number
  projectSlips: ProjectSlip[]
  maxSlipDays: number
  maxGateSlipDays: number
  portDayCostInr: number // ZDCS + ZCDT for all containers, per day beyond free days
  containers: number
  inflows: Mitigation['inflows']
}

/** Production units short between today and an arrival date, given stock available now. */
const shortfall = (dailyUse: number, available: number, arrival: string) => Math.max(0, dailyUse * Math.max(0, daysBetween(DEMO_TODAY, arrival)) - available)

export function shipmentImpact(db: Db, signal: Signal, m: Mitigation = NO_MITIGATION): ShipmentImpact {
  const ref = signal.entityRefs.find((r) => r.kind === 'shipment')
  if (!ref) throw new Error(`${signal.id} has no shipment ref`)
  const sh = getShipment(db, ref.id)
  const line = sh.lines[0]
  const pp = partPlant(db, line.partCode, sh.plant)
  const stock = stockOf(db, line.partCode, sh.plant)

  const eta = sh.etaRevised ?? sh.etaPlanned
  const delayDays = daysBetween(sh.etaPlanned, eta)
  const plannedArrival = addDays(sh.etaPlanned, sh.portToPlantDays)
  const revisedArrival = addDays(eta, sh.portToPlantDays)

  // Stock left for production after any draw for a project build.
  const available = Math.max(0, stock.unrestricted - m.stockDrawForProject)
  const coverDays = Math.floor(available / pp.dailyUse)
  const stockOutDate = addDays(DEMO_TODAY, coverDays)
  const belowSafetyDate = addDays(DEMO_TODAY, Math.floor(Math.max(0, available - pp.safetyStock) / pp.dailyUse))
  const lineStopDays = Math.max(0, daysBetween(stockOutDate, revisedArrival))
  // Units at risk: shortfall caused by the delay, beyond any shortfall the original plan already had.
  const shortfallPlanned = shortfall(pp.dailyUse, stock.unrestricted, plannedArrival) // original plan, before any stock draw
  const unitsAtRiskGross = Math.min(line.qty, Math.max(0, shortfall(pp.dailyUse, available, revisedArrival) - shortfallPlanned))
  // Inflows only help if they land before the shipment does; each covers what it can of the remaining gap.
  let unitsCovered = 0
  for (const f of m.inflows) {
    if (f.date >= revisedArrival) continue
    const usableDays = Math.max(0, daysBetween(maxDate(f.date, stockOutDate), revisedArrival))
    unitsCovered += Math.min(f.qty, usableDays * pp.dailyUse)
  }
  unitsCovered = Math.min(unitsCovered, unitsAtRiskGross)
  const unitsAtRisk = unitsAtRiskGross - unitsCovered
  const contributionPerUnit = db.tenant.contributionPerUnitInr

  const projectSlips: ProjectSlip[] = []
  for (const r of signal.entityRefs.filter((x) => x.kind === 'project')) {
    const p = getProject(db, r.id)
    for (const need of p.needs.filter((n) => n.partCode === line.partCode)) {
      const readyPlanned = addDays(plannedArrival, need.inspectionDays)
      let readyRevised = addDays(revisedArrival, need.inspectionDays)
      if (m.stockDrawForProject >= need.qty) readyRevised = addDays(DEMO_TODAY, need.inspectionDays)
      if (m.projectPartsArrive) readyRevised = minDate(readyRevised, addDays(m.projectPartsArrive, need.inspectionDays))
      const earliest = maxDate(need.plannedStart, readyRevised)
      const slot = p.labSlots?.find((d) => d >= earliest) ?? earliest
      const slipDays = Math.max(0, daysBetween(need.plannedStart, slot))
      let gate: ProjectSlip['gate']
      if (p.nextGate && p.buildDurationDays !== undefined) {
        const floatDays = Math.max(0, daysBetween(addDays(need.plannedStart, p.buildDurationDays), p.nextGate.planned))
        gate = { name: p.nextGate.name, planned: p.nextGate.planned, floatDays, slipDays: Math.max(0, slipDays - floatDays) }
      }
      projectSlips.push({
        projectId: p.id, forStage: need.forStage, plannedStart: need.plannedStart, readyPlanned, readyRevised, newStart: slot, slipDays,
        slotRule: p.labSlots ? 'next free psychrometric lab slot on or after parts ready' : 'parts ready date',
        gate,
      })
    }
  }

  return {
    shipmentRef: sh.ref, partCode: line.partCode, plant: sh.plant, qty: line.qty, delayDays, plannedArrival, revisedArrival,
    unrestricted: stock.unrestricted, safetyStock: pp.safetyStock, dailyUse: pp.dailyUse, available, coverDays, stockOutDate, belowSafetyDate,
    lineStopDays, shortfallPlanned, unitsAtRiskGross, unitsCovered, unitsAtRisk, contributionPerUnit,
    inrAtRisk: unitsAtRisk * contributionPerUnit,
    projectSlips,
    maxSlipDays: projectSlips.reduce((a, s) => Math.max(a, s.slipDays), 0),
    maxGateSlipDays: projectSlips.reduce((a, s) => Math.max(a, s.gate?.slipDays ?? 0), 0),
    portDayCostInr: sh.containers.length * (sh.demurragePerContainerDay + sh.detentionPerContainerDay),
    containers: sh.containers.length,
    inflows: m.inflows,
  }
}

/** Day-by-day projected stock for the chart: consumption, the shipment, and mitigation inflows. */
export function stockProjection(imp: ShipmentImpact, days = 28) {
  const out: { d: string; planned: number; revised: number }[] = []
  let a = imp.available
  let b = imp.available
  for (let i = 0; i < days; i++) {
    const d = addDays(DEMO_TODAY, i)
    if (i > 0) { a = Math.max(0, a - imp.dailyUse); b = Math.max(0, b - imp.dailyUse) }
    if (d === imp.plannedArrival) a += imp.qty
    if (d === imp.revisedArrival) b += imp.qty
    for (const f of imp.inflows) if (f.date === d) b += f.qty
    out.push({ d, planned: a, revised: b })
  }
  return out
}

const minDate = (a: string, b: string) => (a <= b ? a : b)
