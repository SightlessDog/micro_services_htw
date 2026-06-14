import { create } from 'zustand'
import type { User as OidcUser } from 'oidc-client-ts'
import { userManager } from '../lib/oidc'
import type { User } from '../types'

const ROLES_CLAIM = 'urn:zitadel:iam:org:project:roles'

interface AuthStore {
  token: string | null
  user: User | null
}

function extractRoles(profile: OidcUser['profile']): string[] {
  const claim = profile[ROLES_CLAIM]
  return claim && typeof claim === 'object' ? Object.keys(claim) : []
}

function toUser(oidcUser: OidcUser | null): User | null {
  if (!oidcUser?.profile.sub) return null
  return {
    id: oidcUser.profile.sub,
    email: oidcUser.profile.email ?? '',
    name: oidcUser.profile.name ?? oidcUser.profile.email ?? 'User',
    roles: extractRoles(oidcUser.profile),
  }
}

export const useAuthStore = create<AuthStore>(() => ({
  token: null,
  user: null,
}))

function applyOidcUser(oidcUser: OidcUser | null) {
  useAuthStore.setState({ token: oidcUser?.access_token ?? null, user: toUser(oidcUser) })
}

userManager.getUser().then(applyOidcUser)
userManager.events.addUserLoaded(applyOidcUser)
userManager.events.addUserUnloaded(() => applyOidcUser(null))

export function isAdmin(user: User | null): boolean {
  return user?.roles.includes('admin') ?? false
}
