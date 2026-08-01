package org.bihealth.mi.risk_assessment_api.repository.dataset;

import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.springframework.data.jpa.repository.JpaRepository;


public interface DatasetTableAttributeRepository extends JpaRepository<DatasetTableAttribute, Long> {
}