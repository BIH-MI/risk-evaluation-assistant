package org.bihealth.mi.risk_assessment_api.repository.configuration;

import org.bihealth.mi.risk_assessment_api.model.configuration.RiskCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RiskCategoryRepository extends JpaRepository<RiskCategory, Long> {

    // Auto-generates the SQL to find all categories linked to a specific configuration ID
    List<RiskCategory> findByConfigurationId(Long configurationId);
}