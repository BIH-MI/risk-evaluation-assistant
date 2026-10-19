# =======================================================
# STAGE 1: BUILD (Node.js)
# =======================================================
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Self-host the AI column classifier assets (model, tokenizer, ONNX Runtime
# WASM) under public/ai-assets/ so they are served by Nginx and the browser
# never loads models from external services at inference time.
# - "fetch" (default): verify pre-placed files against pinned SHA-256 hashes and
#   download any missing ones from the pinned Hugging Face revision.
# - "skip": build without AI assets; the app works and reports AI suggestions
#   as unavailable.
ARG REA_AI_ASSETS=fetch
RUN if [ "$REA_AI_ASSETS" = "skip" ]; then \
      echo "Skipping AI model assets (REA_AI_ASSETS=skip)"; \
    else \
      npm run fetch:ai-assets; \
    fi

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

# Debug: Print variables to build log
RUN echo "Building with:" && \
    echo $REACT_APP_OIDC_AUTHORITY && \
    echo $REACT_APP_OIDC_CLIENT_ID && \
    echo $REACT_APP_OIDC_REDIRECT_URI && \
    echo $REACT_APP_OIDC_POST_LOGOUT_REDIRECT_URI

# Create the production build (output to /app/build)
RUN npm run build

# =======================================================
# STAGE 2: RUNTIME (Nginx)
# =======================================================
FROM nginx:1.25-alpine

# Copy the build output to Nginx's html directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]