package org.bihealth.mi.risk_assessment_api.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bihealth.mi.risk_assessment_api.repository.matrix.RiskBandRepository;
import org.bihealth.mi.risk_assessment_api.repository.matrix.RiskMatrixRepository;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.QuestionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Component
@Order(1)
public class ConfigLoader implements CommandLineRunner {

    @Value("${app.setup.update-thresholds:false}")
    private boolean updateRiskBands;

    @Value("${app.setup.update-questions:false}")
    private boolean updateQuestions;

    private final RiskBandRepository riskBandRepository;
    private final QuestionRepository questionRepo;
    private final RiskMatrixRepository riskMatrixRepo;
    private final ObjectMapper objectMapper;

    public ConfigLoader(
            RiskBandRepository riskBandRepository,
            QuestionRepository questionRepo,
            RiskMatrixRepository riskMatrixRepo,
            ObjectMapper objectMapper
    ) {
        this.riskBandRepository = riskBandRepository;
        this.questionRepo = questionRepo;
        this.riskMatrixRepo = riskMatrixRepo;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // 1. Load Risk Bands (Thresholds)
        if (riskBandRepository.count() == 0 || updateRiskBands) {
            loadJson("data/thresholds.json", new TypeReference<>() {}, riskBandRepository);
        }

        // 2. Load Questions
        if (questionRepo.count() == 0 || updateQuestions) {
            loadJson("data/questions.json", new TypeReference<>() {}, questionRepo);
        }

        // 3. Load Matrix
        if (riskMatrixRepo.count() == 0 || updateQuestions) {
            riskMatrixRepo.deleteAll();
            loadJson("data/matrix.json", new TypeReference<>() {}, riskMatrixRepo);
        }
    }

    /**
     * Generic method to load a JSON file and save entities to a repository.
     */
    private <T> void loadJson(String path, TypeReference<List<T>> typeRef, JpaRepository<T, ?> repository) {
        try {
            ClassPathResource resource = new ClassPathResource(path);
            if (!resource.exists()) {
                System.err.println("⚠ Config file not found: " + path);
                return;
            }

            try (InputStream inputStream = resource.getInputStream()) {
                List<T> entities = objectMapper.readValue(inputStream, typeRef);
                repository.saveAll(entities);
                System.out.println("✅ Loaded " + entities.size() + " items from " + path);
            }
        } catch (IOException e) {
            System.err.println("❌ Failed to load " + path + ": " + e.getMessage());
        }
    }
}