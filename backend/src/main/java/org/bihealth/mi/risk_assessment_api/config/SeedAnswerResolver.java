package org.bihealth.mi.risk_assessment_api.config;

import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Resolves seed answers such as {@link DemoAssessmentAnswers} against configuration questions.
 *
 * <p>Matching is by text fragment because the bundled frameworks do not define codes for every
 * question. It fails on missing and on ambiguous matches: an ambiguous key would otherwise pick
 * whichever map entry or option happens to come first, so a wording change in a configuration
 * must lead to a reviewed seed rather than a silently different answer.</p>
 */
public final class SeedAnswerResolver {

    private SeedAnswerResolver() {
    }

    /** Returns the seed answer whose key is contained in the question text; exactly one must match. */
    public static String answerFor(Question question, Map<String, String> predefinedAnswers) {
        String questionText = lower(question.getText());
        List<Map.Entry<String, String>> matches = predefinedAnswers.entrySet().stream()
                .filter(entry -> questionText.contains(lower(entry.getKey())))
                .toList();
        if (matches.isEmpty()) {
            throw new IllegalArgumentException("No predefined seed answer for question '" + question.getText() + "'.");
        }
        if (matches.size() > 1) {
            throw new IllegalArgumentException("Seed answer keys " + matches.stream().map(Map.Entry::getKey).toList()
                    + " all match question '" + question.getText() + "'.");
        }
        return matches.get(0).getValue();
    }

    /**
     * Returns the option whose text equals the preferred text, otherwise the single option whose
     * text contains it.
     */
    public static QuestionOption optionFor(Question question, String preferredText) {
        if (question.getOptions() == null || question.getOptions().isEmpty()) {
            return null;
        }
        String wanted = lower(preferredText).trim();
        List<QuestionOption> exact = question.getOptions().stream()
                .filter(option -> lower(option.getText()).trim().equals(wanted))
                .toList();
        if (exact.size() == 1) {
            return exact.get(0);
        }
        List<QuestionOption> partial = question.getOptions().stream()
                .filter(option -> lower(option.getText()).contains(wanted))
                .toList();
        if (partial.size() != 1) {
            throw new IllegalArgumentException((partial.isEmpty() ? "No option" : "More than one option")
                    + " matching '" + preferredText + "' for question '" + question.getText() + "'.");
        }
        return partial.get(0);
    }

    private static String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
