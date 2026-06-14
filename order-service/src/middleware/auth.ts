import jwt, { type JwtHeader, type SigningKeyCallback } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import axios from "axios";
import type { Request, Response, NextFunction } from "express";
import type { AuthUser } from "../types/express";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} env var is required`);
  }
  return value;
}

const ISSUER = requireEnv("ZITADEL_ISSUER");
const AUDIENCE = requireEnv("ZITADEL_AUDIENCE");
const JWKS_URL = process.env.ZITADEL_JWKS_URL || `${ISSUER}/oauth/v2/keys`;
const USERINFO_URL = process.env.ZITADEL_USERINFO_URL || `${ISSUER}/oidc/v1/userinfo`;
const ROLES_CLAIM = "urn:zitadel:iam:org:project:roles";

// Zitadel JWT access tokens stay minimal (sub/aud/exp only) — project role
// grants only appear via the userinfo endpoint. Cache per-token to avoid a
// round trip to Zitadel on every request.
const ROLES_CACHE_TTL_MS = 60_000;

interface CachedUserInfo {
  email?: string;
  roles: string[];
  expiresAt: number;
}

// Swept on each write so it stays bounded by the number of distinct tokens
// seen within the TTL window, instead of growing forever.
const userInfoCache = new Map<string, CachedUserInfo>();

function pruneExpiredUserInfo(now: number): void {
  for (const [key, value] of userInfoCache) {
    if (value.expiresAt <= now) {
      userInfoCache.delete(key);
    }
  }
}

const client = jwksClient({
  jwksUri: JWKS_URL,
  cache: true,
  rateLimit: true,
});

function getKey(header: JwtHeader, callback: SigningKeyCallback): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key?.getPublicKey());
  });
}

function extractRoles(claims: Record<string, unknown>): string[] {
  const claim = claims[ROLES_CLAIM];
  return claim && typeof claim === "object" ? Object.keys(claim as Record<string, unknown>) : [];
}

async function fetchUserInfo(token: string, jti: string): Promise<CachedUserInfo> {
  const now = Date.now();
  const cached = userInfoCache.get(jti);
  if (cached && cached.expiresAt > now) {
    return cached;
  }

  const { data } = await axios.get<Record<string, unknown>>(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 5_000,
  });

  const info: CachedUserInfo = {
    email: typeof data.email === "string" ? data.email : undefined,
    roles: extractRoles(data),
    expiresAt: now + ROLES_CACHE_TTL_MS,
  };
  pruneExpiredUserInfo(now);
  userInfoCache.set(jti, info);
  return info;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  jwt.verify(token, getKey, { algorithms: ["RS256"], issuer: ISSUER, audience: AUDIENCE }, (err, decoded) => {
    if (err || !decoded || typeof decoded === "string") {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const sub = typeof decoded.sub === "string" ? decoded.sub : undefined;
    const jti = typeof decoded.jti === "string" ? decoded.jti : undefined;
    if (!sub || !jti) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    fetchUserInfo(token, jti)
      .then(({ email, roles }) => {
        const user: AuthUser = {
          id: sub,
          email: email ?? (decoded.email as string | undefined),
          roles,
          isAdmin: roles.includes("admin"),
        };
        req.user = user;
        next();
      })
      .catch((fetchErr: unknown) => {
        if (axios.isAxiosError(fetchErr)) {
          res.status(503).json({ error: "Identity provider unavailable" });
          return;
        }
        next(fetchErr);
      });
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
