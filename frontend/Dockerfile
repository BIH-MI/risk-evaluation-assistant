# =======================================================
# STAGE 1: BUILD (Node.js)
# =======================================================
# Node.js 22 LTS, pinned for reproducible builds
FROM node:22.23.3-alpine3.24 AS build

WORKDIR /app

# Install exactly the versions in package-lock.json. The lockfile resolves
# TypeScript 6 (required by i18next), outside react-scripts 5's declared
# peer range; --legacy-peer-deps installs the locked tree unchanged instead of
# failing on that peer check.
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Receive Build Arguments from docker-compose
# React requires these at BUILD time to bake them into the static JS
ARG REACT_APP_OIDC_AUTHORITY
ARG REACT_APP_OIDC_CLIENT_ID
ARG REACT_APP_OIDC_REDIRECT_URI
ARG REACT_APP_OIDC_POST_LOGOUT_REDIRECT_URI
ARG REACT_APP_API_URL

# Set them as Environment Variables for the build process
ENV REACT_APP_OIDC_AUTHORITY=$REACT_APP_OIDC_AUTHORITY
ENV REACT_APP_OIDC_CLIENT_ID=$REACT_APP_OIDC_CLIENT_ID
ENV REACT_APP_OIDC_REDIRECT_URI=$REACT_APP_OIDC_REDIRECT_URI
ENV REACT_APP_OIDC_POST_LOGOUT_REDIRECT_URI=$REACT_APP_OIDC_POST_LOGOUT_REDIRECT_URI
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Create the production build (output to /app/build). "prebuild" copies the
# hash-verified ONNX Runtime files from node_modules (scripts/copy-onnx-runtime.js).
RUN npm run build

# =======================================================
# STAGE 2: RUNTIME (Nginx)
# =======================================================
FROM nginx:1.25-alpine

# Copy the build output to Nginx's html directory
COPY --from=build /app/build /usr/share/nginx/html

# SPA routing and the ONNX Runtime files under /ai-assets/ (WASM MIME type,
# no index.html fallback for missing files)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]