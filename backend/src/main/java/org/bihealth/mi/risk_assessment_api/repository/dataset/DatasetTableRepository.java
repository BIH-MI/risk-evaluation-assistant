package org.bihealth.mi.risk_assessment_api.repository.dataset;

import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableQidCombination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DatasetTableRepository extends JpaRepository<DatasetTable, Long> {
    Optional<DatasetTable> findByIdAndDatasetId(Long id, Long datasetId);

    @Query("select distinct c from DatasetTableQidCombination c join fetch c.attributes join fetch c.table "
            + "where c.table.id in :tableIds and c.minimalQualifying = true")
    List<DatasetTableQidCombination> findRetainedQidCombinations(@Param("tableIds") Collection<Long> tableIds);
}
