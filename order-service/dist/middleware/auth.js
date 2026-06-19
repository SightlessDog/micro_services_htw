"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireAdmin = requireAdmin;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const ISSUER = process.env.ZITADEL_ISSUER;
const JWKS_URL = process.env.ZITADEL_JWKS_URL || `${ISSUER}/oauth/v2/keys`;
const ROLES_CLAIM = "urn:zitadel:iam:org:project:roles";
const client = (0, jwks_rsa_1.default)({
    jwksUri: JWKS_URL,
    cache: true,
    rateLimit: true,
});
function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err)
            return callback(err);
        callback(null, key?.getPublicKey());
    });
}
function extractRoles(payload) {
    const claim = payload[ROLES_CLAIM];
    return claim && typeof claim === "object" ? Object.keys(claim) : [];
}
function authenticate(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid Authorization header" });
        return;
    }
    const token = authHeader.slice(7);
    jsonwebtoken_1.default.verify(token, getKey, { algorithms: ["RS256"], issuer: ISSUER }, (err, decoded) => {
        if (err || !decoded || typeof decoded === "string") {
            res.status(401).json({ error: "Invalid or expired token" });
            return;
        }
        const roles = extractRoles(decoded);
        const user = {
            id: decoded.sub,
            email: decoded.email,
            roles,
            isAdmin: roles.includes("admin"),
        };
        req.user = user;
        next();
    });
}
function requireAdmin(req, res, next) {
    if (!req.user.isAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map