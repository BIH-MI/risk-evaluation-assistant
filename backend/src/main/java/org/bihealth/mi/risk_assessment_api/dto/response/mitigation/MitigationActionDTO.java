package org.bihealth.mi.risk_assessment_api.dto.response.mitigation;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationEstimateScope;
import org.bihealth.mi.risk_assessment_api.enums.MitigationRecordRetentionEffect;
import org.bihealth.mi.risk_assessment_api.enums.MitigationResultingDataForm;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
public class MitigationActionDTO {
    private Long id;
    private String code;
    private String name;
    private String description;
    private MitigationActionType actionType;
    private boolean active;
    private String implementationDescription;
    private String verificationDescription;
    private String source;
    private String rationale;
    private MitigationResultingDataForm resultingDataForm;
    private MitigationRecordRetentionEffect recordRetentionEffect;
    private Set<MitigationSharingArrangement> applicableSharingArrangements;
    private BigDecimal estimatedCostMin;
    private BigDecimal estimatedCostMax;
    private String currency;
    private Integer estimatedSetupDaysMin;
    private Integer estimatedSetupDaysMax;
    private MitigationEstimateScope estimateScope;
    private String estimateSource;
    private String estimateAssumptions;
    private String estimateStatus;
    private String creatorUsername;
    private LocalDateTime creationDate;
    private LocalDateTime lastModifiedDate;
    private List<MitigationQuestionMappingDTO> questionMappings;
    private List<MitigationAttributeMappingDTO> attributeMappings;
    private List<MitigationParameterDefinitionDTO> parameterDefinitions;
    private List<MitigationActionDependencyDTO> dependencies;
    private List<MitigationActionConflictDTO> conflicts;

    public MitigationActionDTO(MitigationAction action) {
        this.id = action.getId();
        this.code = action.getCode();
        this.name = action.getName();
        this.description = action.getDescription();
        this.actionType = action.getActionType();
        this.active = action.isActive();
        this.implementationDescription = action.getImplementationDescription();
        this.verificationDescription = action.getVerificationDescription();
        this.source = action.getSource();
        this.rationale = action.getRationale();
        this.resultingDataForm = action.getResultingDataForm();
        this.recordRetentionEffect = action.getRecordRetentionEffect();
        this.applicableSharingArrangements = action.getApplicableSharingArrangements() == null
                ? new LinkedHashSet<>()
                : action.getApplicableSharingArrangements().stream()
                .map(MitigationSharingArrangement::canonical)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        this.estimatedCostMin = action.getEstimatedCostMin();
        this.estimatedCostMax = action.getEstimatedCostMax();
        this.currency = action.getCurrency();
        this.estimatedSetupDaysMin = action.getEstimatedSetupDaysMin();
        this.estimatedSetupDaysMax = action.getEstimatedSetupDaysMax();
        this.estimateScope = action.getEstimateScope();
        this.estimateSource = action.getEstimateSource();
        this.estimateAssumptions = action.getEstimateAssumptions();
        this.estimateStatus = hasEstimate(action) ? "AVAILABLE" : "UNKNOWN";
        this.creatorUsername = action.getCreatorUsername();
        this.creationDate = action.getCreationDate();
        this.lastModifiedDate = action.getLastModifiedDate();
        this.questionMappings = action.getQuestionMappings() == null
                ? List.of()
                : action.getQuestionMappings().stream()
                .sorted(Comparator.comparing(mapping -> mapping.getId() == null ? Long.MAX_VALUE : mapping.getId()))
                .map(MitigationQuestionMappingDTO::new)
                .collect(Collectors.toList());
        this.attributeMappings = action.getAttributeMappings() == null
                ? List.of()
                : action.getAttributeMappings().stream()
                .sorted(Comparator.comparing(mapping -> mapping.getId() == null ? Long.MAX_VALUE : mapping.getId()))
                .map(MitigationAttributeMappingDTO::new)
                .collect(Collectors.toList());
        this.parameterDefinitions = action.getParameterDefinitions() == null
                ? List.of()
                : action.getParameterDefinitions().stream()
                .sorted(Comparator.comparing(parameter -> parameter.getId() == null ? Long.MAX_VALUE : parameter.getId()))
                .map(MitigationParameterDefinitionDTO::new)
                .collect(Collectors.toList());
        this.dependencies = action.getKnowledgeBaseVersion() == null
                ? List.of()
                : action.getKnowledgeBaseVersion().getDependencies().stream()
                .filter(dependency -> sameAction(dependency.getAction(), action))
                .sorted(Comparator.comparing(dependency -> dependency.getId() == null ? Long.MAX_VALUE : dependency.getId()))
                .map(MitigationActionDependencyDTO::new)
                .collect(Collectors.toList());
        this.conflicts = action.getKnowledgeBaseVersion() == null
                ? List.of()
                : action.getKnowledgeBaseVersion().getConflicts().stream()
                .filter(conflict -> sameAction(conflict.getActionA(), action) || sameAction(conflict.getActionB(), action))
                .sorted(Comparator.comparing(conflict -> conflict.getId() == null ? Long.MAX_VALUE : conflict.getId()))
                .map(conflict -> new MitigationActionConflictDTO(conflict, action))
                .collect(Collectors.toList());
    }

    private boolean hasEstimate(MitigationAction action) {
        return action.getEstimatedCostMin() != null
                || action.getEstimatedCostMax() != null
                || action.getEstimatedSetupDaysMin() != null
                || action.getEstimatedSetupDaysMax() != null
                || action.getEstimateScope() != null
                || action.getEstimateSource() != null
                || action.getEstimateAssumptions() != null;
    }

    private boolean sameAction(MitigationAction left, MitigationAction right) {
        if (left == right) {
            return true;
        }
        return left != null && right != null
                && left.getId() != null
                && Objects.equals(left.getId(), right.getId());
    }
}
