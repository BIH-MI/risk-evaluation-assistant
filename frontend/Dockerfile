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