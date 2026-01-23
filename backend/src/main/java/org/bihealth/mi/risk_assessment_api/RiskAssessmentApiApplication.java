package org.bihealth.mi.risk_assessment_api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.core.env.Environment;

@SpringBootApplication
@EnableScheduling
public class RiskAssessmentApiApplication {

    public static void main(String[] args) {
        ConfigurableApplicationContext context = SpringApplication.run(RiskAssessmentApiApplication.class, args);
        printEnv(context.getEnvironment());
    }

    private static void printEnv(Environment env) {
        System.out.println("\n\n === Environmental Variables ===");
        System.out.println("Application Name: " + env.getProperty("spring.application.name"));
        System.out.println("Server Port: " + env.getProperty("server.port"));
        System.out.println("Active Profiles: " + env.getProperty("spring.profiles.active"));
        System.out.println("Keycloak Issuer URI: " + env.getProperty("spring.security.oauth2.client.provider.keycloak.issuer-uri"));
        System.out.println("Database URL: " + env.getProperty("spring.datasource.url"));
        System.out.println("=================================\n\n ");
    }
}
