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
- Essential configurations are seeded automatically when missing: the bundled risk frameworks (`ConfigLoader`), the default attribute scoring system (`AttributeScoringSystemSeeder`) and the default QID Discovery configuration with AI screening enabled for DeBERTaV3-XSmall (`QidDiscoveryConfigurationSeeder`). The seed loaders do not overwrite existing frameworks or create versions on restart.
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

Demo data, including the LEOSS example with profiling evidence and the EPIC-Potsdam metadata-only example, recipients, assessments and data-sharing activities, is initialised by `DataLoader` and the dataset-specific seeders under `config/demo/` when `APP_SETUP_LOAD_SAMPLE_DATA=true`. This option is intended for local demonstrations and is disabled in production.

Missing sample components are initialized independently: an existing LEOSS dataset no longer prevents EPIC-Potsdam creation (and vice versa). Existing datasets and recipients are reused by normalized current/legacy names, with original assessment names as a fallback for renamed profiles. Assessments are reused by dataset/recipient and framework, and activities by assessment pair or name. Saved schemas, scores and questionnaire answers are not overwritten. Renaming both a profile and all its identifying demo assessment names removes the loader’s ability to recognize that profile as a demo; there is no separate seed marker. When sample loading is enabled, a transactional upgrade first renames the three legacy recipients in place. It requires the exact original name, creator (`user`), organization and description; edited legacy profiles are skipped. Target-name collisions are skipped and logged. Matching default assessment and linked activity names are also updated, with activity-name conflicts skipped. IDs, saved answers, shared users and relationships remain intact. New names/descriptions no longer match the upgrade, making ordinary restarts idempotent; subsequent user edits are not synchronized back to the seeds. No SQL migration or schema change is needed.

The recipients are research archetypes, not verified descriptions of DIfE, Charité or any other institution. New El Emam demo assessments assume all 19 controls for both controlled research scenarios, including an established collaboration, surprise-audit rights and independent audits. Both have technical expertise and financial resources; only the commercial scenario assumes commercial value. Neither assumes a motive to harm the custodian. The unrestricted scenario has no recipient-specific controls, assumes possible commercial/non-commercial motives and capability among unknown recipients, and still answers No to harm/embarrass.

Using the bundled El Emam configuration and the existing `RiskComputationService`, the revised seed answers produce:

| Scenario | Controls raw / normalized / band | Likelihood raw / normalized / band | Context risk (`P_attack`) |
| --- | --- | --- | --- |
| Trusted Academic Research Institute | 1130 / 100% / HIGH | 75 / 36.5854% / HIGH | 0.20 |
| Commercial Research Partner | 1130 / 100% / HIGH | 125 / 60.9756% / MAX | 0.40 |
| Public / Unrestricted Data Release | 0 / 0% / NONE | 155 / 75.6098% / MAX | 1.00 |

These are calculated reference results, not hard-coded outcomes. All 25 recipient questions are answered per scenario. Academic capability raises likelihood despite low motive; the existing model still gives the requested academic < commercial < unrestricted context-risk ordering. SPHN answers and both frameworks' scoring definitions are unchanged by this scenario cleanup.

**Existing databases:** restarting with sample loading enabled upgrades eligible legacy display names/descriptions and adds missing sample components. Existing recipient assessments keep their answers and may therefore produce different results from the revised seeds above. Review those saved assessments explicitly before using them in a research comparison; the loader does not replace assessment history.

### EPIC-Potsdam metadata-only research example

The EPIC-Potsdam Dairy and Chronic Disease Dataset represents the NFDI4Health P1090 dairy/chronic-disease use case: 25,146 records and one Participants table with 48 attributes (14 INTEGER, 34 DECIMAL), in the supplied schema order. No participant rows, example values or measured QID Discovery statistics are bundled or generated. Only the known record count is stored; analysed counts, Distinction, Separation, Singleton Fraction and subset evidence remain absent.

Its single assessment, `EPIC-Potsdam Assessment (El Emam)`, uses the named REA Default Scoring System and the scoring system’s identifiability default (5 for the standard system) and an assessment-local sensitivity threshold of 3. Global defaults remain unchanged. The Dataset description column now allows 2,048 characters to retain the full use-case description; the local Hibernate schema update applies this widening. Expert scores are stored with explicit R/A/D/S field names. `ident` is excluded in the schema and marked as a direct identifier with null scores in the assessment. The assessment model has no separate exclusion flag.

The 11 impact answers follow the supplied research scenario. N/A is used for the four governance/consent conditions that cannot be inferred from the data. Three activities share this same dataset assessment and reference the three distinct El Emam recipient assessments. No EPIC SPHN assessment or activity is created.

The expert scores are unchanged. Report classifications continue to use the existing strict `>` comparisons; this update changes the default identifiability threshold only, not the classification formulas or sensitivity threshold.

With sample loading enabled, the EPIC seeder corrects the legacy 7 only for the exact original demo assessment, original scoring-system version/default, and unchanged creation audit metadata (the sub-millisecond gap from the two insert timestamps). Existing edited assessments, renamed demos, custom scoring systems and uncertain audit histories are left untouched. Such records can retain 7 and require explicit user review; neither the UI nor export silently overrides a stored threshold. New EPIC assessments inherit the selected named scoring system’s default, including administrator overrides.

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

### Questionnaire presentation data

Bundled framework JSON files own question `explanation` / `explanationTranslations` and the order of their `options` arrays. Standard answers are stored as Yes, N/A, No. Custom scales keep their declared order. Each option also includes `displayOrder` for clarity. Configuration creation, editing and copying persist array positions to `question_options.display_order`; JPA returns options in that order. The frontend displays the returned order and localized explanations without label-based sorting or question-text lookups. Clarifications can be edited in the configuration editor.

With the configured `ddl-auto=update`, starting the backend adds the required columns/table through Hibernate. New frameworks are seeded from the JSON files. Existing configurations are left unchanged: schema updates do not import revised JSON content into already seeded records.

### El Emam checklist wording

The English wording of existing El Emam checklist items follows Appendix A of *De-identifying Health Data for Secondary Use: A Framework* (2008), printed pages 12–13 (PDF pages 14–15). Original qualifications and parenthetical examples belong in `text`; application-authored clarifications remain separate in `explanation` and are displayed as tooltips. German wording is an application translation.

The configuration remains an adaptation: its weights, scoring, category assignment and Yes / N/A / No display order are application choices. The original checklist also includes “Disclosure of the information carries a probability of causing measurable injury (e.g., identity theft, fraud, etc)”; this item is absent from the existing configuration and has not been added without an agreed scoring weight. Existing database configurations are not rewritten by changing the seed JSON.
