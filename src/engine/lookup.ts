import type { Db } from '@/data/types'
import type { UserProfile } from '@/data/types'

const req = <T>(v: T | undefined, what: string): T => {
  if (v === undefined) throw new Error(`Seed reference not found: ${what}`)
  return v
}

export const getVendor = (db: Db, id: string) => req(db.vendors.find((v) => v.id === id), `vendor ${id}`)
export const getPart = (db: Db, code: string) => req(db.parts.find((p) => p.code === code), `part ${code}`)
export const getPlant = (db: Db, sapPlant: string) => req(db.plants.find((p) => p.sapPlant === sapPlant), `plant ${sapPlant}`)
export const getShipment = (db: Db, ref: string) => req(db.shipments.find((s) => s.ref === ref), `shipment ${ref}`)
export const getProject = (db: Db, id: string) => req(db.projects.find((p) => p.id === id), `project ${id}`)
export const getPo = (db: Db, ebeln: string) => req(db.purchaseOrders.find((p) => p.ebeln === ebeln), `PO ${ebeln}`)
export const getModel = (db: Db, id: string) => req(db.productModels.find((m) => m.id === id), `product model ${id}`)
export const getSignal = (db: Db, id: string) => req(db.signals.find((s) => s.id === id), `signal ${id}`)
export const getUser = (users: UserProfile[], id: string) => req(users.find((u) => u.id === id), `user ${id}`)
export const getRole = (db: Db, id: string) => req(db.roles.find((r) => r.id === id), `role ${id}`)

export const partPlant = (db: Db, code: string, sapPlant: string) =>
  req(getPart(db, code).plants.find((p) => p.plant === sapPlant), `part ${code} at plant ${sapPlant}`)

export const stockOf = (db: Db, code: string, sapPlant: string) =>
  db.stock.filter((s) => s.material === code && s.plant === sapPlant).reduce(
    (a, s) => ({ unrestricted: a.unrestricted + s.unrestricted, qualityInsp: a.qualityInsp + s.qualityInsp, blocked: a.blocked + s.blocked, inTransit: a.inTransit + s.inTransit }),
    { unrestricted: 0, qualityInsp: 0, blocked: 0, inTransit: 0 },
  )
