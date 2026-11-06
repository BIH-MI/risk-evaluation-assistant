package org.bihealth.mi.risk_assessment_api.config.demo.leoss;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetTableRepository;
import org.springframework.stereotype.Component;
import static java.util.Map.entry;
import static org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoSeedSupport.findDataset;

@Component
public class LeossDatasetSeeder {
    private final DatasetRepository datasetRepo;
    private final DatasetTableRepository tableRepo;
    private final LeossDatasetEvidenceSeeder evidenceSeeder;

    public LeossDatasetSeeder(DatasetRepository datasetRepo, DatasetTableRepository tableRepo, LeossDatasetEvidenceSeeder evidenceSeeder) {
        this.datasetRepo = datasetRepo;
        this.tableRepo = tableRepo;
        this.evidenceSeeder = evidenceSeeder;
    }

    private static final String LEOSS_DATASET_NAME = "LEOSS Public Use File";

    public Dataset ensureDataset() {
        return findDataset(datasetRepo.findAll(), LEOSS_DATASET_NAME, "LEOSS Assessment (El Emam)")
                .orElseGet(() -> {
                    Dataset dataset = createLeossDataset();
                    evidenceSeeder.apply(dataset);
                    return dataset;
                });
    }

    private Dataset createLeossDataset() {
        Dataset leoss = new Dataset();
        leoss.setCreatorUsername("user");
        leoss.setName(LEOSS_DATASET_NAME);
        leoss.setDescription("Lean European Open Survey on SARS-CoV-2-Infected Patients (anonymized PUF)");
        leoss.setSharedUsernames(new HashSet<>(Set.of("anna.mueller", "max.mustermann", "sophie.becker")));
        leoss = datasetRepo.save(leoss);

        DatasetTable patients = new DatasetTable();
        patients.setName("Patients");
        patients.setCreatorUsername("user");
        patients.setDataset(leoss);

        // LinkedHashMap preserves the display/order of attributes in the sample
        // table, which makes seeded assessments and UI inspection predictable.
        Map<String, DataType> attributes = new LinkedHashMap<>();
        attributes.put("insurance_number", DataType.STRING);
        attributes.put("age_at_diagnosis", DataType.INTEGER);
        attributes.put("gender", DataType.STRING);
        attributes.put("date_of_diagnosis", DataType.DATETIME);
        attributes.put("uncomplicated_phase", DataType.BOOLEAN);
        attributes.put("complicated_phase", DataType.BOOLEAN);
        attributes.put("critical_phase", DataType.BOOLEAN);
        attributes.put("recovery_phase", DataType.BOOLEAN);
        attributes.put("vasopressors_in_complicated_phase", DataType.BOOLEAN);
        attributes.put("vasopressors_in_critical_phase", DataType.BOOLEAN);
        attributes.put("invasive_ventilation_in_critical_phase", DataType.BOOLEAN);
        attributes.put("superinfection_uncomplicated_phase", DataType.BOOLEAN);
        attributes.put("superinfection_complicated_phase", DataType.BOOLEAN);
        attributes.put("superinfection_critical_phase", DataType.BOOLEAN);
        attributes.put("symptoms_in_recovery_phase", DataType.STRING);
        attributes.put("last_known_patient_status", DataType.STRING);

        for (Map.Entry<String, DataType> entry : attributes.entrySet()) {
            patients.getAttributes().add(new DatasetTableAttribute(patients, entry.getKey(), entry.getValue()));
        }

        tableRepo.save(patients);
        leoss.getTables().add(patients);

        return datasetRepo.save(leoss);
    }
}
