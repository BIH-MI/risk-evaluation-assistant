package org.bihealth.mi.risk_assessment_api.service;

import java.util.Locale;

import org.bihealth.mi.risk_assessment_api.enums.MitigationAssessmentScope;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationQuestionMapping;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;
import org.springframework.stereotype.Component;

/**
 * Shared matching rules for questionnaire-to-mitigation mappings.
 *
 * <p>Mappings are based on stable configuration, scope, category, question, and
 * option codes. Question text is never used as identity.</p>
 */
@Component
public class MitigationQuestionMappingMatcher {

    public boolean matchesTrigger(
            MitigationQuestionMapping mapping,
            Answer answer,
            Configuration assessmentConfiguration,
            MitigationAssessmentScope wantedScope
    ) {
        if (mapping == null || answer == null || answer.getQuestion() == null || answer.getSelectedOption() == null) {
            return false;
        }
        if (scopeOf(mapping) != wantedScope) {
            return false;
        }
        if (mapping.getConfiguration() != null
                && (assessmentConfiguration == null
                || !mapping.getConfiguration().getId().equals(assessmentConfiguration.getId()))) {
            return false;
        }
        String categoryCode = normalize(mapping.getCategoryCode());
        if (categoryCode != null
                && !categoryCode.equals(normalize(answer.getQuestion().getCategoryCode()))) {
            return false;
        }
        String questionCode = normalize(mapping.getQuestionCode());
        String selectedOptionCode = normalize(answer.getSelectedOption().getCode());
        String triggerOptionCode = normalize(mapping.getTriggerOptionCode());
        return questionCode != null
                && questionCode.equals(normalize(answer.getQuestion().getCode()))
                && triggerOptionCode != null
                && triggerOptionCode.equals(selectedOptionCode);
    }

    public MitigationAssessmentScope scopeOf(MitigationQuestionMapping mapping) {
        return mapping.getAssessmentScope() == null
                ? MitigationAssessmentScope.RECIPIENT
                : mapping.getAssessmentScope();
    }

    public String optionText(Answer answer, String optionCode) {
        String wanted = normalize(optionCode);
        if (wanted == null || answer == null || answer.getQuestion() == null || answer.getQuestion().getOptions() == null) {
            return null;
        }
        for (QuestionOption option : answer.getQuestion().getOptions()) {
            if (wanted.equals(normalize(option.getCode()))) {
                return option.getText();
            }
        }
        return null;
    }

    public String normalize(String code) {
        if (code == null || code.trim().isEmpty()) {
            return null;
        }
        return code.trim().toUpperCase(Locale.ROOT);
    }
}
