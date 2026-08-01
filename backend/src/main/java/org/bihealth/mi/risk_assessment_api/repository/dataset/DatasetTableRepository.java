package org.bihealth.mi.risk_assessment_api.repository.dataset;

import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DatasetTableRepository extends JpaRepository<DatasetTable, Long> {
    Optional<DatasetTable> findByIdAndDatasetId(Long id, Long datasetId);
}