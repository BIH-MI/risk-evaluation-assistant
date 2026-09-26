package org.bihealth.mi.risk_assessment_api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.bihealth.mi.risk_assessment_api.service.ProjectRequirementStableKeys.REQ_SHARING_MODEL;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.bihealth.mi.risk_assessment_api.enums.MitigationSharingArrangement;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service.MitigationKnowledgeBaseSnapshotService;
import org.bihealth.mi.risk_assessment_api.model.project.Project;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectRequirementResponse;
import org.bihealth.mi.risk_assessment_api.model.project.ProjectTemplateVersion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.PlatformTransactionManager;

@ExtendWith(MockitoExtension.class)
class MitigationOpportunityServiceTest {

    @Mock
    private DataSharingActivityService activityService;

    @Mock
    private RiskService riskService;

    @Mock
    private MitigationKnowledgeBaseSnapshotService knowledgeBaseSnapshotService;

    @Mock
    private DataMitigationOpportunityMatcher dataMatcher;

    @Mock
    private ContextMitigationOpportunityMatcher contextMatcher;

    @Mock
    private RiskDriverExtractorService riskDriverExtractor;

    @Mock
    private ProjectConstraintCompatibilityService compatibilityService;

    @Mock
    private ProjectRequirementResolver requirementResolver;

    @Mock
    private PlatformTransactionManager transactionManager;

    private MitigationOpportunityService service;

    @BeforeEach
    void setUp() {
        service = new MitigationOpportunityService(
                activityService,
                riskService,
                knowledgeBaseSnapshotService,
                dataMatcher,
                contextMatcher,
                riskDriverExtractor,
                compatibilityService,
                requirementResolver,
                transactionManager
        );
    }

    @Test
    void resolveSharingArrangementUsesProvidedRequirementMap() {
        Project project = new Project();
        Map<String, ProjectRequirementResponse> responses = new LinkedHashMap<>();
        responses.put(REQ_SHARING_MODEL, new ProjectRequirementResponse());
        List<String> warnings = new ArrayList<>();

        when(requirementResolver.firstValue(same(responses), eq(REQ_SHARING_MODEL)))
                .thenReturn("SECURE_REMOTE_ANALYSIS");

        MitigationSharingArrangement result = service.resolveSharingArrangement(project, responses, warnings);

        assertThat(result).isEqualTo(MitigationSharingArrangement.SECURE_REMOTE_ANALYSIS);
        assertThat(warnings).isEmpty();
        verify(requirementResolver).firstValue(same(responses), eq(REQ_SHARING_MODEL));
        verify(requirementResolver, never()).responsesByStableKey(any(Project.class));
        verify(requirementResolver, never()).fixedTemplateValue(any(ProjectTemplateVersion.class), anyString());
    }

    @Test
    void resolveSharingArrangementKeepsFixedTemplateFallback() {
        ProjectTemplateVersion version = new ProjectTemplateVersion();
        Project project = new Project();
        project.setTemplateVersion(version);
        Map<String, ProjectRequirementResponse> responses = Map.of();
        List<String> warnings = new ArrayList<>();

        when(requirementResolver.firstValue(same(responses), eq(REQ_SHARING_MODEL))).thenReturn(null);
        when(requirementResolver.fixedTemplateValue(version, REQ_SHARING_MODEL)).thenReturn("CONTROLLED_TRANSFER");

        MitigationSharingArrangement result = service.resolveSharingArrangement(project, responses, warnings);

        assertThat(result).isEqualTo(MitigationSharingArrangement.CONTROLLED_DATA_TRANSFER);
        assertThat(warnings).isEmpty();
    }
}
