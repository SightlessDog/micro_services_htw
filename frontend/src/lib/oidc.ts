import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

declare global {
  interface Window {
    __ZITADEL_ISSUER__?: string
    __ZITADEL_CLIENT_ID__?: string
    __ZITADEL_ORG_ID__?: string
  }
}

// In Docker, runtime values come from nginx-injected /config.js.
// In local dev (vite dev server), fall back to VITE_ env vars.
const issuer = window.__ZITADEL_ISSUER__ || (import.meta.env.VITE_ZITADEL_ISSUER as string)
const clientId = window.__ZITADEL_CLIENT_ID__ || (import.meta.env.VITE_ZITADEL_CLIENT_ID as string)
const orgId = window.__ZITADEL_ORG_ID__ || (import.meta.env.VITE_ZITADEL_ORG_ID as string | undefined)

if (!issuer || !clientId) {
  throw new Error(
    'Zitadel issuer/client ID not configured — check VITE_ZITADEL_ISSUER and VITE_ZITADEL_CLIENT_ID',
  )
}

// Pin login/registration to the org that owns this OIDC client — otherwise
// Login V2 self-registration defaults new users to the instance's default
// org instead. The roles scope puts project role assignments (e.g. "admin")
// into the `urn:zitadel:iam:org:project:roles` claim used by authStore.
const baseScope = 'openid profile email urn:zitadel:iam:org:project:roles'
const scope = orgId ? `${baseScope} urn:zitadel:iam:org:id:${orgId}` : baseScope

export const userManager = new UserManager({
  authority: issuer,
  client_id: clientId,
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: 'code',
  scope,
  // oidc-client-ts defaults this to false. Without it, `profile` only has
  // ID token claims (just `sub` here) — name/email come from the userinfo
  // endpoint instead.
  loadUserInfo: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
})
