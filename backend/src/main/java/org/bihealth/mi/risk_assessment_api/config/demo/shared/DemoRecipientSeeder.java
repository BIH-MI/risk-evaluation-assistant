package org.bihealth.mi.risk_assessment_api.config.demo.shared;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.model.assessment.recipient.RecipientAssessment;
import org.bihealth.mi.risk_assessment_api.model.configuration.Configuration;
import org.bihealth.mi.risk_assessment_api.model.questionnaire.Question;
import org.bihealth.mi.risk_assessment_api.model.recipient.Recipient;
import org.bihealth.mi.risk_assessment_api.repository.activity.DataSharingActivityRepository;
import org.bihealth.mi.risk_assessment_api.repository.assessment.recipient.RecipientAssessmentRepository;
import org.bihealth.mi.risk_assessment_api.repository.recipient.RecipientRepository;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import static java.util.Map.entry;
import static org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoSeedSupport.applyConfiguration;
import static org.bihealth.mi.risk_assessment_api.config.demo.shared.DemoSeedSupport.sameName;

@Component
public class DemoRecipientSeeder {
    private final RecipientRepository recipientRepository;
    private final RecipientAssessmentRepository recipientAssessmentRepository;
    private final DataSharingActivityRepository dataSharingActivityRepository;
    private final DemoSeedSupport support;

    public DemoRecipientSeeder(RecipientRepository recipientRepository, RecipientAssessmentRepository recipientAssessmentRepository, DataSharingActivityRepository dataSharingActivityRepository, DemoSeedSupport support) {
        this.recipientRepository = recipientRepository;
        this.recipientAssessmentRepository = recipientAssessmentRepository;
        this.dataSharingActivityRepository = dataSharingActivityRepository;
        this.support = support;
    }

    private static final Logger log = LoggerFactory.getLogger(DemoRecipientSeeder.class);
    public static final String ACADEMIC_RECIPIENT = "Trusted Academic Research Institute";
    public static final String COMMERCIAL_RECIPIENT = "Commercial Research Partner";
    public static final String PUBLIC_RECIPIENT = "Public / Unrestricted Data Release";
    private static final String ACADEMIC_DESCRIPTION = "Controlled academic research sharing with named researchers and " +
            "strong institutional, contractual, organizational and technical safeguards.";
    private static final String COMMERCIAL_DESCRIPTION = "Controlled external research sharing with a commercial partner " +
            "under contractual and institutional safeguards, but with greater technical capability, resources and potential commercial value.";
    private static final String PUBLIC_DESCRIPTION = "Public or unrestricted release with no identifiable single trusted recipient" +
            " and minimal or no recipient-specific contractual, organizational or technical controls.";
    
    public record DemoRecipients(
            Recipient academic, Recipient commercial, Recipient publicRelease,
            RecipientAssessment academicElEmam, RecipientAssessment commercialElEmam,
            RecipientAssessment publicElEmam, RecipientAssessment academicSphn,
            RecipientAssessment commercialSphn, RecipientAssessment publicSphn) {}

    public DemoRecipients ensureRecipients(Configuration elEmam, Configuration sphn) {
        List<Recipient> recipients = createBaseRecipients();
        List<RecipientAssessment> elEmamAssessments = createElEmamRecipientAssessments(recipients, elEmam);
        List<RecipientAssessment> sphnAssessments = createSphnRecipientAssessments(recipients, sphn);
        RecipientAssessment academic = scenarioAssessment(elEmamAssessments, ACADEMIC_RECIPIENT);
        RecipientAssessment commercial = scenarioAssessment(elEmamAssessments, COMMERCIAL_RECIPIENT);
        RecipientAssessment publicRelease = scenarioAssessment(elEmamAssessments, PUBLIC_RECIPIENT);
        return new DemoRecipients(academic.getRecipient(), commercial.getRecipient(), publicRelease.getRecipient(),
                academic, commercial, publicRelease,
                scenarioAssessment(sphnAssessments, ACADEMIC_RECIPIENT),
                scenarioAssessment(sphnAssessments, COMMERCIAL_RECIPIENT),
                scenarioAssessment(sphnAssessments, PUBLIC_RECIPIENT));
    }

    private RecipientAssessment scenarioAssessment(List<RecipientAssessment> assessments, String name) {
        return assessments.stream().filter(a -> isScenario(a.getRecipient(), name)).findFirst()
                .orElseThrow(() -> new IllegalStateException("Missing demo recipient assessment: " + name));
    }

    public void upgradeLegacyRecipientNames() {
        List<Recipient> recipients = recipientRepository.findAll();
        for (Recipient recipient : recipients) {
            String oldName = recipient.getName();
            String newName;
            String oldDescription;
            String newDescription;
            String organization;
            switch (oldName == null ? "" : oldName) {
                case "Academic Research Institute" -> {
                    newName = ACADEMIC_RECIPIENT;
                    oldDescription = "University-based lab with strict privacy controls and ethical oversight.";
                    newDescription = ACADEMIC_DESCRIPTION;
                    organization = "University Labs";
                }
                case "Commercial Partner" -> {
                    newName = COMMERCIAL_RECIPIENT;
                    oldDescription = "A commercial partner with standard security controls but potential commercial motives.";
                    newDescription = COMMERCIAL_DESCRIPTION;
                    organization = "HealthTech Solutions Ltd.";
                }
                case "Public Open Data Portal" -> {
                    newName = PUBLIC_RECIPIENT;
                    oldDescription = "Open data release via a public portal with minimal to no contextual controls.";
                    newDescription = PUBLIC_DESCRIPTION;
                    organization = "Public Release";
                }
                default -> { continue; }
            }
            if (!"user".equals(recipient.getCreatorUsername())
                    || !organization.equals(recipient.getOrganization())
                    || !oldDescription.equals(recipient.getDescription())) {
                continue;
            }
            if (recipientRepository.existsByNormalizedNameAndIdNot(
                    EntityNameNormalizer.normalizeForComparison(newName), recipient.getId())) {
                log.warn("Skipping demo recipient rename for ID {}: target name already exists", recipient.getId());
                continue;
            }
            recipient.setName(newName);
            recipient.setDescription(newDescription);
            for (RecipientAssessment assessment : recipient.getAssessments()) {
                for (String suffix : List.of(" Assessment (El Emam)", " (SPHN)")) {
                    if ((oldName + suffix).equals(assessment.getName())
                            && "user".equals(assessment.getCreatorUsername())) {
                        assessment.setName(newName + suffix);
                    }
                }
            }
            String oldActivityLabel = switch (oldName) {
                case "Academic Research Institute" -> "Academic Labs";
                case "Commercial Partner" -> "HealthTech Solutions";
                default -> "Open Data Portal";
            };
            for (DataSharingActivity activity : dataSharingActivityRepository.findByCreatorUsername("user")) {
                RecipientAssessment assessment = activity.getRecipientAssessment();
                if (assessment == null || assessment.getRecipient() == null
                        || !Objects.equals(recipient.getId(), assessment.getRecipient().getId())) continue;
                for (String framework : List.of("El Emam", "SPHN")) {
                    String suffix = " (" + framework + ")";
                    if (("LEOSS / " + oldActivityLabel + suffix).equals(activity.getName())) {
                        String updatedName = "LEOSS / " + newName + suffix;
                        if (!dataSharingActivityRepository.existsByNormalizedNameAndIdNot(
                                EntityNameNormalizer.normalizeForComparison(updatedName), activity.getId())) {
                            activity.setName(updatedName);
                        }
                    }
                }
            }
            recipientRepository.save(recipient);
        }
    }

    private boolean isScenario(Recipient recipient, String name) {
        String legacyName = switch (name) {
            case ACADEMIC_RECIPIENT -> "Academic Research Institute";
            case COMMERCIAL_RECIPIENT -> "Commercial Partner";
            case PUBLIC_RECIPIENT -> "Public Open Data Portal";
            default -> name;
        };
        return sameName(recipient.getName(), name) || sameName(recipient.getName(), legacyName)
                || recipient.getAssessments().stream().anyMatch(a -> "user".equals(a.getCreatorUsername())
                    && (sameName(a.getName(), name + " Assessment (El Emam)")
                        || sameName(a.getName(), legacyName + " Assessment (El Emam)")));
    }

    private Recipient findOrCreateDemoRecipient(Recipient candidate, String legacyName) {
        List<Recipient> recipients = recipientRepository.findAll();
        Optional<Recipient> named = recipients.stream()
                .filter(r -> sameName(r.getName(), candidate.getName()) || sameName(r.getName(), legacyName))
                .findFirst();
        if (named.isPresent()) return named.get();
        return recipients.stream().filter(r -> r.getAssessments().stream().anyMatch(a ->
                "user".equals(a.getCreatorUsername()) && (
                        sameName(a.getName(), candidate.getName() + " Assessment (El Emam)")
                        || sameName(a.getName(), legacyName + " Assessment (El Emam)"))))
                .findFirst().orElseGet(() -> recipientRepository.save(candidate));
    }

    private List<Recipient> createBaseRecipients() {
        List<Recipient> recipients = new ArrayList<>();

        // Trusted recipient: strong institutional controls and ethical oversight.
        Recipient trusted = new Recipient();
        trusted.setCreatorUsername("user");
        trusted.setName(ACADEMIC_RECIPIENT);
        trusted.setOrganization("University Labs");
        trusted.setDescription(ACADEMIC_DESCRIPTION);
        trusted = findOrCreateDemoRecipient(trusted, "Academic Research Institute");
        recipients.add(trusted);

        // Commercial recipient: legitimate collaboration with additional motive
        // and capability considerations.
        Recipient commercial = new Recipient();
        commercial.setCreatorUsername("user");
        commercial.setName(COMMERCIAL_RECIPIENT);
        commercial.setOrganization("HealthTech Solutions Ltd.");
        commercial.setDescription(COMMERCIAL_DESCRIPTION);
        commercial = findOrCreateDemoRecipient(commercial, "Commercial Partner");
        recipients.add(commercial);

        // Public release: no specific trusted counterparty and minimal
        // contextual controls.
        Recipient publicRelease = new Recipient();
        publicRelease.setCreatorUsername("user");
        publicRelease.setName(PUBLIC_RECIPIENT);
        publicRelease.setOrganization("Public Release");
        publicRelease.setDescription(PUBLIC_DESCRIPTION);
        publicRelease = findOrCreateDemoRecipient(publicRelease, "Public Open Data Portal");
        recipients.add(publicRelease);

        return recipients;
    }

    private List<RecipientAssessment> createElEmamRecipientAssessments(List<Recipient> recipients, Configuration config) {
        // Initialize the list to return
        List<RecipientAssessment> createdAssessments = new ArrayList<>();

        // Fetch all questions mapped to the RECIPIENT_ASSESSMENT phase
        List<Question> recipientQuestions = config.getQuestions().stream()
                .filter(q -> q.getCategory() != null && "RECIPIENT_ASSESSMENT".equals(q.getCategory().getAssessmentPhase()))
                .sorted(Comparator.comparing(Question::getId, Comparator.nullsLast(Long::compareTo)))
                .toList();

        for (Recipient recipient : recipients) {
            Optional<RecipientAssessment> existing = recipient.getAssessments().stream()
                    .filter(a -> Objects.equals(a.getConfiguration().getId(), config.getId()))
                    .min(Comparator.comparing(RecipientAssessment::getId, Comparator.nullsLast(Long::compareTo)));
            if (existing.isPresent()) {
                createdAssessments.add(existing.get());
                continue;
            }
            RecipientAssessment ra = new RecipientAssessment();
            ra.setRecipient(recipient);
            applyConfiguration(ra, config);
            ra.setCreatorUsername("user");
            ra.setName(recipient.getName() + " Assessment (El Emam)");
            ra.setAnswers(new ArrayList<>());
            ra = recipientAssessmentRepository.save(ra);

            Map<String, String> answers;

            if (isScenario(recipient, ACADEMIC_RECIPIENT)) {
                // SCENARIO ASSUMPTIONS: strong safeguards, capable researchers, low motive.
                // These are not verified controls of DIfE, Charité or another institution.
                answers = Map.ofEntries(
                        entry("Access rights", "yes"),
                        entry("worked/collaborated", "yes"),
                        entry("forbids the recipient", "yes"),
                        entry("enforceable in all jurisdictions", "yes"),
                        entry("surprise audits", "yes"),
                        entry("regular third party privacy", "yes"),
                        entry("strong limits linking", "yes"),
                        entry("written privacy policy", "yes"),
                        entry("person responsible for privacy", "yes"),
                        entry("confidentiality agreement", "yes"),
                        entry("threat and risk assessment", "yes"),
                        entry("Strong security procedures", "yes"),
                        entry("sufficiently trained", "yes"),
                        entry("access and changes", "yes"),
                        entry("User accounts", "yes"),
                        entry("breach notification", "yes"),
                        entry("physically secure", "yes"),
                        entry("no public access", "yes"),
                        entry("destroyed once", "yes"),
                        entry("commercial or criminal value", "no"),
                        entry("non-commercial motive", "no"),
                        entry("technical expertise", "yes"),
                        entry("financial resources", "yes"),
                        entry("harm or embarrass", "no"),
                        entry("other means apart", "yes")
                );
            } else if (isScenario(recipient, COMMERCIAL_RECIPIENT)) {
                // SCENARIO ASSUMPTIONS: established controlled collaboration, including
                // audit rights and independent audits. Commercial value does not imply malice.
                answers = Map.ofEntries(
                        entry("Access rights", "yes"),
                        entry("worked/collaborated", "yes"),
                        entry("forbids the recipient", "yes"),
                        entry("enforceable in all jurisdictions", "yes"),
                        entry("surprise audits", "yes"),
                        entry("regular third party privacy", "yes"),
                        entry("strong limits linking", "yes"),
                        entry("written privacy policy", "yes"),
                        entry("person responsible for privacy", "yes"),
                        entry("confidentiality agreement", "yes"),
                        entry("threat and risk assessment", "yes"),
                        entry("Strong security procedures", "yes"),
                        entry("sufficiently trained", "yes"),
                        entry("access and changes", "yes"),
                        entry("User accounts", "yes"),
                        entry("breach notification", "yes"),
                        entry("physically secure", "yes"),
                        entry("no public access", "yes"),
                        entry("destroyed once", "yes"),
                        entry("commercial or criminal value", "yes"),
                        entry("non-commercial motive", "no"),
                        entry("technical expertise", "yes"),
                        entry("financial resources", "yes"),
                        entry("harm or embarrass", "no"),
                        entry("other means apart", "yes")
                );
            } else if (isScenario(recipient, PUBLIC_RECIPIENT)) {
                // SCENARIO ASSUMPTIONS: unrestricted access, no enforceable
                // recipient-specific safeguards. Unknown recipients may have motives
                // and capability; harm/embarrass stays NO, not everyone is malicious.
                answers = Map.ofEntries(
                        entry("Access rights", "no"),
                        entry("worked/collaborated", "no"),
                        entry("forbids the recipient", "no"),
                        entry("enforceable in all jurisdictions", "no"),
                        entry("surprise audits", "no"),
                        entry("regular third party privacy", "no"),
                        entry("strong limits linking", "no"),
                        entry("written privacy policy", "no"),
                        entry("person responsible for privacy", "no"),
                        entry("confidentiality agreement", "no"),
                        entry("threat and risk assessment", "no"),
                        entry("Strong security procedures", "no"),
                        entry("sufficiently trained", "no"),
                        entry("access and changes", "no"),
                        entry("User accounts", "no"),
                        entry("breach notification", "no"),
                        entry("physically secure", "no"),
                        entry("no public access", "no"),
                        entry("destroyed once", "no"),
                        entry("commercial or criminal value", "yes"),
                        entry("non-commercial motive", "yes"),
                        entry("technical expertise", "yes"),
                        entry("financial resources", "yes"),
                        entry("harm or embarrass", "no"),
                        entry("other means apart", "no")
                );
            } else {
                throw new IllegalArgumentException("Unknown demo recipient: " + recipient.getName());
            }

            // Use the existing helper to map the strings to the exact Option IDs
            support.applyAnswers(ra, recipientQuestions, answers);
            recipient.getAssessments().add(ra);

            // Add the fully populated assessment to our return list
            createdAssessments.add(ra);
        }

        return createdAssessments;
    }

    private List<RecipientAssessment> createSphnRecipientAssessments(List<Recipient> recipients, Configuration config) {
        List<RecipientAssessment> createdAssessments = new ArrayList<>();

        // Fetch all questions mapped to the RECIPIENT_ASSESSMENT phase (CONTEXTUAL_RISK and CONTRACTUAL_IT_RISK)
        List<Question> recipientQuestions = config.getQuestions().stream()
                .filter(q -> q.getCategory() != null && "RECIPIENT_ASSESSMENT".equals(q.getCategory().getAssessmentPhase()))
                .sorted(Comparator.comparing(Question::getId, Comparator.nullsLast(Long::compareTo)))
                .toList();

        for (Recipient recipient : recipients) {
            Optional<RecipientAssessment> existing = recipient.getAssessments().stream()
                    .filter(a -> Objects.equals(a.getConfiguration().getId(), config.getId()))
                    .min(Comparator.comparing(RecipientAssessment::getId, Comparator.nullsLast(Long::compareTo)));
            if (existing.isPresent()) {
                createdAssessments.add(existing.get());
                continue;
            }
            RecipientAssessment ra = new RecipientAssessment();
            ra.setRecipient(recipient);
            applyConfiguration(ra, config);
            ra.setCreatorUsername("user");
            ra.setName(recipient.getName() + " (SPHN)");
            ra.setAnswers(new ArrayList<>());
            ra = recipientAssessmentRepository.save(ra);

            Map<String, String> answers;

            if (isScenario(recipient, ACADEMIC_RECIPIENT)) {
                // Highly trusted academic environment: Very strict IT compliance, low contextual exposure
                answers = Map.ofEntries(
                        entry("[c-01]", "switzerland"),
                        entry("[c-02]", "no health-related"),
                        entry("[c-03]", "100 to 1.000 patients"),
                        entry("[c-04]", "25 to 100 datapoints"),
                        entry("[c-05]", "no"),
                        entry("[c-06]", "not affiliated"),
                        entry("[c-07]", "no"),
                        entry("[cit-01]", "yes"),
                        entry("[cit-02]", "yes"),
                        entry("[cit-03]", "yes"),
                        entry("[cit-04]", "yes"),
                        entry("[cit-05]", "yes"),
                        entry("[cit-06]", "yes"),
                        entry("[cit-07]", "yes"),
                        entry("[cit-08]", "biomedit"),
                        entry("[cit-09]", "yes"),
                        entry("[cit-10]", "yes")
                );
            } else if (isScenario(recipient, COMMERCIAL_RECIPIENT)) {
                // Commercial partner: strong controls, but elevated likelihood because hospital-affiliated staff have EHR access.
                answers = Map.ofEntries(
                        entry("[c-01]", "with adequate safeguards"),
                        entry("[c-02]", "no health-related"),
                        entry("[c-03]", "100 to 1.000"),
                        entry("[c-04]", "25 to 100"),
                        entry("[c-05]", "no"),
                        entry("[c-06]", "WITH access"),
                        entry("[c-07]", "no"),
                        entry("[cit-01]", "yes"),
                        entry("[cit-02]", "yes"),
                        entry("[cit-03]", "no"),
                        entry("[cit-04]", "no"),
                        entry("[cit-05]", "yes"),
                        entry("[cit-06]", "yes"),
                        entry("[cit-07]", "yes"),
                        entry("[cit-08]", "hospital it"),
                        entry("[cit-09]", "yes"),
                        entry("[cit-10]", "yes")
                );
            } else if (isScenario(recipient, PUBLIC_RECIPIENT)) {
                // Public release: weak/no contractual controls and high contextual exposure.
                answers = Map.ofEntries(
                        entry("[c-01]", "without adequate safeguards"),
                        entry("[c-02]", "less than one in 2.000"),
                        entry("[c-03]", "1.000 to 5.000"),
                        entry("[c-04]", "100 to 1000"),
                        entry("[c-05]", "yes"),
                        entry("[c-06]", "WITH access"),
                        entry("[c-07]", "yes"),
                        entry("[cit-01]", "no"),
                        entry("[cit-02]", "no"),
                        entry("[cit-03]", "no"),
                        entry("[cit-04]", "no"),
                        entry("[cit-05]", "no"),
                        entry("[cit-06]", "no"),
                        entry("[cit-07]", "no"),
                        entry("[cit-08]", "private computer"),
                        entry("[cit-09]", "no"),
                        entry("[cit-10]", "no")
                );
            } else {
                throw new IllegalArgumentException("Unknown demo recipient: " + recipient.getName());
            }

            // Apply answers using the overloaded helper method
            support.applyAnswers(ra, recipientQuestions, answers);
            recipient.getAssessments().add(ra);

            createdAssessments.add(ra);
        }

        return createdAssessments;
    }


}
