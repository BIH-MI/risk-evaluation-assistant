package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.config.demo.leoss.LeossDatasetSeeder;
import org.bihealth.mi.risk_assessment_api.config.demo.leoss.LeossAssessmentSeeder;
import org.bihealth.mi.risk_assessment_api.config.demo.epic.EpicPotsdamDatasetSeeder;
import org.bihealth.mi.risk_assessment_api.config.demo.epic.EpicPotsdamAssessmentSeeder;
import org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoRecipientSeeder;
import org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoDataSharingActivitySeeder;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Orchestrates optional sample data after the framework and scoring-system seeders. */
@Order(3)
@Component
public class DataLoader implements CommandLineRunner {
    @Value("${app.setup.load-sample-data:false}")
    private boolean loadSampleData;

    private final RiskConfigurationRepository configRepo;
    private final LeossDatasetSeeder leossDatasetSeeder;
    private final LeossAssessmentSeeder leossAssessmentSeeder;
    private final EpicPotsdamDatasetSeeder epicDatasetSeeder;
    private final EpicPotsdamAssessmentSeeder epicAssessmentSeeder;
    private final DemoRecipientSeeder recipientSeeder;
    private final DemoDataSharingActivitySeeder activitySeeder;

    public DataLoader(RiskConfigurationRepository configRepo,
                      LeossDatasetSeeder leossDatasetSeeder,
                      LeossAssessmentSeeder leossAssessmentSeeder,
                      EpicPotsdamDatasetSeeder epicDatasetSeeder,
                      EpicPotsdamAssessmentSeeder epicAssessmentSeeder,
                      DemoRecipientSeeder recipientSeeder,
                      DemoDataSharingActivitySeeder activitySeeder) {
        this.configRepo = configRepo;
        this.leossDatasetSeeder = leossDatasetSeeder;
        this.leossAssessmentSeeder = leossAssessmentSeeder;
        this.epicDatasetSeeder = epicDatasetSeeder;
        this.epicAssessmentSeeder = epicAssessmentSeeder;
        this.recipientSeeder = recipientSeeder;
        this.activitySeeder = activitySeeder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!loadSampleData) return;
        recipientSeeder.upgradeLegacyRecipientNames();
        Configuration elEmam = resolveConfiguration("El Emam Risk Exposure Model");
        Configuration sphn = resolveConfiguration("SPHN Risk Assessment Framework (v2.1.2)");

        var leoss = leossDatasetSeeder.ensureDataset();
        var leossElEmam = leossAssessmentSeeder.ensureElEmamAssessment(leoss, elEmam);
        var leossSphn = leossAssessmentSeeder.ensureSphnAssessment(leoss, sphn);
        var recipients = recipientSeeder.ensureRecipients(elEmam, sphn);
        var epic = epicDatasetSeeder.ensureDataset();
        var epicElEmam = epicAssessmentSeeder.ensureAssessment(epic, elEmam);
        activitySeeder.ensureActivities(leossElEmam, leossSphn, epicElEmam, recipients);
    }

    private Configuration resolveConfiguration(String name) {
        return configRepo.findAll().stream().filter(config -> name.equals(config.getName()))
                .findFirst().orElseThrow(() -> new IllegalStateException("Configuration not found: " + name));
    }
}
