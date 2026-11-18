import { roleById } from './roles'

// Leadership lands on the Command Center; everyone else on their role page.
export const landingFor = (roleId: string) => {
  const l = roleById(roleId).landing
  return l === '/' ? '/command' : l
}
