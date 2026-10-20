# Risk Evaluation Assistant (REA)

**REA (Risk Evaluation Assistant)** is an open-source decision-support tool designed for non-technical users to operationalize **risk-based anonymization**. It provides a structured workflow to help data custodians determine safe parameters for sharing data.

REA performs a **qualitative attribute-level review**, classifying variables by Replicability, Availability, and Distinguishability to identify quasi-identifiers and assess attribute Sensitivity. It then models the **data release context** by assessing three key factors: Invasion of Privacy, Mitigating Controls, and the Recipient’s Motives and Capacity. Finally, REA translates these qualitative assessments into actionable quantitative metrics:

- **Probability of Attack:** Estimated based on the strength of security controls and recipient capacity.
- **Recommended Anonymization Threshold:** Defines the maximum permissible data risk for the specific scenario.

Together, these outputs allow users to configure anonymization engines by specifying exactly which variables require protection and defining the appropriate risk parameters.

## Main Workflow

This video provides a comprehensive walkthrough of the REA main workflow.

[![REA Main Workflow](./images/thumbnail.png)](https://www.youtube.com/watch?v=KaFIxCkTF4I)

## Architecture

REA is implemented as a three-tier, containerized web application orchestrated with 🐳 **Docker Compose**. Incoming requests are managed by a reverse proxy using 🌐 **Nginx** (exposing ports 80 and 443), which serves the ⚛️ **React** frontend and proxies API calls to the 🌱 **Spring Boot** backend. Authentication and authorization are centrally managed via OpenID Connect with 🔑 **Keycloak**. The React SPA obtains tokens from Keycloak and presents them to the API, where Spring Security validates them. All application data persist in an 🐘 **PostgreSQL** database.

![architecture](./images/architecture.png)

<br />

## Configurations

This section outlines the basic configurations available for the application. Docker Compose uses one environment file to configure Keycloak, Nginx, PostgreSQL, and the Spring Boot backend.

- **Local (`.env.local`)**: Uses `KC_REALM_FILE=realm-config-local.json` to import the localhost Keycloak realm and loads demo data (`APP_SETUP_LOAD_SAMPLE_DATA=true`).
- **Production (`.env.prod` with `docker-compose.prod.yml`)**: Treat `.env.prod` as a template: secrets (database, Keycloak admin, backend client secret) are left empty and must be provided by the deployment. Demo data is disabled. The production override runs Keycloak in production mode with its data in PostgreSQL and publishes only the Nginx ports. Before deployment, configure the production Keycloak realm (see the [backend guide](./backend/README.md#keycloak-realm-imports)), TLS certificates, and Nginx reverse-proxy settings for your domain.

The base `docker-compose.yml` alone is a development setup (Keycloak `start-dev`, published database, backend and Keycloak ports) and is not suitable for production.

### 🔐 Keycloak

Keycloak provides OpenID Connect authentication and authorization. The imported realm must define the clients and roles required by REA.

The repository also includes `rea-theme/`, a custom Keycloak login theme. Docker Compose mounts it into Keycloak, and the imported realm configures it as the login theme.

#### Application Roles

REA uses two application roles:

- **Admin (`ROLE_ADMIN`)**: Can manage risk configurations and override normal access restrictions, including ownership, sharing, and locking rules.
- **Simple user (`ROLE_USER`)**: Can work with assigned or shared datasets, recipients, assessments, and data-sharing activities, but cannot change global configurations or override other users' work.

### 🌱 Backend - Spring Boot

On a fresh PostgreSQL database, the backend creates the schema and the essential configurations automatically; no SQL scripts are needed, and restarts keep all data:

1. **Risk frameworks**: complete risk configurations imported from the JSON files in `backend/src/main/resources/data/` (categories, questions, options, risk bands, risk matrix, re-identification thresholds).
2. **Default attribute scoring system** and **default QID Discovery configuration** (including AI screening settings).
3. **Demo data** (optional, `APP_SETUP_LOAD_SAMPLE_DATA`): a sample dataset with recipients, assessments and data-sharing activities.

Existing configurations are never overwritten. This initialisation is intended for fresh installations, not for upgrading existing databases across schema changes; see [Database Initialisation](./backend/README.md#database-initialisation).

<br />

## 🚀 Start Application

### 1. Prerequisites

Ensure you have installed **Docker & Docker Compose** (Engine ≥ 19.03, Compose ≥ 1.25) on your machine.

### 2. Clone the Repository

```bash
git clone https://github.com/BIH-MI/risk-evaluation-assistant.git
cd risk-evaluation-assistant
```

### 3. Run the Application Locally

```bash
# Start using the local environment file
docker-compose --env-file .env.local up -d --build
```

Once the containers are ready, open `http://localhost`.

The local realm provides these demo accounts:

| Role | Username | Password |
| --- | --- | --- |
| Admin | `admin` | `admin` |
| Simple user | `user` | `password` |

These credentials are for local development only. The full list of imported local users is defined in `keycloak/realm-config-local.json`.

For a production deployment, provide the secrets and add the production override:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### 4. AI-Assisted Direct-Identifier Screening

When a CSV is uploaded in **Add Dataset**, REA screens each attribute for potential direct identifiers (names, email addresses, insurance numbers, ...) before quasi-identifier profiling. REA combines three complementary sources of evidence to support attribute-level screening:

- **AI model:** a small zero-shot language model classifies the column name (and an optional researcher-written description). It runs in the researcher's browser; data values are never given to it, and nothing is sent to external services.
- **Column-name rules:** unambiguous names such as `email_address` are excluded automatically, independent of the model.
- **Value patterns:** the observed values are checked separately, locally in the browser, with regular expressions (for example email or IP address formats).

Column-name rules, value-pattern checks, manual exclusions and profiling also work when AI screening is disabled.

**Administrators** manage AI screening per QID Discovery configuration (**Configuration > QID Discovery > Edit Configuration > AI-Assisted Direct-Identifier Detection**): enable or disable it, choose the available models and the default, and install models. Installation downloads pinned, hash-verified files to the backend, which serves them to browsers.

**Researchers** use the configured model automatically, or choose one when several are available (the default is preselected). Attributes with an unresolved potential identifier finding are marked for review and must be excluded or explicitly kept before the dataset can be created. Every automatic exclusion can be reverted.

**Limitations.** AI classification uses column names and optional researcher-provided descriptions. Predictions may be incorrect, and model scores are neither calibrated probabilities nor estimates of re-identification risk. A model may exclude attributes on its own only if its exact configuration has been evaluated and approved for that; currently no model is approved. DeBERTaV3-XSmall has been evaluated; MobileBERT-MNLI and DistilBERT-MNLI have not. The researcher remains responsible for the final decision.

Model management, adding models and deployment details: [frontend guide](./frontend/README.md#ai-assisted-direct-identifier-screening) and [backend guide](./backend/README.md#ai-model-installation).

## Developer Guides

- [Frontend guide](./frontend/README.md)
- [Backend guide](./backend/README.md)

<br />
<br />

## Acknowledgments

- This project uses components from [Material Dashboard React](https://github.com/creativetimofficial/material-dashboard-react), which is licensed under the MIT License.  
  See [`third-party/material-dashboard-react_LICENSE.md`](third-party/material-dashboard-react_LICENSE.md) for the full license text.

## License

This project is licensed under the MIT License. See the full text in [LICENSE.md](./LICENSE.md).

## How to Cite

If you use REA in academic or scientific work, please cite the project and link to this repository.
