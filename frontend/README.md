# REA Frontend

This directory contains the React single-page application for the Risk Evaluation Assistant.

The root `README.md` explains how to run the full Docker Compose stack. This file explains where to change important frontend behavior.

## Run Locally

From the repository root, use the full Docker stack when you want Keycloak, PostgreSQL, the backend, Nginx, and the frontend together:

```bash
docker-compose --env-file .env.local up -d --build
```

From this directory, use the React dev server only when the backend and Keycloak are already available:

```bash
npm install
npm start
```

The dev server reads `frontend/.env.development`. Production builds read `frontend/.env.production` and Docker build arguments from the root `docker-compose.yml`.

## Useful Commands

```bash
npm start
npm run build
npx eslint src scripts --ext .js
```

`npm run build` and the ESLint check are the validation commands for frontend changes.

## Important Change Points

### API URL and Keycloak Client Settings

For direct `npm start` development, change:

- `frontend/.env.development`

For Docker builds, change the root environment file and Docker build args:

- `.env.local`
- `.env.prod`
- `docker-compose.yml`

The frontend uses these variables:

- `REACT_APP_API_URL`
- `REACT_APP_OIDC_AUTHORITY`
- `REACT_APP_OIDC_CLIENT_ID`
- `REACT_APP_OIDC_REDIRECT_URI`
- `REACT_APP_OIDC_POST_LOGOUT_REDIRECT_URI`

The OIDC provider is initialized in `frontend/src/index.js`.

### Routes and Screens

Add or change routes in:

- `frontend/src/routes.js`

Screens live under:

- `frontend/src/screens/`

Routes with `type: "collapse"` appear in the side navigation. Routes with `type: "route"` are available to React Router but hidden from the side navigation.

### API Calls and Redux State

API wrappers live under:

- `frontend/src/api/`

Redux slices and thunks live under:

- `frontend/src/store/`

For a new backend endpoint, add or update the matching API wrapper first, then call it from the relevant thunk or screen.

### Shared UI Components

Reusable components live under:

- `frontend/src/components/`

Common input components are under `components/input/`; table-specific cells are under:

- `frontend/src/components/display/Tables/DataTable/CustomDataTableComponents/`

### Attribute Scale Values

The dataset attribute scale is configured in one place:

- `frontend/src/utils/AttributeScale.js`

Change `ATTRIBUTE_SCALE_OPTIONS` to change the selectable values, labels, and icons used by `MemoScaleCell`.

Change `ATTRIBUTE_SCALE_DEFAULTS` to change the default values for:

- dataset assessment creation
- data-sharing activity override defaults
- report fallback values
- sensitivity threshold defaults

If you change the allowed range, keep the backend validation in sync:

- `backend/src/main/java/org/bihealth/mi/risk_assessment_api/utils/AttributeScale.java`

Also review bundled sample data under `backend/src/main/resources/data/` if it contains persisted values that should match the new scale.

### Dataset Data Types and CSV Detection

Frontend data-type options are defined in:

- `frontend/src/utils/DataType.js`

CSV type detection lives in:

- `frontend/src/utils/detectMeasurement.js`
- `frontend/src/utils/CSVDropzone.js`

When adding a data type, update the frontend type list, detector, table cell icon/label rendering, backend `DataType` enum, and any sample data that should use the new type.

### Data-Sharing Activity Form and Mitigation Planner

The activity form lives in `frontend/src/screens/sharingActivity/AddEditDataSharingActivity/`:

- `activityFormModel.js`: form values, client-side validation and the request payload
- `activityRequirementFields.js`: requirement options, currency codes and the fields that show an (i) explanation
- `components/`: one component per form section

The Mitigation Planner screen lives in `frontend/src/screens/mitigationPlanner/`; `utils/mitigationPlannerFormatters.js` groups and formats the requirements it shows.

Requirement labels, options and (i) explanations are translated under `activityRequirements`. Keep these files in sync with the backend requirements (see the [backend guide](../backend/README.md#mitigation-planner-and-activity-requirements)).

### AI-Assisted Direct-Identifier Screening

The user-facing behaviour (configuration, review rules, profiling) is described in the [QID Discovery README](src/features/qidDiscovery/README.md). This section covers the implementation.

Code lives in `frontend/src/features/qidDiscovery/` ([feature guide](src/features/qidDiscovery/README.md)):

- `modelRegistry.json`: the single model registry, also packaged into the backend. Each entry pins a Hugging Face repository and commit, quantisation, the SHA-256 hash of every file, a prompt profile, a threshold profile and validation records.
- `promptProfiles.js`, `semanticCategories.js`, `thresholds.js`: what a model is asked and how its scores are interpreted. Profiles are versioned by id and fingerprint; add a new profile instead of changing one that a validation record refers to.
- `columnNameRules.js`: model-independent column-name evidence. Changing the phrases requires bumping `AI_NAME_RULES_VERSION`.
- `columnSuggestions.js`: combines model output with column-name evidence and decides which results need a researcher decision (`needsResearcherReview`).
- `worker/`: the Web Worker running Transformers.js with one adapter per inference strategy (currently zero-shot NLI). Requests are queued, only one model is kept in memory, and a worker that stops responding is terminated.
- `ai/screeningStatus.js`: per-attribute status, review count and the submission check for unresolved findings.

The ONNX Runtime WASM files are copied from `node_modules` into `public/ai-assets/` by `scripts/copy-onnx-runtime.js` (runs before `npm start` and `npm run build`, verified against pinned hashes). Model files are not part of the frontend; the backend installs and serves them (see the [backend guide](../backend/README.md#ai-model-installation)).

**Adding a compatible zero-shot NLI model** (exported for Transformers.js with `onnx/model_quantized.onnx`):

1. Add an entry to `modelRegistry.json` with a new `id`, the repository and full commit hash, `"dtype": "q8"`, `"strategy": "zero-shot-nli"`, a prompt and threshold profile, `"validations": []` and the SHA-256 hash of each file (`config.json`, `tokenizer.json`, `tokenizer_config.json`, `onnx/model_quantized.onnx`).
2. Rebuild frontend and backend, install the model in the QID Discovery configuration, and allow it there.

Other model types need a new adapter in `worker/` and a strategy in `modelConfig.js`. Add a validation record only after evaluating the exact configuration (revision, quantisation, prompt and threshold fingerprints), never edit recorded results, and set `approvedForAutoExclusion` only when the evidence supports automatic exclusion by the model alone.

### Translations

Translations live in:

- `frontend/src/locales/en/translation.json`
- `frontend/src/locales/de/translation.json`

When adding visible text, add translation keys instead of hard-coding strings in screens or components.

### Theme and Styling

Material UI theme configuration lives under:

- `frontend/src/assets/theme/`
- `frontend/src/assets/theme-dark/`

Images and icons live under:

- `frontend/src/assets/images/`

Keycloak login-page styling is separate from the React app and lives in the root `rea-theme/` directory.

## Change Checklist

Before finishing a frontend change:

1. Run `npm run build`.
2. Check the affected screen in local Docker or `npm start`.
3. Verify any new text exists in both EN and DE translation files.
4. If API contracts changed, update the backend DTO/controller/service and the matching frontend API wrapper together.
