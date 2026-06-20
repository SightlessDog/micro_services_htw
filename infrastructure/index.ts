import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const config = new pulumi.Config();
const gcpConfig = new pulumi.Config("gcp");

const stack = pulumi.getStack(); // "staging" | "production"
const project = gcpConfig.require("project");
const region = config.get("region") ?? "europe-west1";
const imageTag = config.require("imageTag"); // always passed by CI: --config imageTag=<sha>

// Artifact Registry repo id. Image path: <region>-docker.pkg.dev/<project>/<repoId>/<service>:<tag>
const repoId = config.get("repoId") ?? "crate";

// Cloud Run autoscaling bounds (per service).
const minInstances = config.getNumber("minInstances") ?? 0;
const maxInstances = config.getNumber("maxInstances") ?? 5;

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

// ── Derived values ─────────────────────────────────────────────────────────
type Env = gcp.types.input.cloudrunv2.ServiceTemplateContainerEnv;
const env = (name: string, value: pulumi.Input<string>): Env => ({ name, value });

const imageBase = pulumi.interpolate`${region}-docker.pkg.dev/${project}/${repoId}`;

// Shared OIDC env block — every service that validates Zitadel JWTs needs these.
const zitadelEnvs: Env[] = [
    env("ZITADEL_ISSUER", zitadelIssuer),
    env("ZITADEL_AUDIENCE", zitadelClientId),
    env("ZITADEL_JWKS_URL", `${zitadelIssuer}/oauth/v2/keys`),
    env("ZITADEL_USERINFO_URL", `${zitadelIssuer}/oidc/v1/userinfo`),
];

// Kafka comes in two flavors: Node services use plain user/pass, Spring uses a JAAS string.
const kafkaNodeEnvs: Env[] = [
    env("KAFKA_BROKERS", kafkaBrokers),
    env("KAFKA_SASL_USERNAME", kafkaUsername),
    env("KAFKA_SASL_PASSWORD", kafkaPassword),
];

const kafkaJaasConfig = pulumi.interpolate`org.apache.kafka.common.security.scram.ScramLoginModule required username="${kafkaUsername}" password="${kafkaPassword}";`;
const kafkaSpringEnvs: Env[] = [
    env("KAFKA_BOOTSTRAP_SERVERS", kafkaBrokers),
    env("KAFKA_SECURITY_PROTOCOL", "SASL_SSL"),
    env("KAFKA_SASL_MECHANISM", "SCRAM-SHA-256"),
    env("KAFKA_SASL_JAAS_CONFIG", kafkaJaasConfig),
];

// ── Artifact Registry ─────────────────────────────────────────────────────
const registry = new gcp.artifactregistry.Repository("registry", {
    repositoryId: repoId,
    format: "DOCKER",
    location: region,
    project,
});

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
function cloudRunService(
    name: string,
    envs: Env[],
    memory = "512Mi",
    containerPort?: number,
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
                ports: containerPort ? { containerPort } : undefined,
            }],
            scaling: { minInstanceCount: minInstances, maxInstanceCount: maxInstances },
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
    env("DATABASE_URL", neonUserDbUrl),
    ...zitadelEnvs,
], "512Mi", 8000);

const productSvc = cloudRunService("product-service", [
    env("SPRING_DATASOURCE_URL", neonProductJdbcUrl),
    env("SPRING_DATASOURCE_USERNAME", neonProductDbUser),
    env("SPRING_DATASOURCE_PASSWORD", neonProductDbPass),
    ...zitadelEnvs,
    ...kafkaSpringEnvs,
], "1Gi", 8081); // Spring Boot needs more heap

const orderSvc = cloudRunService("order-service", [
    env("DATABASE_URL", neonOrderDbUrl),
    ...zitadelEnvs,
    env("USER_SERVICE_URL", userSvc.uri),
    env("PRODUCT_SERVICE_URL", productSvc.uri),
    ...kafkaNodeEnvs,
], "512Mi", 3000);

const notifSvc = cloudRunService("notification-service", [
    ...kafkaNodeEnvs,
    env("SMTP_HOST", smtpHost),
    env("SMTP_PORT", smtpPort),
    env("SMTP_FROM", smtpFrom),
    env("SMTP_USER", "resend"),
    env("SMTP_PASS", resendApiKey),
    env("SMTP_SECURE", "true"),
], "512Mi", 3001);

// Zitadel host for nginx Host header (without scheme or port)
const zitadelHost = zitadelIssuer.replace(/^https?:\/\//, "");

const gatewaySvc = cloudRunService("gateway", [
    env("USER_SERVICE_URL", userSvc.uri),
    env("PRODUCT_SERVICE_URL", productSvc.uri),
    env("ORDER_SERVICE_URL", orderSvc.uri),
    env("ZITADEL_PROXY_URL", zitadelIssuer),
    env("ZITADEL_HOST_HEADER", zitadelHost),
    // Filter tells nginx envsubst which vars to substitute (leaves $host, $remote_addr etc. intact)
    env("NGINX_ENVSUBST_FILTER", "^ZITADEL_|_SERVICE_URL$"),
], "512Mi", 80);

const frontendSvc = cloudRunService("frontend", [
    env("VITE_ZITADEL_ISSUER", zitadelIssuer),
    env("VITE_ZITADEL_CLIENT_ID", zitadelClientId),
    env("VITE_ZITADEL_ORG_ID", zitadelOrgId),
    env("GATEWAY_URL", gatewaySvc.uri),
    env("NGINX_ENVSUBST_FILTER", "^GATEWAY_URL$"),
], "512Mi", 80);

// ── Exports ───────────────────────────────────────────────────────────────
export const frontendUrl = frontendSvc.uri;
export const gatewayUrl = gatewaySvc.uri;
export const registryUrl = imageBase;
