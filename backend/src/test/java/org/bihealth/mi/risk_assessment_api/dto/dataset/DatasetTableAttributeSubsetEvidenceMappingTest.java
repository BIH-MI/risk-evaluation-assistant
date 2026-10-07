package org.bihealth.mi.risk_assessment_api.dto.dataset;

import org.bihealth.mi.risk_assessment_api.dto.request.dataset.DatasetTableAttributeRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.request.dataset.DatasetTableAttributeSubsetEvidenceRequestDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.dataset.DatasetTableAttributeResponseDTO;
import org.bihealth.mi.risk_assessment_api.dto.response.dataset.DatasetTableAttributeSubsetEvidenceResponseDTO;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTable;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttribute;
import org.bihealth.mi.risk_assessment_api.model.dataset.DatasetTableAttributeSubsetEvidence;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

/**
 * Round-trips per-subset-size evidence through request DTO -> entity ->
 * response DTO without a Spring context or database.
 */
class DatasetTableAttributeSubsetEvidenceMappingTest {

    private static DatasetTableAttributeSubsetEvidenceRequestDTO evidence(
            Integer subsetSize,
            Long evaluatedSubsetCount,
            Double meanDistinction,
            Double meanSeparation,
            Double meanSingletonFraction
    ) {
        return new DatasetTableAttributeSubsetEvidenceRequestDTO(
                null, subsetSize, evaluatedSubsetCount,
                meanDistinction, meanSeparation, meanSingletonFraction
        );
    }

    private static DatasetTableAttributeRequestDTO attributeRequest(
            List<DatasetTableAttributeSubsetEvidenceRequestDTO> subsetEvidence
    ) {
        DatasetTableAttributeRequestDTO request = new DatasetTableAttributeRequestDTO();
        request.setName("complicated_phase");
        request.setDataType("BOOLEAN");
        request.setExcluded(false);
        request.setDistinction(0.0002);
        request.setSubsetEvidence(subsetEvidence);
        return request;
    }

    @Test
    void roundTripsEveryRowIncludingZeroMeans() {
        DatasetTableAttribute entity = attributeRequest(List.of(
                evidence(3, 3L, 0.2, 0.5, 0.0),
                evidence(2, 3L, 0.1, 0.0, 0.0)
        )).toEntity(new DatasetTable());

        assertThat(entity.getSubsetEvidence()).hasSize(2)
                .allSatisfy(row -> assertThat(row.getAttribute()).isSameAs(entity));

        List<DatasetTableAttributeSubsetEvidenceResponseDTO> response =
                new DatasetTableAttributeResponseDTO(entity).getSubsetEvidence();

        assertThat(response)
                .extracting(
                        DatasetTableAttributeSubsetEvidenceResponseDTO::getSubsetSize,
                        DatasetTableAttributeSubsetEvidenceResponseDTO::getEvaluatedSubsetCount,
                        DatasetTableAttributeSubsetEvidenceResponseDTO::getMeanSeparation,
                        DatasetTableAttributeSubsetEvidenceResponseDTO::getMeanSingletonFraction
                )
                .containsExactly(
                        tuple(2, 3L, 0.0, 0.0),
                        tuple(3, 3L, 0.5, 0.0)
                );
    }

    @Test
    void dropsRowsWithoutSubsetSize() {
        DatasetTableAttribute entity = attributeRequest(Arrays.asList(
                evidence(2, 3L, 0.1, 0.2, 0.3),
                evidence(null, 1L, 0.1, 0.2, 0.3)
        )).toEntity(new DatasetTable());

        assertThat(entity.getSubsetEvidence())
                .extracting(DatasetTableAttributeSubsetEvidence::getSubsetSize)
                .containsExactly(2);
    }

    @Test
    void missingListKeepsPersistedEvidenceAndEmptyListClearsIt() {
        DatasetTableAttribute entity = attributeRequest(List.of(
                evidence(2, 3L, 0.1, 0.2, 0.3)
        )).toEntity(new DatasetTable());

        attributeRequest(null).applySubsetEvidenceTo(entity);
        assertThat(entity.getSubsetEvidence()).hasSize(1);

        attributeRequest(new ArrayList<>()).applySubsetEvidenceTo(entity);
        assertThat(entity.getSubsetEvidence()).isEmpty();
    }
}
