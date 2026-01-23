package org.bihealth.mi.risk_assessment_api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for springdoc-openapi (Swagger UI).
 * Defines the API's metadata and the security scheme for JWT Bearer authentication.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        // Define the security scheme name
        final String securitySchemeName = "bearerAuth";

        // Create the OpenAPI definition
        return new OpenAPI()
                // 1. Add API metadata (title, version, description)
                .info(new Info()
                        .title("Risk Exposure Assessment (REA) API")
                        .version("v1.0")
                        .description("API for managing datasets, recipients, and risk exposure assessments."))

                // 2. Define a global security requirement to apply JWT authentication to all endpoints
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))

                // 3. Define the components, including the security scheme for JWT
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                        )
                );
    }
}