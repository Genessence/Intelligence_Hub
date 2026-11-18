import { SAP_FIELDS } from './sapFields'
import type { SapFieldDef } from '../types'

const BY_CODE = new Map<string, SapFieldDef>(SAP_FIELDS.map((f) => [f.code, f]))

/** Look up an SAP field from Amber's dictionary. Invariant 7: every SAP field shown comes from here. */
export function sapField(code: string): SapFieldDef {
  const f = BY_CODE.get(code)
  if (!f) throw new Error(`SAP field ${code} is not in sapFields.ts (Amber dictionary)`)
  return f
}

export const hasSapField = (code: string) => BY_CODE.has(code)
export { SAP_FIELDS }
