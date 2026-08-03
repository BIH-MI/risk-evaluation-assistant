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
./mvnw test
./mvnw spring-boot:run
```

`./mvnw -DskipTests compile` is the fastest validation command for backend compile errors.

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

The local realm contains demo users for local login. Production should use real users, secure credentials, correct redirect URIs, and the deployed domain.

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

Demo backend data is created by:

- `backend/src/main/java/org/bihealth/mi/risk_assessment_api/config/DataLoader.java`

It is controlled by:

- `APP_SETUP_LOAD_SAMPLE_DATA`
- `app.setup.load-sample-data`

Use this loader only for local/demo data. Do not rely on it for production records.

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

The UI uses the configured `/api/v3/api-docs` paths so it works behind Nginx.

## Change Checklist

Before finishing a backend change:

1. Run `./mvnw -DskipTests compile`.
2. Run targeted tests if the changed service has coverage.
3. Verify request and response DTOs match the frontend API wrappers.
4. If a change affects startup data, test with a fresh local database or confirm the loader is idempotent.
5. If a change affects roles or auth, update the Keycloak realm and frontend permission behavior.
