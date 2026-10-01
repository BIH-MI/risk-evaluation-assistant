package org.bihealth.mi.risk_assessment_api.testsupport;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bihealth.mi.risk_assessment_api.config.SeedAnswerResolver;
import org.bihealth.mi.risk_assessment_api.model.assessment.BaseAssessment;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.configuration.ConfigurationVersion;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskBand;
import org.bihealth.mi.risk_assessment_api.model.configuration.RiskCategory;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Answer;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.QuestionOption;
import org.bihealth.mi.risk_assessment_api.utils.QuestionnaireCodes;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Loads the bundled framework JSON files into in-memory configuration entities, with the same
 * question/option codes the application generates on import. No database is involved.
 */
public final class BundledFrameworks {

    public static final String SPHN_NAME = "SPHN Risk Assessment Framework (v2.1.2)";
    public static final String EL_EMAM_NAME = "El Emam Risk Exposure Model";
    public static final String DATASET_PHASE = "DATASET_ASSESSMENT";
    public static final String RECIPIENT_PHASE = "RECIPIENT_ASSESSMENT";

    private static final AtomicLong IDS = new AtomicLong(1);

    private BundledFrameworks() {
    }

    public static Configuration sphn() {
        return load("data/sphn-config.json");
    }

    public static Configuration elEmam() {
        return load("data/el-emam-config.json");
    }

    public static Configuration load(String resource) {
        ObjectMapper mapper = new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        Configuration config;
        try (InputStream input = BundledFrameworks.class.getClassLoader().getResourceAsStream(resource)) {
            if (input == null) {
                throw new IllegalArgumentException("Missing resource " + resource);
            }
            config = mapper.readValue(input, Configuration.class);
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
        config.setId(IDS.getAndIncrement());

        ConfigurationVersion version = new ConfigurationVersion();
        version.setId(IDS.getAndIncrement());
        version.setVersionNumber(1);
        List<RiskCategory> categories = new ArrayList<>(config.getRiskCategories());
        for (RiskCategory category : categories) {
            category.setId(IDS.getAndIncrement());
            category.setConfigurationVersion(version);
            for (RiskBand band : category.getRiskBands()) {
                band.setCategory(category);
            }
        }
        Map<String, RiskCategory> byCode = categories.stream()
                .collect(Collectors.toMap(category -> category.getCode().toUpperCase(Locale.ROOT), Function.identity()));

        List<Question> questions = new ArrayList<>(config.getQuestions());
        for (Question question : questions) {
            question.setId(IDS.getAndIncrement());
            question.setCategory(byCode.get(question.getCategoryCode().toUpperCase(Locale.ROOT)));
            question.setCode(QuestionnaireCodes.stableCodeOrGenerated(question.getCode(), question.getText(), "QUESTION"));
            question.setConfigurationVersion(version);
            for (QuestionOption option : question.getOptions()) {
                option.setId(IDS.getAndIncrement());
                option.setQuestion(question);
                option.setCode(QuestionnaireCodes.stableCodeOrGenerated(option.getCode(), option.getText(), "OPTION"));
            }
        }
        version.setRiskCategories(categories);
        version.setQuestions(questions);
        version.setRiskMatrices(new ArrayList<>(config.getRiskMatrices()));
        version.setReidThresholds(new ArrayList<>(config.getReidThresholds()));
        config.addVersion(version);
        return config;
    }

    public static List<Question> questions(Configuration config, String assessmentPhase) {
        return config.getQuestions().stream()
                .filter(question -> assessmentPhase.equals(question.getCategory().getAssessmentPhase()))
                .toList();
    }

    /** One answer per question of the phase, resolved exactly as DataLoader resolves seed answers. */
    public static List<Answer> answers(
            Configuration config,
            String assessmentPhase,
            Map<String, String> seedAnswers,
            BaseAssessment assessment
    ) {
        return questions(config, assessmentPhase).stream()
                .map(question -> {
                    Answer answer = new Answer(assessment, question,
                            SeedAnswerResolver.optionFor(question, SeedAnswerResolver.answerFor(question, seedAnswers)));
                    answer.setId(IDS.getAndIncrement());
                    return answer;
                })
                .collect(Collectors.toCollection(ArrayList::new));
    }

    public static Question question(Configuration config, String codeOrTextFragment) {
        String wanted = codeOrTextFragment.toUpperCase(Locale.ROOT);
        return config.getQuestions().stream()
                .filter(question -> wanted.equals(question.getCode())
                        || question.getText().toUpperCase(Locale.ROOT).contains(wanted))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No question " + codeOrTextFragment));
    }

    public static Answer answerTo(List<Answer> answers, String textFragment) {
        String wanted = textFragment.toUpperCase(Locale.ROOT);
        return answers.stream()
                .filter(answer -> answer.getQuestion().getText().toUpperCase(Locale.ROOT).contains(wanted))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No answer for " + textFragment));
    }
}
