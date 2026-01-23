package org.bihealth.mi.risk_assessment_api.dto.response.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bihealth.mi.risk_assessment_api.model.report.Report;

import java.time.LocalDateTime;

/**
 * Represents a saved, persisted Report entity in an API response.
 * This DTO contains the full breakdown of a completed risk calculation,
 * including calculated defaults and final values based on user overrides.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportResponseDTO {
    // ——— Report identity & metadata ———
    private Integer id;
    private Integer dataSharingActivityId;
    private String  creatorUsername;
    private LocalDateTime creationDate;

    // ——— Context Risk & Thresholds ———
    private Double contextRisk;
    private Double riskThreshold;
    private Double maximumDataRisk;

    // ——— Motives & Capacity (MOTC) ———
    private String motivesCapacityClassification;

    // ——— Mitigating Controls (MITC) ———
    private String mitigatingControlsClassification;

    // ——— Invasion of Privacy (IP) ———
    private String invasionPrivacyClassification;

    /**
     * A static factory method to map a Report entity to this DTO.
     *
     * @param rpt The Report entity from the database.
     * @return A new ReportResponseDTO instance.
     */
    public static ReportResponseDTO fromEntity(Report rpt) {
        return new ReportResponseDTO(
                rpt.getId(),
                rpt.getDataSharingActivity().getId(),
                rpt.getCreatorUsername(),
                rpt.getCreationDate(),

                // Context Risk
                rpt.getContextRisk(),

                // Thresholds
                rpt.getRiskThreshold(),

                // Max Data Risk
                rpt.getMaximumDataRisk(),

                // Motives & Capacity
                rpt.getMotivesCapacityClassification(),

                // Mitigating Controls
                rpt.getMitigatingControlsClassification(),

                // Invasion of Privacy
                rpt.getInvasionPrivacyClassification()
        );
    }
}