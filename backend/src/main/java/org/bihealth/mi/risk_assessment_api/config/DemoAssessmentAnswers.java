package org.bihealth.mi.risk_assessment_api.config;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Questionnaire answers of the seeded demo assessments.
 *
 * <p>Keys are stable fragments of the question text (for SPHN the bracketed question code) and
 * values select the option, see {@link SeedAnswerResolver}. The answers are illustrative and
 * describe one internally consistent story; they are not measurements of the real LEOSS
 * cohort:</p>
 *
 * <ul>
 *   <li>Dataset: the LEOSS-inspired demo table of 10,020 patients with 16 attributes, an exact
 *       integer age, a date of diagnosis shifted by up to 90 days and a surrogate insurance
 *       number (see {@link DemoDatasetEvidenceSeeder}). SPHN answers about concepts the table
 *       does not contain (date of birth, date of death, location, ...) are "not used".</li>
 *   <li>Academic: a trusted Swiss university lab with complete contractual, technical and
 *       organisational controls and no motive or capability to re-identify.</li>
 *   <li>Commercial: a legitimate company outside Switzerland with standard controls. Under SPHN
 *       its project team includes hospital-affiliated staff WITH EHR access (C-06), a
 *       non-actionable Critical likelihood finding that keeps Likelihood HIGH even when
 *       external-audit rights (CIT-03/CIT-04) are added.</li>
 *   <li>Public: an open download without an identified recipient. Recipient-oriented control
 *       questions are answered "No" (no such control exists), and likelihood questions assume
 *       that anyone, including hospital staff with EHR access, can obtain and process the data
 *       anywhere.</li>
 * </ul>
 *
 * <p>Questions of the SPHN likelihood category that describe the cohort itself (C-02 to C-05,
 * C-07) are answered identically for every recipient because all scenarios share one
 * dataset.</p>
 */
public final class DemoAssessmentAnswers {

    private DemoAssessmentAnswers() {
    }

    public static final Map<String, String> EL_EMAM_DATASET = answers(
            "highly detailed", "No",
            "database is large", "Yes",
            "highly sensitive personal nature", "No",
            "sensitive context", "No",
            "conditions that were established", "N/A",
            "commitment or promise not to disclose", "No",
            "caveat stating", "No",
            "compiled or obtained under guarantees", "No",
            "unsolicited or given freely", "No",
            "foreign laws", "No",
            "potential injury", "No"
    );

    public static final Map<String, String> SPHN_DATASET = answers(
            // insurance_number holds plausible surrogate values; it is still flagged as a
            // direct-identifier-like field and its removal is proposed before sharing.
            "[D-01]", "Identifiers are replaced by plausible surrogates",
            "[D-02]", "no mapping table is kept",
            "[D-03]", "Sample identifiers are not use in the project",
            "[D-04]", "Administrative case identifier is not used",
            "[D-05]", "Lab report identifier and Lab order identifier is not used",
            "[D-06]", "within +/- 90 days",
            "[D-07]", "Date of birth concept is suppressed or not used",
            "[D-08]", "Date of death concept is suppressed or not used",
            // age_at_diagnosis has 98 distinct integer values: the original age is kept.
            "[D-09]", "Original age is kept",
            "[D-10]", "Profession is not used",
            "[D-11]", "Location is not used",
            "[D-12]", "Organization name is not used",
            "[D-13]", "Organizational unit is not used",
            "[M-01]", "No audio data",
            "[M-02]", "No images",
            "[DCM-01]", "Original value is suppressed",
            "[DCM-02]", "Original value is suppressed",
            "[DCM-03]", "Original value is suppressed",
            "[DCM-04]", "Original value is suppressed",
            "[DCM-05]", "Original value is suppressed",
            "[DCM-06]", "Original value is suppressed",
            "[G-01]", "No genomic sequences",
            "[O-01]", "No other quasi-identifiers"
    );

    public static final Map<String, String> EL_EMAM_ACADEMIC = answers(
            "need to know", "Yes",
            "worked/collaborated", "Yes",
            "forbids the recipient", "Yes",
            "enforceable in all jurisdictions", "Yes",
            "surprise audits", "Yes",
            "regular third party privacy", "Yes",
            "strong limits linking", "Yes",
            "written privacy policy", "Yes",
            "person responsible for privacy", "Yes",
            "confidentiality agreement", "Yes",
            "threat and risk assessment", "Yes",
            "Strong security procedures", "Yes",
            "sufficiently trained", "Yes",
            "access and changes", "Yes",
            "User accounts", "Yes",
            "breach notification", "Yes",
            "physically secure", "Yes",
            "no public access", "Yes",
            "destroyed once", "Yes",
            "commercial or criminal value", "No",
            "non-commercial motive", "No",
            "technical expertise", "No",
            "financial resources", "No",
            "harm or embarrass", "No",
            "other means apart", "Yes"
    );

    /** Adequate legal and technical controls, no audit rights, clear motive and capability. */
    public static final Map<String, String> EL_EMAM_COMMERCIAL = answers(
            "need to know", "Yes",
            "worked/collaborated", "No",
            "forbids the recipient", "Yes",
            "enforceable in all jurisdictions", "Yes",
            "surprise audits", "No",
            "regular third party privacy", "No",
            "strong limits linking", "Yes",
            "written privacy policy", "Yes",
            "person responsible for privacy", "Yes",
            "confidentiality agreement", "Yes",
            "threat and risk assessment", "Yes",
            "Strong security procedures", "Yes",
            "sufficiently trained", "Yes",
            "access and changes", "Yes",
            "User accounts", "Yes",
            "breach notification", "Yes",
            "physically secure", "Yes",
            "no public access", "Yes",
            "destroyed once", "Yes",
            "commercial or criminal value", "Yes",
            "non-commercial motive", "No",
            "technical expertise", "Yes",
            "financial resources", "Yes",
            "harm or embarrass", "No",
            "other means apart", "Yes"
    );

    /** No recipient-side control exists for an open download; anyone may attempt re-identification. */
    public static final Map<String, String> EL_EMAM_PUBLIC = answers(
            "need to know", "No",
            "worked/collaborated", "No",
            "forbids the recipient", "No",
            "enforceable in all jurisdictions", "No",
            "surprise audits", "No",
            "regular third party privacy", "No",
            "strong limits linking", "No",
            "written privacy policy", "No",
            "person responsible for privacy", "No",
            "confidentiality agreement", "No",
            "threat and risk assessment", "No",
            "Strong security procedures", "No",
            "sufficiently trained", "No",
            "access and changes", "No",
            "User accounts", "No",
            "breach notification", "No",
            "physically secure", "No",
            "no public access", "No",
            "destroyed once", "No",
            "commercial or criminal value", "Yes",
            "non-commercial motive", "Yes",
            "technical expertise", "Yes",
            "financial resources", "Yes",
            "harm or embarrass", "No",
            "other means apart", "No"
    );

    public static final Map<String, String> SPHN_ACADEMIC = sphnRecipient(
            "In Switzerland",
            "Project staff not affiliated to the hospital",
            answers(
                    "[CIT-01]", "Yes",
                    "[CIT-02]", "Yes",
                    "[CIT-03]", "Yes",
                    "[CIT-04]", "Yes",
                    "[CIT-05]", "Yes",
                    "[CIT-06]", "Yes",
                    "[CIT-07]", "Yes",
                    "[CIT-08]", "external IT infrastructure that complies with BioMedIT",
                    "[CIT-09]", "Yes",
                    "[CIT-10]", "Yes"
            )
    );

    /**
     * The company processes the data abroad under Swiss-law safeguards on certified external
     * infrastructure (CIT-08 to CIT-10). Its agreement has no external-audit clauses (CIT-03,
     * CIT-04), and its project team includes hospital-affiliated staff with EHR access (C-06).
     */
    public static final Map<String, String> SPHN_COMMERCIAL = sphnRecipient(
            "but with adequate safeguards according to Swiss law",
            "affiliated to the hospital WITH access",
            answers(
                    "[CIT-01]", "Yes",
                    "[CIT-02]", "Yes",
                    "[CIT-03]", "No",
                    "[CIT-04]", "No",
                    "[CIT-05]", "Yes",
                    "[CIT-06]", "Yes",
                    "[CIT-07]", "Yes",
                    "[CIT-08]", "external IT infrastructure that complies with BioMedIT",
                    "[CIT-09]", "Yes",
                    "[CIT-10]", "Yes"
            )
    );

    public static final Map<String, String> SPHN_PUBLIC = sphnRecipient(
            "and without adequate safeguards according to Swiss law",
            "affiliated to the hospital WITH access",
            answers(
                    "[CIT-01]", "No",
                    "[CIT-02]", "No",
                    "[CIT-03]", "No",
                    "[CIT-04]", "No",
                    "[CIT-05]", "No",
                    "[CIT-06]", "No",
                    "[CIT-07]", "No",
                    "[CIT-08]", "On PRIVATE computer",
                    "[CIT-09]", "No",
                    "[CIT-10]", "No"
            )
    );

    /**
     * Controlled-transfer counterpart of {@link #SPHN_SECURE_ENVIRONMENT}: a Swiss research institute with
     * sound IT and staff controls whose data-transfer and use agreement (DTUA) is not yet executed.
     * Without an agreement there is no contractual control at all (CIT-01 to CIT-05 "No"); CIT-01
     * and CIT-02 are Controls high-risk triggers. CIT-10 concerns the separate processing
     * agreement with the BioMedIT-compliant infrastructure provider, which is in place.
     */
    public static final Map<String, String> SPHN_AGREEMENT_PENDING = sphnRecipient(
            "In Switzerland",
            "Project staff not affiliated to the hospital",
            answers(
                    "[CIT-01]", "No",
                    "[CIT-02]", "No",
                    "[CIT-03]", "No",
                    "[CIT-04]", "No",
                    "[CIT-05]", "No",
                    "[CIT-06]", "Yes",
                    "[CIT-07]", "Yes",
                    "[CIT-08]", "external IT infrastructure that complies with BioMedIT",
                    "[CIT-09]", "Yes",
                    "[CIT-10]", "Yes"
            )
    );

    /**
     * MIE reference scenario "LEOSS / Secure Analysis Environment (SPHN)": a research team analyses
     * a subset of 100 to 1,000 patients of the demo table inside an approved secure environment;
     * only aggregate results and tables leave it. SPHN C-03 asks for the patients planned in the
     * project cohort, so it differs from the scenarios that share the whole table. Technical and
     * organisational controls are in place, but the project-specific data-transfer/use agreement is
     * not yet executed, so none of its clauses exist yet (CIT-01 to CIT-05 "No"). CIT-10 is the
     * separate processing agreement with the infrastructure provider, which exists.
     */
    public static final Map<String, String> SPHN_SECURE_ENVIRONMENT = sphnRecipient(
            "In Switzerland",
            "Project staff not affiliated to the hospital",
            "100 to 1.000 patients",
            answers(
                    "[CIT-01]", "No",
                    "[CIT-02]", "No",
                    "[CIT-03]", "No",
                    "[CIT-04]", "No",
                    "[CIT-05]", "No",
                    "[CIT-06]", "Yes",
                    "[CIT-07]", "Yes",
                    "[CIT-08]", "external IT infrastructure that complies with BioMedIT",
                    "[CIT-09]", "Yes",
                    "[CIT-10]", "Yes"
            )
    );

    /** Scenarios that share the whole demo table of 10,020 patients (cohort-retention >= 90%). */
    private static Map<String, String> sphnRecipient(
            String jurisdiction,
            String dataAccess,
            Map<String, String> controls
    ) {
        return sphnRecipient(jurisdiction, dataAccess, "> 5.000 patients", controls);
    }

    /** Cohort facts of the demo dataset; only the planned cohort size (C-03) depends on the project. */
    private static Map<String, String> sphnRecipient(
            String jurisdiction,
            String dataAccess,
            String plannedCohortSize,
            Map<String, String> controls
    ) {
        Map<String, String> answers = new LinkedHashMap<>(answers(
                "[C-01]", jurisdiction,
                "[C-02]", "No health-related data on rare diseases",
                "[C-03]", plannedCohortSize,
                // 16 attributes per patient.
                "[C-04]", "< 25 datapoints",
                "[C-05]", "No",
                "[C-06]", dataAccess,
                // Consistent with D-02: no mapping table is kept.
                "[C-07]", "No"
        ));
        answers.putAll(controls);
        return Collections.unmodifiableMap(answers);
    }

    private static Map<String, String> answers(String... keyValuePairs) {
        if (keyValuePairs.length % 2 != 0) {
            throw new IllegalArgumentException("Seed answers must be key/value pairs.");
        }
        Map<String, String> answers = new LinkedHashMap<>();
        for (int i = 0; i < keyValuePairs.length; i += 2) {
            if (answers.put(keyValuePairs[i], keyValuePairs[i + 1]) != null) {
                throw new IllegalArgumentException("Duplicate seed answer key: " + keyValuePairs[i]);
            }
        }
        return Collections.unmodifiableMap(answers);
    }
}
