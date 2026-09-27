package org.bihealth.mi.risk_assessment_api.repository.project;

import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProjectTemplateVersionRepository extends JpaRepository<ProjectTemplateVersion, Long> {
    Optional<ProjectTemplateVersion> findTopByTemplateIdOrderByVersionNumberDesc(Long templateId);
}
