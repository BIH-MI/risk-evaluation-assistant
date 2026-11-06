package org.bihealth.mi.risk_assessment_api.config.demo.epic;

import java.util.List;
import org.bihealth.mi.risk_assessment_api.enums.DataType;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetRepository;
import org.bihealth.mi.risk_assessment_api.repository.dataset.DatasetTableRepository;
import org.springframework.stereotype.Component;
import static org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoSeedSupport.findDataset;

@Component
public class EpicPotsdamDatasetSeeder {
    private final DatasetRepository datasetRepo;
    private final DatasetTableRepository tableRepo;

    public EpicPotsdamDatasetSeeder(DatasetRepository datasetRepo, DatasetTableRepository tableRepo) {
        this.datasetRepo = datasetRepo;
        this.tableRepo = tableRepo;
    }

    private static final String EPIC_POTSDAM_DATASET_NAME = "EPIC-Potsdam Dairy and Chronic Disease Dataset";

    public Dataset ensureDataset() {
        return findDataset(datasetRepo.findAll(), EPIC_POTSDAM_DATASET_NAME, "EPIC-Potsdam Assessment (El Emam)")
                .orElseGet(() -> {
                    Dataset dataset = createEpicPotsdamDataset();
                    return dataset;
                });
    }

    private record EpicColumn(String name, DataType type) {}
    private static final List<EpicColumn> EPIC_COLUMNS = List.of(
            new EpicColumn("ident", DataType.INTEGER),
            new EpicColumn("SEX", DataType.INTEGER),
            new EpicColumn("age0", DataType.DECIMAL),
            new EpicColumn("waist0", DataType.DECIMAL),
            new EpicColumn("bmi0", DataType.DECIMAL),
            new EpicColumn("gj0", DataType.DECIMAL),
            new EpicColumn("za0", DataType.DECIMAL),
            new EpicColumn("m14bd", DataType.INTEGER),
            new EpicColumn("smkst0i", DataType.INTEGER),
            new EpicColumn("educc3", DataType.INTEGER),
            new EpicColumn("occstat6_0", DataType.INTEGER),
            new EpicColumn("age_f3", DataType.DECIMAL),
            new EpicColumn("smkst3i", DataType.INTEGER),
            new EpicColumn("gj_f3", DataType.DECIMAL),
            new EpicColumn("za_f3", DataType.DECIMAL),
            new EpicColumn("occstat6_f3", DataType.INTEGER),
            new EpicColumn("bmi_f3", DataType.DECIMAL),
            new EpicColumn("sr_hyp_f1", DataType.INTEGER),
            new EpicColumn("sr_hyp_f2", DataType.INTEGER),
            new EpicColumn("sr_hyp_f3", DataType.INTEGER),
            new EpicColumn("biking0", DataType.DECIMAL),
            new EpicColumn("sport0", DataType.DECIMAL),
            new EpicColumn("biking_f2", DataType.DECIMAL),
            new EpicColumn("sport_f2", DataType.DECIMAL),
            new EpicColumn("lf_milk_sum", DataType.DECIMAL),
            new EpicColumn("hf_milk_sum", DataType.DECIMAL),
            new EpicColumn("lf_yogurt_sum", DataType.DECIMAL),
            new EpicColumn("hf_yogurt_sum", DataType.DECIMAL),
            new EpicColumn("lf_curd_sum", DataType.DECIMAL),
            new EpicColumn("hf_curd_sum", DataType.DECIMAL),
            new EpicColumn("lf_cheese_sum", DataType.DECIMAL),
            new EpicColumn("hf_cheese_sum", DataType.DECIMAL),
            new EpicColumn("cream_sum", DataType.DECIMAL),
            new EpicColumn("butter_sum", DataType.DECIMAL),
            new EpicColumn("legumes_sum", DataType.DECIMAL),
            new EpicColumn("red_meat_sum", DataType.DECIMAL),
            new EpicColumn("poultry_sum", DataType.DECIMAL),
            new EpicColumn("proc_meat_sum", DataType.DECIMAL),
            new EpicColumn("fish_sum", DataType.DECIMAL),
            new EpicColumn("inct2d", DataType.INTEGER),
            new EpicColumn("age_inct2d", DataType.DECIMAL),
            new EpicColumn("fup_time_diab", DataType.DECIMAL),
            new EpicColumn("incmi", DataType.INTEGER),
            new EpicColumn("age_incmi", DataType.DECIMAL),
            new EpicColumn("fup_time_mi", DataType.DECIMAL),
            new EpicColumn("incstroke", DataType.INTEGER),
            new EpicColumn("age_incstroke", DataType.DECIMAL),
            new EpicColumn("fup_time_stroke", DataType.DECIMAL)
    );

    private Dataset createEpicPotsdamDataset() {
        Dataset dataset = new Dataset();
        dataset.setCreatorUsername("user");
        dataset.setName(EPIC_POTSDAM_DATASET_NAME);
        dataset.setDescription("Prepared EPIC-Potsdam participant-level dataset used in the NFDI4Health P1090 use case to investigate dairy-product consumption and the risk of type 2 diabetes mellitus and cardiovascular disease.");
        dataset = datasetRepo.save(dataset);
        DatasetTable table = new DatasetTable("Participants", dataset);
        table.setCreatorUsername("user");
        for (EpicColumn spec : EPIC_COLUMNS) {
            DatasetTableAttribute attribute = new DatasetTableAttribute(table, spec.name(), spec.type());
            attribute.setExcluded("ident".equals(spec.name()));
            // Known dataset size only; no rows were analysed and no statistics are fabricated.
            attribute.setRecordCount(25146L);
            table.getAttributes().add(attribute);
        }
        tableRepo.save(table);
        dataset.getTables().add(table);
        return datasetRepo.save(dataset);
    }
}
