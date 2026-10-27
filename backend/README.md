# REA Backend

This directory contains the Spring Boot API for the Risk Evaluation Assistant.

The root `README.md` explains how to run the full Docker Compose stack. This file explains where to change important backend behavior.

## Run Locally

From the repository root, use the full Docker stack for normal local development:

```bash
docker-compose --env-file .env.local up -d --build
```

To run only the backend from this directory, keep PostgreSQL and Keycloak available first, then run:

```bash
./mvnw spring-boot:run
```

The local Spring profile reads:

- `backend/src/main/resources/application.properties`
- `backend/src/main/resources/application-local.properties`

## Useful Commands

```bash
./mvnw -DskipTests compile
./mvnw spring-boot:run
```

`./mvnw -DskipTests compile` checks the backend for compile errors.

## Important Change Points

### Environment and Runtime Configuration

Default backend settings live in:

- `backend/src/main/resources/application.properties`

Local Maven settings live in:

- `backend/src/main/resources/application-local.properties`

Docker runtime values come from the root environment files and are passed through `docker-compose.yml`:

- `.env.local`
- `.env.prod`
- `docker-compose.yml`

Common values to update are:

- PostgreSQL URL, username, password, and database name
- Keycloak issuer, JWK URL, realm, client ID, and client secret
- setup flags such as `APP_SETUP_LOAD_SAMPLE_DATA`
- schema behavior through `SPRING_JPA_HIBERNATE_DDL_AUTO`

### AI Model Installation

How administrators manage models and how researchers use them is described in the [QID Discovery README](../frontend/src/features/qidDiscovery/README.md). This section covers the backend implementation.

The browser-local AI models used for direct-identifier screening are listed in the shared registry `frontend/src/features/qidDiscovery/ai/modelRegistry.json`, which the Maven build copies into the backend (Docker builds from the repository root for this reason).

- `AiModelInstallationService` downloads a model's files from `<source>/<repository>/resolve/<revision>/<file>`, verifies each SHA-256 hash, and moves verified files into `<storage>/<model id>/<revision>/`. A model counts as installed only when all its files are verified; failed or interrupted installations can be retried. The default model is installed on startup.
- `AiModelController`: `GET /api/ai-models` (installation status, authenticated), `POST /api/ai-models/{id}/install` (administrators only), and `GET /api/ai-models/{id}/files/{revision}/{file}` (public, but only files listed in the registry for an installed model).
- `DatasetService` checks the AI screening provenance that the browser reports for a new dataset: the model must be allowed by the dataset's QID Discovery configuration version, and model id, repository, revision, quantisation and prompt/threshold profile names must match the registry, otherwise the request is rejected. The stored validation status is derived from the registry, never taken from the client. The prompt and threshold fingerprints remain client-reported, and none of this proves which model actually ran in the browser.

Settings (environment variables, passed through `docker-compose.yml`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_MODELS_STORAGE_DIR` | `ai-models` (Docker volume `ai-models` at `/app/ai-models`) | Persistent model storage |
| `AI_MODELS_SOURCE_URL` | `https://huggingface.co` | Download source, e.g. an internal mirror with the same URL layout |
| `AI_MODELS_REDIRECT_HOSTS` | `huggingface.co,hf.co` | Hosts (and subdomains) the source may redirect to over HTTPS |
| `HTTPS_PROXY` / `HTTP_PROXY` | – | Outgoing proxy for downloads |

For offline deployments, copy the files into `<storage>/<model id>/<revision>/` and restart the backend; they are used only if their hashes match.

### Database Initialisation

REA is set up for fresh installations; no manual SQL is required.

- On a fresh deployment, PostgreSQL is initialised automatically: the JPA entities under `model/` define the database structure, and Hibernate creates it (`SPRING_JPA_HIBERNATE_DDL_AUTO=update`, the default everywhere, including the local profile).
- Essential configurations are seeded automatically when missing: the bundled risk frameworks (`ConfigLoader`), the default attribute scoring system (`AttributeScoringSystemSeeder`) and the default QID Discovery configuration with AI screening enabled for DeBERTaV3-XSmall (`QidDiscoveryConfigurationSeeder`). Existing records, including ones edited by administrators, are never overwritten, and restarts create no new versions.
- Sample data is controlled by `APP_SETUP_LOAD_SAMPLE_DATA` (default `false`; `true` in `.env.local`).
- Restarting the application keeps all data. Never use `create` or `create-drop` against a database whose data must be kept.

This strategy is intended for fresh installations. `update` only adds missing tables and columns; it does not migrate data, rename or drop columns, or change constraints, so upgrading an existing database across schema changes needs a reviewed manual migration.

### Controllers, Services, DTOs, and Models

The backend follows the usual controller/service/repository structure:

- controllers: `backend/src/main/java/org/bihealth/mi/risk_assessment_api/controller/`
- services: `backend/src/main/java/org/bihealth/mi/risk_assessment_api/service/`
- request DTOs: `backend/src/main/java/org/bihealth/mi/risk_assessment_api/dto/request/`
- response DTOs: `backend/src/main/java/org/bihealth/mi/risk_assessment_api/dto/response/`
- JPA models: `backend/src/main/java/org/bihealth/mi/risk_assessment_api/model/`
- repositories: `backend/src/main/java/org/bihealth/mi/risk_assessment_api/repository/`

For a new API field, update the model if it is persisted, the request/response DTOs if it crosses the API boundary, the service logic, and the frontend API wrapper.

### Authentication, Roles, and Access Checks

Keycloak roles are mapped into Spring authorities by:

- `backend/src/main/java/org/bihealth/mi/risk_assessment_api/security/JwtAuthenticationTokenConverter.java`

Role helper checks live in:

- `backend/src/main/java/org/bihealth/mi/risk_assessment_api/security/SecurityUtils.java`

REA currently uses:

- `ROLE_ADMIN`
- `ROLE_USER`

If you add or rename roles, update the Keycloak realm files, backend checks, and frontend navigation/permission handling together.

### Keycloak Realm Imports

Keycloak realm imports live in the root project:

- `keycloak/realm-config-local.json`
- `keycloak/realm-config.json`

Both realm files currently contain the demo users and a development `rea-backend` client secret. Before a production import, remove the demo users from `realm-config.json` (keep or create an administrator) and set a new client secret there that matches the deployment's `REA_BACKEND_CLIENT_SECRET`. Keycloak imports a realm only if it does not exist yet.

`docker-compose.prod.yml` runs Keycloak in production mode (`start`, strict hostname `KC_HOSTNAME` including `/auth`, HTTP behind the TLS-terminating Nginx) and stores its data in the PostgreSQL database; Keycloak's table names do not overlap with REA's. The base `docker-compose.yml` runs Keycloak in development mode, which keeps its data inside the container.

The custom login theme is in:

- `rea-theme/`

It is mounted into Keycloak by the root `docker-compose.yml`.

### Risk Configuration Loader

Bundled risk framework definitions live in:

- `backend/src/main/resources/data/el-emam-config.json`
- `backend/src/main/resources/data/sphn-config.json`

`ConfigLoader` imports each JSON file as a complete risk configuration object:

- `backend/src/main/java/org/bihealth/mi/risk_assessment_api/config/ConfigLoader.java`

Each configuration JSON includes categories, questions, options, risk bands, matrices, and re-identification thresholds. If you change this structure, update the model, DTOs, loader validation, frontend configuration screens, and sample data together.

### Sample Data Loader

Demo data, including the LEOSS example dataset, profiling evidence, recipients, assessments and data-sharing activities, is initialised by `DataLoader` and `DemoDatasetEvidenceSeeder` when `APP_SETUP_LOAD_SAMPLE_DATA=true`. This option is intended for local demonstrations and is disabled in production.

The demo data is created only if neither the LEOSS dataset nor any demo recipient exists yet; otherwise nothing is created or changed, so restarts do not duplicate demo records or overwrite edits to them.

### Attribute Scale Values

Backend validation limits for dataset attribute scores are defined in:

- `backend/src/main/java/org/bihealth/mi/risk_assessment_api/utils/AttributeScale.java`

If you change these values, keep the frontend scale configuration in sync:

- `frontend/src/utils/AttributeScale.js`

Also review bundled JSON data and any existing database records that may contain values outside the new range.

### Dataset Data Types

Persisted dataset column types are defined by:

- `backend/src/main/java/org/bihealth/mi/risk_assessment_api/enums/DataType.java`

Dataset attributes store the enum name in:

- `backend/src/main/java/org/bihealth/mi/risk_assessment_api/model/dataset/DatasetTableAttribute.java`

If you add or rename a type, keep the frontend type list and CSV detector in sync:

- `frontend/src/utils/DataType.js`
- `frontend/src/utils/detectMeasurement.js`

### Risk Computation

Risk computation logic lives in:

- `backend/src/main/java/org/bihealth/mi/risk_assessment_api/utils/RiskComputationService.java`
- `backend/src/main/java/org/bihealth/mi/risk_assessment_api/service/RiskService.java`

When changing risk formulas, update the corresponding framework JSON, backend computation, report output, and any frontend text that explains the calculation.

### OpenAPI and Swagger

Swagger settings are in:

- `backend/src/main/resources/application.properties`
- `backend/src/main/java/org/bihealth/mi/risk_assessment_api/config/OpenApiConfig.java`

The UI uses the configured `/api/v3/api-docs` paths so it works behind Nginx. "Try it out" uses a bearer token pasted into the UI; no OAuth client credentials are configured for the browser.

## Change Checklist

Before finishing a backend change:

1. Run `./mvnw -DskipTests compile`.
2. Verify request and response DTOs match the frontend API wrappers.
3. If a change affects startup data, check first start and restart against a disposable database (never the shared one) and confirm the seeders are idempotent.
4. If a change affects roles or auth, update the Keycloak realm and frontend permission behavior.
