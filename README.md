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

This section outlines the basic configurations available for the application. The system uses **Environment Files** to manage settings for different deployment targets. Before starting, ensure you have configured the appropriate file in the root directory:

- **`.env.local`**: For local development (Localhost).
- **`.env.prod`**: For production environments (Server).

⚠️ **IMPORTANT**: All the configurations outlined are provided as examples for demonstration and testing purposes. You must modify these values to match your specific infrastructure, security policies, and domain requirements before deploying to a live production environment.

### 🔐 Keycloak

Keycloak is pre-configured to import a specific realm configuration depending on your environment setting (`KC_REALM_FILE` in the `.env` file):

- **Local:** Imports `./keycloak/realm-config-local.json` (Configured for `http://localhost`).
- **Production:** Imports `./keycloak/realm-config.json` (Configured for `https://your-domain.com`).

These files define the **realm**, **clients**, **roles**, and some **demo users** for the application to function.

### 🌱 Backend - Spring Boot

Core backend parameters are stored in `src/main/resources/application.properties`. However, environment-specific values (Database credentials, Keycloak URLs, Proxy settings) are injected directly from your `.env.local` or `.env.prod` file via Docker Compose.

#### Risk Logic Configuration

On application startup, two loaders initialize the database to ensure the system is ready for use:

1. **ConfigLoader**: Imports the risk assessment logic from JSON files located in backend/src/main/resources/data/. This includes:

- **`questions.json`**: Defines the user assessment questions (e.g., "Invasion of Privacy", "Mitigating Controls") and their associated weights.
- **`thresholds.json`** (Risk Bands): Defines the quantitative risk thresholds and labels (e.g. Low / Moderate / High).
- **`matrix.json`**: Specifies the logic for calculating the probability of attack.

2. **DataLoader**: Inserts sample data (demo users, fake patients, and example risk assessments) for testing purposes.

<br />

## 🚀 Start Application

### 1. Prerequisites

Ensure you have installed **Docker & Docker Compose** (Engine ≥ 19.03, Compose ≥ 1.25) on your machine.

### 2. Clone the Repository

```bash
git clone https://github.com/BIH-MI/risk-evaluation-assistant.git
cd risk-evaluation-assistant
```

### 3. Run the Application

```bash
# Start using the local environment file
docker-compose --env-file .env.local up -d --build

# Start using the production environment file
docker-compose --env-file .env.prod up -d --build
```

<br />
<br />

## Acknowledgments

- This project uses components from [Material Dashboard React](https://github.com/creativetimofficial/material-dashboard-react), which is licensed under the MIT License.  
  See [`third-party/material-dashboard-react_LICENSE.md`](third-party/material-dashboard-react_LICENSE.md) for the full license text.

## License

This project is licensed under the MIT License. See the full text in [LICENSE.md](./LICENSE.md).

## How to Cite

If you use REA in academic or scientific work, please cite the project and link to this repository.
