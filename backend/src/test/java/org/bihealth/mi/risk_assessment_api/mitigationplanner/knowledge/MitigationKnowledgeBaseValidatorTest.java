package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge;

import static org.assertj.core.api.Assertions.assertThat;

import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAssessmentScope;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionDependency;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationQuestionMapping;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation.KnowledgeBaseValidationIssue;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation.KnowledgeBaseValidationResult;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation.MitigationKnowledgeBaseValidator;
import org.junit.jupiter.api.Test;

class MitigationKnowledgeBaseValidatorTest {

    private final MitigationKnowledgeBaseValidator validator = new MitigationKnowledgeBaseValidator();

    @Test
    void rejectsDependencyCycles() {
        MitigationKnowledgeBaseVersion version = new MitigationKnowledgeBaseVersion();
        MitigationAction a = action(version, "A", MitigationActionType.CONTEXT_CONTROL);
        MitigationAction b = action(version, "B", MitigationActionType.CONTEXT_CONTROL);
        version.addDependency(dependency(a, b));
        version.addDependency(dependency(b, a));

        assertThat(errorCodes(validator.validate(version))).contains("DEPENDENCY_CYCLE");
    }

    @Test
    void rejectsProjectedAnswerOnDataTransformation() {
        MitigationKnowledgeBaseVersion version = new MitigationKnowledgeBaseVersion();
        MitigationAction coarsen = action(version, "COARSEN_DATE", MitigationActionType.DATA_TRANSFORMATION);
        MitigationQuestionMapping mapping = new MitigationQuestionMapping();
        mapping.setAssessmentScope(MitigationAssessmentScope.DATASET);
        mapping.setQuestionCode("DATE_OF_BIRTH");
        mapping.setTriggerOptionCode("FULL");
        mapping.setProjectedOptionCode("YEAR_ONLY");
        coarsen.addQuestionMapping(mapping);

        assertThat(errorCodes(validator.validate(version))).contains("DATA_TRANSFORMATION_PROJECTED_ANSWER");
    }

    private MitigationAction action(MitigationKnowledgeBaseVersion version, String code, MitigationActionType type) {
        MitigationAction action = new MitigationAction();
        action.setCode(code);
        action.setActionType(type);
        action.setSource("test");
        version.addAction(action);
        return action;
    }

    private MitigationActionDependency dependency(MitigationAction action, MitigationAction required) {
        MitigationActionDependency dependency = new MitigationActionDependency();
        dependency.setAction(action);
        dependency.setRequiredAction(required);
        return dependency;
    }

    private java.util.List<String> errorCodes(KnowledgeBaseValidationResult result) {
        return result.getIssues().stream()
                .filter(issue -> issue.getSeverity() == KnowledgeBaseValidationIssue.Severity.ERROR)
                .map(KnowledgeBaseValidationIssue::getCode)
                .toList();
    }
}
