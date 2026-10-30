package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.seed;

import java.util.Optional;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository.MitigationKnowledgeBaseRepository;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseVersionService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.validation.MitigationKnowledgeBaseValidator;
import org.bihealth.mi.risk_assessment_api.repository.configuration.RiskConfigurationRepository;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;

class MitigationKnowledgeBaseSeederTest {
    @Test
    void restartDoesNotUpgradeOrRewriteAnExistingDefault() {
        var repository = mock(MitigationKnowledgeBaseRepository.class);
        var versions = mock(MitigationKnowledgeBaseVersionService.class);
        var validator = mock(MitigationKnowledgeBaseValidator.class);
        var configurations = mock(RiskConfigurationRepository.class);
        when(repository.findFirstByDefaultKnowledgeBaseTrueAndActiveTrueOrderByIdAsc())
                .thenReturn(Optional.of(new MitigationKnowledgeBase()));
        var seeder = new MitigationKnowledgeBaseSeeder(repository, versions, validator, configurations);

        seeder.run();
        seeder.run();

        verify(repository, times(2)).findFirstByDefaultKnowledgeBaseTrueAndActiveTrueOrderByIdAsc();
        verifyNoMoreInteractions(repository);
        verifyNoInteractions(versions, validator, configurations);
    }
}
