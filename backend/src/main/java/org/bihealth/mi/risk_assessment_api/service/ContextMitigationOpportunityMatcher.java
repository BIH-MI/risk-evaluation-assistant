package org.bihealth.mi.risk_assessment_api.service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlannerOverviewDTO.ContextFinding;
import org.bihealth.mi.risk_assessment_api.enums.MitigationAssessmentScope;
import org.bihealth.mi.risk_assessment_api.enums.MitigationOpportunityStatus;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationAction;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationQuestionMapping;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.AnswerRepository;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Matches context-control catalogue actions against the persisted Recipient Assessment.
 *
 * <p>Matching is read-only. Projected questionnaire options are catalogue metadata and
 * must never update the persisted Recipient Assessment.</p>
 */
@Component
@RequiredArgsConstructor
public class ContextMitigationOpportunityMatcher {

    private final AnswerRepository answerRepository;
    private final MitigationQuestionMappingMatcher questionMappingMatcher;

    /** A matched mapping together with the persisted answer that triggered it. Read-only. */
    public record MatchedTrigger(MitigationQuestionMapping mapping, Answer answer) {}

    /** Findings and triggers of one action together with the resulting applicability state. */
    public record ContextMatch(
            MitigationOpportunityStatus status,
            List<ContextFinding> findings,
            List<MatchedTrigger> triggers
    ) {}

    /**
     * Returns one entry per matching action, grouping every matched framework question as a
     * finding so duplicate mappings (for example El Emam and SPHN) stay traceable.
     */
    public Map<MitigationAction, ContextMatch> match(
            Collection<MitigationAction> actions,
            RecipientAssessment assessment,
            List<String> warnings
    ) {
        Map<String, Answer> answersByQuestionCode = new HashMap<>();
        for (Answer answer : answerRepository.findAllForAssessment(assessment.getId())) {
            String code = questionMappingMatcher.normalize(answer.getQuestion().getCode());
            if (code != null) {
                answersByQuestionCode.put(code, answer);
            }
        }

        Long assessmentConfigurationId = assessment.getConfiguration() == null
                ? null
                : assessment.getConfiguration().getId();
        String frameworkName = assessment.getConfiguration() == null ? null : assessment.getConfiguration().getName();

        Map<MitigationAction, ContextMatch> matches = new LinkedHashMap<>();
        for (MitigationAction action : actions) {
            List<ContextFinding> findings = new ArrayList<>();
            List<MatchedTrigger> triggers = new ArrayList<>();
            for (MitigationQuestionMapping mapping : action.getQuestionMappings()) {
                // Mappings of other risk frameworks cannot be evaluated against this assessment.
                if (mapping.getConfiguration() != null
                        && !mapping.getConfiguration().getId().equals(assessmentConfigurationId)) {
                    continue;
                }
                Answer answer = answersByQuestionCode.get(questionMappingMatcher.normalize(mapping.getQuestionCode()));
                if (answer == null || answer.getSelectedOption() == null) {
                    warnings.add("Recipient Assessment has no answer for question " + mapping.getQuestionCode()
                            + "; it was not evaluated for \"" + action.getName() + "\".");
                    continue;
                }
                if (questionMappingMatcher.matchesTrigger(
                        mapping,
                        answer,
                        assessment.getConfiguration(),
                        MitigationAssessmentScope.RECIPIENT)) {
                    findings.add(toFinding(mapping, answer, frameworkName));
                    triggers.add(new MatchedTrigger(mapping, answer));
                }
            }
            // Questionnaire mappings are independent applicability triggers. A matched trigger
            // makes the action applicable; projected values remain hypothetical.
            if (!findings.isEmpty()) {
                matches.put(action, new ContextMatch(MitigationOpportunityStatus.APPLICABLE, findings, triggers));
            }
        }
        return matches;
    }

    private ContextFinding toFinding(MitigationQuestionMapping mapping, Answer answer, String assessmentFrameworkName) {
        ContextFinding finding = new ContextFinding();
        finding.setFrameworkName(mapping.getConfiguration() != null
                ? mapping.getConfiguration().getName()
                : assessmentFrameworkName);
        finding.setQuestionCode(mapping.getQuestionCode());
        finding.setQuestionText(answer.getQuestion().getText());
        finding.setCurrentOptionCode(answer.getSelectedOption().getCode());
        finding.setCurrentOptionText(answer.getSelectedOption().getText());
        finding.setPotentialOptionCode(mapping.getProjectedOptionCode());
        finding.setPotentialOptionText(questionMappingMatcher.optionText(answer, mapping.getProjectedOptionCode()));
        finding.setAnswerImpact(answer.getSelectedOption().getImpact());
        finding.setHighRiskTrigger(answer.getSelectedOption().isHighRiskTrigger());
        finding.setReason("The current Recipient Assessment answer matches the mitigation trigger for this question.");
        return finding;
    }
}
