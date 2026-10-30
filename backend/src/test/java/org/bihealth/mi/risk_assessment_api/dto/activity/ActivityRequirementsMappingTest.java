package org.bihealth.mi.risk_assessment_api.dto.activity;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.bihealth.mi.risk_assessment_api.dto.request.activity.ActivityRequirementsDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.mitigationplanner.MitigationPlanDraftEvaluationDTO.RequirementCheck;
import org.bihealth.mi.risk_assessment_api.enums.ActivityRequirement;
import org.bihealth.mi.risk_assessment_api.enums.ExternalDeliverable;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.model.activity.ActivityRequirements;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** Validation and mapping of activity requirements without a Spring context or database. */
class ActivityRequirementsMappingTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void aBudgetNeedsACurrency() {
        ActivityRequirementsDTO dto = new ActivityRequirementsDTO();
        dto.setAvailableBudget(new BigDecimal("5000"));

        assertThat(validator.validate(dto)).extracting(ConstraintViolation::getMessage)
                .containsExactly("Enter the currency of the available budget.");
    }

    @Test
    void invalidValuesAreRejected() {
        ActivityRequirementsDTO dto = new ActivityRequirementsDTO();
        dto.setMaximumSetupTimeDays(-1);
        dto.setMinimumCohortRetentionPercent(new BigDecimal("100.5"));
        dto.setAvailableBudget(new BigDecimal("10"));
        dto.setBudgetCurrency("eur");

        assertThat(validator.validate(dto)).hasSize(3);
    }

    @Test
    void aSecureRemoteAnalysisCannotDeliverADownloadableDataset() {
        ActivityRequirementsDTO dto = new ActivityRequirementsDTO();
        dto.setSharingArrangement(MitigationSharingArrangement.SECURE_REMOTE_ANALYSIS);
        dto.setRequiredExternalDeliverables(Set.of(ExternalDeliverable.ANONYMIZED_DOWNLOADABLE_DATASET));

        assertThat(validator.validate(dto)).extracting(ConstraintViolation::getMessage)
                .containsExactly("A secure remote analysis cannot deliver a downloadable dataset.");

        dto.setRequiredExternalDeliverables(Set.of(ExternalDeliverable.AGGREGATE_RESULTS));
        assertThat(validator.validate(dto)).isEmpty();
    }

    @Test
    void unstatedRequirementsAreValid() {
        assertThat(validator.validate(new ActivityRequirementsDTO())).isEmpty();
    }

    @Test
    void applyingUpdatesThePersistedCollectionsInPlace() {
        ActivityRequirements persisted = new ActivityRequirements();
        persisted.getRequiredExternalDeliverables().add(ExternalDeliverable.CODE);
        Set<ExternalDeliverable> persistedSet = persisted.getRequiredExternalDeliverables();

        ActivityRequirementsDTO dto = new ActivityRequirementsDTO();
        dto.setRequiredExternalDeliverables(Set.of(ExternalDeliverable.REPORT));
        dto.setBudgetCurrency("   ");
        dto.setSharingArrangement(MitigationSharingArrangement.CONTROLLED_TRANSFER);
        dto.applyTo(persisted);

        assertThat(persisted.getRequiredExternalDeliverables()).isSameAs(persistedSet).containsExactly(ExternalDeliverable.REPORT);
        assertThat(persisted.getBudgetCurrency()).isNull();
        assertThat(persisted.getSharingArrangement()).isEqualTo(MitigationSharingArrangement.CONTROLLED_DATA_TRANSFER);
    }

    @Test
    void selectionsAreReturnedInDeclarationOrder() {
        ActivityRequirements persisted = new ActivityRequirements();
        persisted.setRequiredExternalDeliverables(new LinkedHashSet<>(List.of(
                ExternalDeliverable.CODE, ExternalDeliverable.ANONYMIZED_DOWNLOADABLE_DATASET)));

        assertThat(ActivityRequirementsDTO.from(persisted).getRequiredExternalDeliverables())
                .containsExactly(ExternalDeliverable.ANONYMIZED_DOWNLOADABLE_DATASET, ExternalDeliverable.CODE);
    }

    @Test
    void aCheckNamesItsRequirementByTheRequirementsProperty() throws Exception {
        RequirementCheck check = new RequirementCheck();
        check.setRequirement(ActivityRequirement.AVAILABLE_BUDGET);

        String json = new ObjectMapper().writeValueAsString(check);

        assertThat(json).contains("\"requirement\":\"availableBudget\"");
        // The client looks up a check's value and label by this property name.
        for (ActivityRequirement requirement : ActivityRequirement.values()) {
            assertThat(ActivityRequirementsDTO.class.getDeclaredField(requirement.propertyName())).isNotNull();
        }
    }
}
