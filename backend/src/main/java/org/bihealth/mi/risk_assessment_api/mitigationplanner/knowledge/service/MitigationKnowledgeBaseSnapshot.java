package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service;

import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionConflict;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionDependency;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionEstimate;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAttributeMapping;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationParameterDefinition;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationQuestionMapping;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.PlanSelectionPolicyDefinition;

import java.util.List;

public record MitigationKnowledgeBaseSnapshot(
        Long knowledgeBaseId,
        Long versionId,
        int versionNumber,
        List<MitigationAction> actions,
        List<MitigationQuestionMapping> questionMappings,
        List<MitigationAttributeMapping> attributeMappings,
        List<MitigationParameterDefinition> parameterDefinitions,
        List<MitigationActionEstimate> estimates,
        List<MitigationActionDependency> dependencies,
        List<MitigationActionConflict> conflicts,
        PlanSelectionPolicyDefinition selectionPolicy
) {
}
