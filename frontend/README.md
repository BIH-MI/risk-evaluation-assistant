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
npm test
```

`npm run build` is the main validation command for frontend changes.

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
