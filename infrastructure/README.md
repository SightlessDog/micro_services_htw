# Infrastructure — Deployment Setup

Pulumi (TypeScript) IaC for GCP Cloud Run + Artifact Registry. Two stacks: `staging` (develop branch) and `production` (main branch).

## 1. GCP project

```bash
gcloud projects create ecommerce-app-XXXX --name="Ecommerce App"   # or pick existing
gcloud config set project ecommerce-app-XXXX
gcloud billing projects link ecommerce-app-XXXX --billing-account=YOUR_BILLING_ID
```

## 2. Enable APIs

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com iam.googleapis.com
```

## 3. Service account for CI

```bash
gcloud iam service-accounts create gh-deployer --display-name="GitHub Actions Deployer"

gcloud projects add-iam-policy-binding ecommerce-app-XXXX \
  --member="serviceAccount:gh-deployer@ecommerce-app-XXXX.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding ecommerce-app-XXXX \
  --member="serviceAccount:gh-deployer@ecommerce-app-XXXX.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding ecommerce-app-XXXX \
  --member="serviceAccount:gh-deployer@ecommerce-app-XXXX.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud iam service-accounts keys create gh-deployer-key.json \
  --iam-account=gh-deployer@ecommerce-app-XXXX.iam.gserviceaccount.com
```

## 4. Pulumi CLI + login

```bash
brew install pulumi
pulumi login   # app.pulumi.com free tier, or `pulumi login --local` for local state
```

## 5. GitHub repo secrets

```bash
gh secret set GCP_SA_KEY < gh-deployer-key.json
gh secret set GCP_PROJECT --body "ecommerce-app-XXXX"
gh secret set PULUMI_ACCESS_TOKEN --body "<token from app.pulumi.com/account/tokens>"
```

Delete `gh-deployer-key.json` locally after — never commit it.

## 6. Fill stack config placeholders

Edit `Pulumi.staging.yaml` and `Pulumi.production.yaml`, replace:
- `gcp:project` → real project id
- `ecommerce-infra:zitadelIssuer` / `zitadelClientId` / `zitadelOrgId`
- `ecommerce-infra:smtpHost` → `smtp.resend.com`
- `ecommerce-infra:smtpFrom` → your verified Resend sender

## 7. Set Pulumi secrets (per stack, 9 keys each)

```bash
cd infrastructure
pulumi stack select staging   # or `pulumi stack init staging` if not yet created

pulumi config set --secret neonUserDbUrl "postgresql://..."
pulumi config set --secret neonOrderDbUrl "postgresql://..."
pulumi config set --secret neonProductJdbcUrl "postgresql://..."
pulumi config set --secret neonProductDbUser "username"
pulumi config set --secret neonProductDbPass "password"
pulumi config set --secret kafkaBrokers "...redpanda.com:9092"
pulumi config set --secret kafkaUsername "username"
pulumi config set --secret kafkaPassword "password"
pulumi config set --secret resendApiKey "re_..."

pulumi stack select production   # repeat with prod credentials
```

## 8. Sanity check

```bash
pulumi preview --stack staging
pulumi preview --stack production
```

## 9. Deploy

- Commit infra files (not `node_modules/`, not key json).
- Push to `develop` → triggers `.github/workflows/deploy-staging.yml`.
- Merge to `main` → triggers `.github/workflows/deploy-production.yml`.
