package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.api.response;

import lombok.Data;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;

import java.time.LocalDateTime;

@Data
public class MitigationKnowledgeBaseResponseDTO {
    private Long id;
    private String name;
    private String description;
    private boolean active;
    private boolean defaultKnowledgeBase;
    private int currentVersion;
    private int versionCount;
    private String creatorUsername;
    private LocalDateTime creationDate;
    private LocalDateTime lastModifiedDate;

    public MitigationKnowledgeBaseResponseDTO(MitigationKnowledgeBase knowledgeBase) {
        this.id = knowledgeBase.getId();
        this.name = knowledgeBase.getName();
        this.description = knowledgeBase.getDescription();
        this.active = knowledgeBase.isActive();
        this.defaultKnowledgeBase = knowledgeBase.isDefaultKnowledgeBase();
        this.currentVersion = knowledgeBase.getCurrentVersion();
        this.versionCount = knowledgeBase.getVersions() == null ? 0 : knowledgeBase.getVersions().size();
        this.creatorUsername = knowledgeBase.getCreatorUsername();
        this.creationDate = knowledgeBase.getCreationDate();
        this.lastModifiedDate = knowledgeBase.getLastModifiedDate();
    }
}
