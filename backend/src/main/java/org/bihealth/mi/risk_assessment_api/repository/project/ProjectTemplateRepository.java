package org.bihealth.mi.risk_assessment_api.repository.project;

import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectTemplateRepository extends JpaRepository<ProjectTemplate, Long> {
    List<ProjectTemplate> findByActiveTrue();
    List<ProjectTemplate> findAllByOrderByLastModifiedDateDesc();
    Optional<ProjectTemplate> findFirstByDefaultTemplateTrueAndActiveTrueOrderByIdAsc();
    Optional<ProjectTemplate> findFirstByActiveTrueOrderByIdAsc();
    Optional<ProjectTemplate> findBySystemKey(String systemKey);
    Optional<ProjectTemplate> findByNormalizedName(String normalizedName);
    boolean existsByNormalizedName(String normalizedName);
    boolean existsByNormalizedNameAndIdNot(String normalizedName, Long id);
}
