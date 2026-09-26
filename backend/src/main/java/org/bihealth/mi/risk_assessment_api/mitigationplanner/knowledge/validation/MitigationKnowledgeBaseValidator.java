package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation;

import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionConflict;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionDependency;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationParameterDefinition;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationQuestionMapping;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class MitigationKnowledgeBaseValidator {

    public KnowledgeBaseValidationResult validate(MitigationKnowledgeBase knowledgeBase) {
        KnowledgeBaseValidationResult result = new KnowledgeBaseValidationResult();
        if (knowledgeBase == null) {
            error(result, "MISSING_KNOWLEDGE_BASE", "Knowledge Base is required.", "MitigationKnowledgeBase", null);
            return result;
        }
        if (blank(knowledgeBase.getName())) {
            error(result, "MISSING_NAME", "Knowledge Base name is required.", "MitigationKnowledgeBase", knowledgeBase.getId());
        }
        knowledgeBase.getCurrentVersionEntity().ifPresent(version -> validate(version, result));
        return result;
    }

    public KnowledgeBaseValidationResult validate(MitigationKnowledgeBaseVersion version) {
        KnowledgeBaseValidationResult result = new KnowledgeBaseValidationResult();
        validate(version, result);
        return result;
    }

    private void validate(MitigationKnowledgeBaseVersion version, KnowledgeBaseValidationResult result) {
        if (version == null) {
            error(result, "MISSING_VERSION", "Knowledge Base version is required.", "MitigationKnowledgeBaseVersion", null);
            return;
        }
        Map<String, MitigationAction> actionsByCode = validateActions(version, result);
        validateDependencies(version, actionsByCode, result);
        validateConflicts(version, actionsByCode, result);
        validateQuestionMappings(version, result);
    }

    private Map<String, MitigationAction> validateActions(
            MitigationKnowledgeBaseVersion version,
            KnowledgeBaseValidationResult result
    ) {
        Set<String> seen = new HashSet<>();
        for (MitigationAction action : version.getActions()) {
            String code = normalize(action.getCode());
            if (code == null) {
                error(result, "MISSING_ACTION_CODE", "Mitigation action code is required.", "MitigationAction", action.getId());
            } else if (!seen.add(code)) {
                error(result, "DUPLICATE_ACTION_CODE", "Mitigation action code " + code + " is duplicated.",
                        "MitigationAction", action.getId());
            }
            if (blank(action.getSource())) {
                warning(result, "MISSING_SOURCE", "No source has been provided for this mitigation action.",
                        "MitigationAction", action.getId());
            }
            validateParameterDefinitions(action, result);
        }
        return version.getActions().stream()
                .filter(action -> normalize(action.getCode()) != null)
                .collect(Collectors.toMap(
                        action -> normalize(action.getCode()),
                        action -> action,
                        (left, right) -> left
                ));
    }

    private void validateParameterDefinitions(MitigationAction action, KnowledgeBaseValidationResult result) {
        Set<String> parameterCodes = new HashSet<>();
        for (MitigationParameterDefinition parameter : action.getParameterDefinitions()) {
            if (parameter.getParameterCode() == null) {
                error(result, "MISSING_PARAMETER_CODE", "Parameter definition requires a parameter code.",
                        "MitigationParameterDefinition", parameter.getId());
            } else if (!parameterCodes.add(parameter.getParameterCode().name())) {
                error(result, "DUPLICATE_PARAMETER_CODE", "Parameter definitions must be unique per action.",
                        "MitigationParameterDefinition", parameter.getId());
            }

            Set<String> values = new HashSet<>();
            for (String value : parameter.getAllowedValues()) {
                String normalized = normalize(value);
                if (normalized != null && !values.add(normalized)) {
                    error(result, "DUPLICATE_PARAMETER_VALUE", "Parameter allowed values must not contain duplicates.",
                            "MitigationParameterDefinition", parameter.getId());
                }
            }
        }
    }

    private void validateDependencies(
            MitigationKnowledgeBaseVersion version,
            Map<String, MitigationAction> actionsByCode,
            KnowledgeBaseValidationResult result
    ) {
        Set<String> dependencies = new HashSet<>();
        Set<String> conflicts = version.getConflicts().stream()
                .map(this::conflictKey)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        for (MitigationActionDependency dependency : version.getDependencies()) {
            MitigationAction action = dependency.getAction();
            MitigationAction required = dependency.getRequiredAction();
            String actionCode = action == null ? null : normalize(action.getCode());
            String requiredCode = required == null ? null : normalize(required.getCode());

            if (!actionsByCode.containsKey(actionCode) || !actionsByCode.containsKey(requiredCode)) {
                error(result, "DEPENDENCY_UNKNOWN_ACTION", "Dependency references an action outside this Knowledge Base version.",
                        "MitigationActionDependency", dependency.getId());
                continue;
            }
            if (Objects.equals(actionCode, requiredCode)) {
                error(result, "DEPENDENCY_SELF_REFERENCE", actionCode + " cannot require itself.",
                        "MitigationActionDependency", dependency.getId());
            }
            String key = actionCode + "->" + requiredCode;
            if (!dependencies.add(key)) {
                error(result, "DUPLICATE_DEPENDENCY", "Duplicate dependency " + key + " is not allowed.",
                        "MitigationActionDependency", dependency.getId());
            }
            if (conflicts.contains(pairKey(actionCode, requiredCode))) {
                error(result, "DEPENDENCY_CONFLICT", actionCode + " cannot both require and conflict with " + requiredCode + ".",
                        "MitigationActionDependency", dependency.getId());
            }
        }
    }

    private void validateConflicts(
            MitigationKnowledgeBaseVersion version,
            Map<String, MitigationAction> actionsByCode,
            KnowledgeBaseValidationResult result
    ) {
        Set<String> conflicts = new HashSet<>();
        for (MitigationActionConflict conflict : version.getConflicts()) {
            MitigationAction actionA = conflict.getActionA();
            MitigationAction actionB = conflict.getActionB();
            String codeA = actionA == null ? null : normalize(actionA.getCode());
            String codeB = actionB == null ? null : normalize(actionB.getCode());

            if (!actionsByCode.containsKey(codeA) || !actionsByCode.containsKey(codeB)) {
                error(result, "CONFLICT_UNKNOWN_ACTION", "Conflict references an action outside this Knowledge Base version.",
                        "MitigationActionConflict", conflict.getId());
                continue;
            }
            if (Objects.equals(codeA, codeB)) {
                error(result, "CONFLICT_SELF_REFERENCE", codeA + " cannot conflict with itself.",
                        "MitigationActionConflict", conflict.getId());
            }
            String key = pairKey(codeA, codeB);
            if (!conflicts.add(key)) {
                error(result, "DUPLICATE_SYMMETRIC_CONFLICT", "Duplicate symmetric conflict " + key + " is not allowed.",
                        "MitigationActionConflict", conflict.getId());
            }
        }
    }

    private void validateQuestionMappings(MitigationKnowledgeBaseVersion version, KnowledgeBaseValidationResult result) {
        for (MitigationQuestionMapping mapping : version.getQuestionMappings()) {
            Configuration configuration = mapping.getConfiguration();
            if (configuration == null) {
                continue;
            }
            Question question = configuration.getQuestions().stream()
                    .filter(candidate -> same(candidate.getCode(), mapping.getQuestionCode()))
                    .findFirst()
                    .orElse(null);
            if (question == null) {
                error(result, "INVALID_QUESTION", "Question mapping references an unknown question.",
                        "MitigationQuestionMapping", mapping.getId());
                continue;
            }
            boolean hasTrigger = question.getOptions().stream()
                    .anyMatch(option -> same(option.getCode(), mapping.getTriggerOptionCode()));
            if (!hasTrigger) {
                error(result, "INVALID_TRIGGER_OPTION", "Trigger option does not belong to the referenced question.",
                        "MitigationQuestionMapping", mapping.getId());
            }
            if (!blank(mapping.getProjectedOptionCode())) {
                boolean hasProjected = question.getOptions().stream()
                        .anyMatch(option -> same(option.getCode(), mapping.getProjectedOptionCode()));
                if (!hasProjected) {
                    error(result, "INVALID_PROJECTED_OPTION", "Projected option does not belong to the referenced question.",
                            "MitigationQuestionMapping", mapping.getId());
                }
            }
        }
    }

    private String conflictKey(MitigationActionConflict conflict) {
        if (conflict.getActionA() == null || conflict.getActionB() == null) {
            return null;
        }
        return pairKey(normalize(conflict.getActionA().getCode()), normalize(conflict.getActionB().getCode()));
    }

    private String pairKey(String left, String right) {
        if (left == null || right == null) {
            return null;
        }
        return left.compareTo(right) <= 0 ? left + "<->" + right : right + "<->" + left;
    }

    private boolean same(String left, String right) {
        return Objects.equals(normalize(left), normalize(right));
    }

    private String normalize(String value) {
        if (blank(value)) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private boolean blank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private void error(
            KnowledgeBaseValidationResult result,
            String code,
            String message,
            String entityType,
            Long entityId
    ) {
        result.add(new KnowledgeBaseValidationIssue(
                KnowledgeBaseValidationIssue.Severity.ERROR, code, message, entityType, entityId));
    }

    private void warning(
            KnowledgeBaseValidationResult result,
            String code,
            String message,
            String entityType,
            Long entityId
    ) {
        result.add(new KnowledgeBaseValidationIssue(
                KnowledgeBaseValidationIssue.Severity.WARNING, code, message, entityType, entityId));
    }
}
