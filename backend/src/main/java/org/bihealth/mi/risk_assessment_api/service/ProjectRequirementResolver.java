package org.bihealth.mi.risk_assessment_api.service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

import org.bihealth.mi.risk_assessment_api.model.project.Project;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectRequirementResponse;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateRequirement;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateSection;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateVersion;
import org.springframework.stereotype.Service;

/**
 * Resolves Project requirement responses that belong to the Project's pinned template version.
 */
@Service
public class ProjectRequirementResolver {

    public Map<String, ProjectRequirementResponse> responsesByStableKey(Project project) {
        Long versionId = project.getTemplateVersion() == null ? null : project.getTemplateVersion().getId();
        Map<String, ProjectRequirementResponse> responses = new LinkedHashMap<>();
        if (versionId == null) {
            return responses;
        }
        for (ProjectRequirementResponse response : project.getRequirementResponses()) {
            if (response.getTemplateVersion() == null
                    || !versionId.equals(response.getTemplateVersion().getId())) {
                continue;
            }
            String key = response.getRequirementKey();
            if (responses.containsKey(key)) {
                throw new IllegalStateException(
                        "Project " + project.getId() + " has duplicate responses for requirement key " + key + "."
                );
            }
            responses.put(key, response);
        }
        return responses;
    }

    public String firstValue(Map<String, ProjectRequirementResponse> responses, String key) {
        String value = displayValue(responses.get(key));
        return value == null ? null : value.split(",")[0].trim().toUpperCase(Locale.ROOT);
    }

    public BigDecimal decimalValue(Map<String, ProjectRequirementResponse> responses, String key) {
        ProjectRequirementResponse response = responses.get(key);
        return response == null ? null : response.getDecimalValue();
    }

    public String displayValue(ProjectRequirementResponse response) {
        if (response == null) {
            return null;
        }
        return switch (response.getRequirement().getValueType()) {
            case TEXT, LONG_TEXT, YES_NO_UNKNOWN -> blankToNull(response.getTextValue());
            case INTEGER, DURATION -> response.getIntegerValue() == null ? null : response.getIntegerValue().toString();
            case DECIMAL, MONEY -> response.getDecimalValue() == null
                    ? null
                    : response.getDecimalValue().stripTrailingZeros().toPlainString();
            case DATE -> response.getDateValue() == null ? null : response.getDateValue().toString();
            case YES_NO -> response.getBooleanValue() == null ? null : (response.getBooleanValue() ? "YES" : "NO");
            case SINGLE_SELECT, MULTI_SELECT -> response.getSelectedValues() == null || response.getSelectedValues().isEmpty()
                    ? null
                    : String.join(",", response.getSelectedValues());
        };
    }

    public String fixedTemplateValue(ProjectTemplateVersion version, String key) {
        if (version == null) {
            return null;
        }
        for (ProjectTemplateSection section : version.getSections()) {
            for (ProjectTemplateRequirement requirement : section.getRequirements()) {
                if (key.equals(requirement.getStableKey()) && requirement.getFixedValue() != null
                        && !requirement.getFixedValue().isBlank()) {
                    return requirement.getFixedValue().split(",")[0];
                }
            }
        }
        return null;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
