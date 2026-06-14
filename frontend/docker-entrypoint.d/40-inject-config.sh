#!/bin/sh
# Runs before nginx starts (nginx Docker image executes /docker-entrypoint.d/* scripts).
# Writes runtime config so the SPA reads Zitadel settings from the container environment
# instead of the build-time baked values.
ISSUER="${VITE_ZITADEL_ISSUER:-http://localhost:8081}"

cat > /usr/share/nginx/html/config.js <<EOF
window.__ZITADEL_ISSUER__ = "${ISSUER}";
window.__ZITADEL_CLIENT_ID__ = "${VITE_ZITADEL_CLIENT_ID:-placeholder}";
window.__ZITADEL_ORG_ID__ = "${VITE_ZITADEL_ORG_ID:-}";
EOF

# Inject a CSP <meta> tag whose connect-src allows the Zitadel issuer origin
# (only known at runtime — varies per deployment).
CSP="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ${ISSUER}; frame-src 'none'; object-src 'none'; base-uri 'self'"
sed -i "s#<meta charset=\"UTF-8\" />#<meta charset=\"UTF-8\" />\n    <meta http-equiv=\"Content-Security-Policy\" content=\"${CSP}\" />#" /usr/share/nginx/html/index.html
