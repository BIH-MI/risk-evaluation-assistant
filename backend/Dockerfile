# =======================================================
# STAGE 1: BUILD (Maven + Java)
# =======================================================
FROM maven:3.8.4-eclipse-temurin-17 AS build

# Receive Proxy/Maven settings from docker-compose args
# This allows the build to work both Locally (empty) and in Prod (with proxy)
ARG MAVEN_OPTS

WORKDIR /app
    
# Build context is the repository root (see docker-compose.yml).
# Copy only the POM first to cache dependencies
COPY backend/pom.xml .

# Download dependencies (Go Offline)
# We use ${MAVEN_OPTS} to inject proxy settings if they exist
RUN mvn ${MAVEN_OPTS} dependency:go-offline
    
# Copy the source code and the AI model registry shared with the frontend
# (pom.xml reads it from ../frontend)
COPY frontend/src/features/qidDiscovery/ai/modelRegistry.json /frontend/src/features/qidDiscovery/ai/modelRegistry.json
COPY backend/src ./src

# Build the JAR file
RUN mvn ${MAVEN_OPTS} clean package -DskipTests

# =======================================================
# STAGE 2: RUNTIME (JRE Only)
# =======================================================
# Use a smaller image for the final container
FROM eclipse-temurin:17-jre-noble

WORKDIR /app

# Copy the built JAR from the previous stage
COPY --from=build /app/target/*.jar app.jar

# Expose the internal port (mapped to 8080 in docker-compose)
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]