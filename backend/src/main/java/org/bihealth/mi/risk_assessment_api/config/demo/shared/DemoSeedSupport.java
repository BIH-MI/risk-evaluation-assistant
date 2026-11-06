package org.bihealth.mi.risk_assessment_api.config.demo.shared;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.bihealth.mi.risk_assessment_api.model.assessment.BaseAssessment;
import org.bihealth.mi.risk_assessment_api.model.assessment.dataset.DatasetAssessment;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.configuration.ConfigurationVersion;
import org.bihealth.mi.risk_assessment_api.model.dataset.Dataset;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;
import org.bihealth.mi.risk_assessment_api.repository.questionnaire.AnswerRepository;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.stereotype.Component;

@Component
public class DemoSeedSupport {
    private final AnswerRepository answerRepo;

    public DemoSeedSupport(AnswerRepository answerRepo) {
        this.answerRepo = answerRepo;
    }

    public void applyAnswers(BaseAssessment assessment, List<Question> questions, Map<String, String> predefinedAnswers) {
        if (assessment.getAnswers() == null) {
            assessment.setAnswers(new ArrayList<>());
        }

        for (Question q : questions) {
            String preferredAnswer = findAnswerForQuestion(q, predefinedAnswers);
            QuestionOption opt = findOption(q, preferredAnswer);

            Answer ans = new Answer(assessment, q, opt);
            ans = answerRepo.save(ans);
            assessment.getAnswers().add(ans);
        }
    }

    private String findAnswerForQuestion(Question question, Map<String, String> predefinedAnswers) {
        String questionText = question.getText() == null ? "" : question.getText().toLowerCase(Locale.ROOT);

        return predefinedAnswers.entrySet().stream()
                .filter(entry -> questionText.contains(entry.getKey().toLowerCase(Locale.ROOT)))
                .map(Map.Entry::getValue)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "No predefined seed answer for question '" + question.getText() + "'."
                ));
    }

    private QuestionOption findOption(Question q, String preferredText) {
        if (q.getOptions() == null || q.getOptions().isEmpty()) {
            return null;
        }

        String normalizedPreferredText = preferredText == null ? "" : preferredText.trim().toLowerCase(Locale.ROOT);

        return q.getOptions().stream()
                .filter(opt -> opt.getText() != null && opt.getText().trim().equalsIgnoreCase(preferredText))
                .findFirst()
                .or(() -> q.getOptions().stream()
                        .filter(opt -> opt.getText() != null
                                && opt.getText().toLowerCase(Locale.ROOT).contains(normalizedPreferredText))
                        .findFirst())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No option matching '" + preferredText + "' for question '" + q.getText() + "'."
                ));
    }

    public static boolean sameName(String left, String right) {
        return EntityNameNormalizer.normalizeForComparison(left)
                .equals(EntityNameNormalizer.normalizeForComparison(right));
    }

    public static void applyConfiguration(BaseAssessment assessment, Configuration config) {
        ConfigurationVersion version = config.getCurrentVersionEntity()
                .orElseThrow(() -> new IllegalStateException("Configuration has no versions: " + config.getName()));
        assessment.setConfiguration(config);
        assessment.setConfigurationVersion(version);
    }

    public static Optional<DatasetAssessment> existingDatasetAssessment(Dataset dataset, Configuration config) {
        return dataset.getDatasetAssessments().stream()
                .filter(a -> Objects.equals(a.getConfiguration().getId(), config.getId()))
                .min(Comparator.comparing(DatasetAssessment::getId, Comparator.nullsLast(Long::compareTo)));
    }

    public static Optional<Dataset> findDataset(List<Dataset> datasets, String name, String assessmentName) {
        Optional<Dataset> named = datasets.stream()
                .filter(dataset -> sameName(dataset.getName(), name)).findFirst();
        if (named.isPresent()) return named;
        // Retain a renamed demo dataset when its seeded assessment still identifies it.
        return datasets.stream().filter(dataset -> dataset.getDatasetAssessments().stream()
                .anyMatch(a -> "user".equals(a.getCreatorUsername()) && sameName(a.getName(), assessmentName)))
                .findFirst();
    }
}
