package org.bihealth.mi.risk_assessment_api.repository.project;

import org.bihealth.mi.risk_assessment_api.model.project.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByCreatorUsername(String creatorUsername);
    List<Project> findBySharedUsernamesContains(String username);
    boolean existsByNormalizedName(String normalizedName);
    boolean existsByNormalizedNameAndIdNot(String normalizedName, Long id);
    long countByTemplateVersionTemplateId(Long templateId);
}
