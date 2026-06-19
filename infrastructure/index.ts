import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const config = new pulumi.Config();
const gcpConfig = new pulumi.Config("gcp");

const stack = pulumi.getStack(); // "staging" | "production"
const project = gcpConfig.require("project");
const region = config.get("region") ?? "europe-west1";
const minInstances = config.getNumber("minInstances") ?? 0;
const imageTag = config.require("imageTag"); // always passed by CI: --config imageTag=<sha>

// ── Non-secret config ──────────────────────────────────────────────────────
const zitadelIssuer = config.require("zitadelIssuer");         // https://tenant.zitadel.cloud
const zitadelClientId = config.require("zitadelClientId");
const zitadelOrgId = config.get("zitadelOrgId") ?? "";
const smtpHost = config.get("smtpHost") ?? "";
const smtpPort = config.get("smtpPort") ?? "587";
const smtpFrom = config.get("smtpFrom") ?? "";

// ── Secrets (encrypted in Pulumi state) ───────────────────────────────────
const neonUserDbUrl = config.requireSecret("neonUserDbUrl");
const neonOrderDbUrl = config.requireSecret("neonOrderDbUrl");
const neonProductJdbcUrl = config.requireSecret("neonProductJdbcUrl");   // jdbc:postgresql://...
const neonProductDbUser = config.requireSecret("neonProductDbUser");
const neonProductDbPass = config.requireSecret("neonProductDbPass");
const kafkaBrokers = config.requireSecret("kafkaBrokers");
const kafkaUsername = config.requireSecret("kafkaUsername");
const kafkaPassword = config.requireSecret("kafkaPassword");
const resendApiKey = config.requireSecret("resendApiKey");

// Upstash JAAS config for Spring Boot Kafka SASL/SCRAM
const kafkaJaasConfig = pulumi.interpolate`org.apache.kafka.common.security.scram.ScramLoginModule required username="${kafkaUsername}" password="${kafkaPassword}";`;

// ── Artifact Registry ─────────────────────────────────────────────────────
const registry = new gcp.artifactregistry.Repository("registry", {
    repositoryId: "crate",
    format: "DOCKER",
    location: region,
    project,
});

const imageBase = pulumi.interpolate`${region}-docker.pkg.dev/${project}/crate`;

// ── Service Account ───────────────────────────────────────────────────────
const sa = new gcp.serviceaccount.Account("cloud-run-sa", {
    accountId: pulumi.interpolate`cloud-run-${stack}`,
    displayName: pulumi.interpolate`Cloud Run ${stack}`,
    project,
});

new gcp.artifactregistry.RepositoryIamMember("sa-registry-reader", {
    project,
    location: region,
    repository: registry.name,
    role: "roles/artifactregistry.reader",
    member: pulumi.interpolate`serviceAccount:${sa.email}`,
});

// ── Cloud Run helper ──────────────────────────────────────────────────────
type Env = gcp.types.input.cloudrunv2.ServiceTemplateContainerEnv;

function cloudRunService(
    name: string,
    envs: Env[],
    memory = "512Mi",
): gcp.cloudrunv2.Service {
    const svc = new gcp.cloudrunv2.Service(name, {
        name: pulumi.interpolate`${stack}-${name}`,
        location: region,
        project,
        template: {
            serviceAccount: sa.email,
            containers: [{
                image: pulumi.interpolate`${imageBase}/${name}:${imageTag}`,
                envs,
                resources: { limits: { memory, cpu: "1" } },
            }],
            scaling: { minInstanceCount: minInstances, maxInstanceCount: 5 },
        },
        ingress: "INGRESS_TRAFFIC_ALL",
    });

    // Allow unauthenticated invocations — app-level auth (JWT/internal secret) handles security
    new gcp.cloudrunv2.ServiceIamMember(`${name}-public`, {
        project,
        location: region,
        name: svc.name,
        role: "roles/run.invoker",
        member: "allUsers",
    });

    return svc;
}

// ── Services ──────────────────────────────────────────────────────────────
// Deploy backends first — gateway and frontend depend on their URIs.

const userSvc = cloudRunService("user-service", [
    { name: "DATABASE_URL",          value: neonUserDbUrl },
    { name: "ZITADEL_ISSUER",        value: zitadelIssuer },
    { name: "ZITADEL_AUDIENCE",      value: zitadelClientId },
    { name: "ZITADEL_JWKS_URL",      value: `${zitadelIssuer}/oauth/v2/keys` },
    { name: "ZITADEL_USERINFO_URL",  value: `${zitadelIssuer}/oidc/v1/userinfo` },
]);

const productSvc = cloudRunService("product-service", [
    { name: "SPRING_DATASOURCE_URL",      value: neonProductJdbcUrl },
    { name: "SPRING_DATASOURCE_USERNAME", value: neonProductDbUser },
    { name: "SPRING_DATASOURCE_PASSWORD", value: neonProductDbPass },
    { name: "ZITADEL_ISSUER",             value: zitadelIssuer },
    { name: "ZITADEL_AUDIENCE",           value: zitadelClientId },
    { name: "ZITADEL_JWKS_URL",           value: `${zitadelIssuer}/oauth/v2/keys` },
    { name: "ZITADEL_USERINFO_URL",       value: `${zitadelIssuer}/oidc/v1/userinfo` },
    { name: "KAFKA_BOOTSTRAP_SERVERS",    value: kafkaBrokers },
    { name: "KAFKA_SECURITY_PROTOCOL",    value: "SASL_SSL" },
    { name: "KAFKA_SASL_MECHANISM",       value: "SCRAM-SHA-256" },
    { name: "KAFKA_SASL_JAAS_CONFIG",     value: kafkaJaasConfig },
], "1Gi"); // Spring Boot needs more heap

const orderSvc = cloudRunService("order-service", [
    { name: "DATABASE_URL",          value: neonOrderDbUrl },
    { name: "ZITADEL_ISSUER",        value: zitadelIssuer },
    { name: "ZITADEL_AUDIENCE",      value: zitadelClientId },
    { name: "ZITADEL_JWKS_URL",      value: `${zitadelIssuer}/oauth/v2/keys` },
    { name: "ZITADEL_USERINFO_URL",  value: `${zitadelIssuer}/oidc/v1/userinfo` },
    { name: "USER_SERVICE_URL",      value: userSvc.uri },
    { name: "PRODUCT_SERVICE_URL",   value: productSvc.uri },
    { name: "PORT",                  value: "3000" },
    { name: "KAFKA_BROKERS",         value: kafkaBrokers },
    { name: "KAFKA_SASL_USERNAME",   value: kafkaUsername },
    { name: "KAFKA_SASL_PASSWORD",   value: kafkaPassword },
]);

const notifSvc = cloudRunService("notification-service", [
    { name: "KAFKA_BROKERS",       value: kafkaBrokers },
    { name: "KAFKA_SASL_USERNAME", value: kafkaUsername },
    { name: "KAFKA_SASL_PASSWORD", value: kafkaPassword },
    { name: "SMTP_HOST",           value: smtpHost },
    { name: "SMTP_PORT",           value: smtpPort },
    { name: "SMTP_FROM",           value: smtpFrom },
    { name: "SMTP_USER",           value: "resend" },
    { name: "SMTP_PASS",           value: resendApiKey },
    { name: "SMTP_SECURE",         value: "true" },
    { name: "PORT",                value: "3001" },
]);

// Zitadel host for nginx Host header (without scheme or port)
const zitadelHost = zitadelIssuer.replace(/^https?:\/\//, "");

const gatewaySvc = cloudRunService("gateway", [
    { name: "USER_SERVICE_URL",     value: userSvc.uri },
    { name: "PRODUCT_SERVICE_URL",  value: productSvc.uri },
    { name: "ORDER_SERVICE_URL",    value: orderSvc.uri },
    { name: "ZITADEL_PROXY_URL",    value: zitadelIssuer },
    { name: "ZITADEL_HOST_HEADER",  value: zitadelHost },
    // Filter tells nginx envsubst which vars to substitute (leaves $host, $remote_addr etc. intact)
    { name: "NGINX_ENVSUBST_FILTER", value: "^ZITADEL_|_SERVICE_URL$" },
]);

const frontendSvc = cloudRunService("frontend", [
    { name: "VITE_ZITADEL_ISSUER",    value: zitadelIssuer },
    { name: "VITE_ZITADEL_CLIENT_ID", value: zitadelClientId },
    { name: "VITE_ZITADEL_ORG_ID",    value: zitadelOrgId },
]);

// ── Exports ───────────────────────────────────────────────────────────────
export const frontendUrl = frontendSvc.uri;
export const gatewayUrl = gatewaySvc.uri;
export const registryUrl = pulumi.interpolate`${region}-docker.pkg.dev/${project}/crate`;
