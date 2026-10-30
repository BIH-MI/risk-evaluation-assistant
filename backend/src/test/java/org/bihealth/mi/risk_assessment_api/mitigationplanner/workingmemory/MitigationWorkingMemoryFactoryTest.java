package org.bihealth.mi.risk_assessment_api.mitigationplanner.workingmemory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseService;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseVersionService;
import org.bihealth.mi.risk_assessment_api.model.activity.DataSharingActivity;
import org.bihealth.mi.risk_assessment_api.service.DataSharingActivityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MitigationWorkingMemoryFactoryTest {

    private final DataSharingActivityService activityService = mock(DataSharingActivityService.class);
    private final MitigationKnowledgeBaseService knowledgeBaseService = mock(MitigationKnowledgeBaseService.class);
    private final MitigationKnowledgeBaseVersionService knowledgeBaseVersionService =
            mock(MitigationKnowledgeBaseVersionService.class);
    private final DataSharingActivity activity = new DataSharingActivity();
    private MitigationWorkingMemoryFactory factory;

    @BeforeEach
    void setUp() {
        when(activityService.getAccessibleActivityEntity(1L, "alice", false)).thenReturn(activity);
        factory = new MitigationWorkingMemoryFactory(activityService, mock(PlanningBaselineRiskLoader.class),
                knowledgeBaseService, knowledgeBaseVersionService);
    }

    @Test
    void usesTheActivitysRequirementsAndPinnedKnowledgeBaseVersion() {
        MitigationKnowledgeBaseVersion pinned = new MitigationKnowledgeBaseVersion();
        activity.setMitigationKnowledgeBaseVersion(pinned);
        activity.getRequirements().setSharingArrangement(MitigationSharingArrangement.SECURE_REMOTE_ANALYSIS);

        MitigationWorkingMemory memory = factory.create(1L, "alice", false, null);

        assertThat(memory.knowledgeBaseVersion()).isSameAs(pinned);
        assertThat(memory.requirements()).isSameAs(activity.getRequirements());
        assertThat(memory.sharingArrangement()).isEqualTo(MitigationSharingArrangement.SECURE_REMOTE_ANALYSIS);
        assertThat(memory.warnings()).isEmpty();
        verifyNoInteractions(knowledgeBaseService, knowledgeBaseVersionService);
    }

    @Test
    void deprecatedSharingArrangementIsReadAsItsCurrentEquivalent() {
        activity.setMitigationKnowledgeBaseVersion(new MitigationKnowledgeBaseVersion());
        activity.getRequirements().setSharingArrangement(MitigationSharingArrangement.CONTROLLED_TRANSFER);

        assertThat(factory.create(1L, "alice", false, null).sharingArrangement())
                .isEqualTo(MitigationSharingArrangement.CONTROLLED_DATA_TRANSFER);
    }

    @Test
    void warnsAndFallsBackToTheDefaultKnowledgeBaseWithoutPinOrArrangement() {
        MitigationKnowledgeBase defaultKnowledgeBase = new MitigationKnowledgeBase();
        MitigationKnowledgeBaseVersion current = new MitigationKnowledgeBaseVersion();
        when(knowledgeBaseService.resolveDefaultActiveKnowledgeBase()).thenReturn(defaultKnowledgeBase);
        when(knowledgeBaseVersionService.getCurrentVersion(defaultKnowledgeBase)).thenReturn(current);

        MitigationWorkingMemory memory = factory.create(1L, "alice", false, null);

        assertThat(memory.knowledgeBaseVersion()).isSameAs(current);
        assertThat(memory.sharingArrangement()).isNull();
        assertThat(memory.warnings()).hasSize(2);
    }

    @Test
    void rejectsAThresholdOutsideZeroToOne() {
        assertThatThrownBy(() -> factory.create(1L, "alice", false, 1.5))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
