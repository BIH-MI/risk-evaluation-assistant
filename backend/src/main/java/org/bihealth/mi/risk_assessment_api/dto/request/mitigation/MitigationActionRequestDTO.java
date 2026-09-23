package org.bihealth.mi.risk_assessment_api.dto.request.mitigation;

import lombok.Data;
import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.enums.MitigationEstimateScope;
import org.bihealth.mi.risk_assessment_api.enums.MitigationRecordRetentionEffect;
import org.bihealth.mi.risk_assessment_api.enums.MitigationResultingDataForm;
import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

@Data
public class MitigationActionRequestDTO {
    private String code;
    private String name;
    private String description;
    private MitigationActionType actionType;
    private boolean active = true;
    private String implementationDescription;
    private String verificationDescription;
    private String source;
    private String rationale;
    private MitigationResultingDataForm resultingDataForm;
    private MitigationRecordRetentionEffect recordRetentionEffect;
    private Set<MitigationSharingArrangement> applicableSharingArrangements;
    private BigDecimal estimatedCostMin;
    private BigDecimal estimatedCostMax;
    private String currency;
    private Integer estimatedSetupDaysMin;
    private Integer estimatedSetupDaysMax;
    private MitigationEstimateScope estimateScope;
    private String estimateSource;
    private String estimateAssumptions;
    private List<MitigationQuestionMappingRequestDTO> questionMappings;
    private List<MitigationAttributeMappingRequestDTO> attributeMappings;
    private List<MitigationParameterDefinitionRequestDTO> parameterDefinitions;
}
