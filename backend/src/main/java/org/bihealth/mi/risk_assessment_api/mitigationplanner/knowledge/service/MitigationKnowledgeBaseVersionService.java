package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAction;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionConflict;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionDependency;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationActionEstimate;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationAttributeMapping;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationParameterDefinition;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationQuestionMapping;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.PlanSelectionPolicyDefinition;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository.MitigationKnowledgeBaseRepository;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository.MitigationKnowledgeBaseVersionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Predicate;

@Service
@Transactional
@RequiredArgsConstructor
public class MitigationKnowledgeBaseVersionService {

    private final MitigationKnowledgeBaseRepository knowledgeBaseRepository;
    private final MitigationKnowledgeBaseVersionRepository versionRepository;

    @Transactional(readOnly = true)
    public MitigationKnowledgeBaseVersion getCurrentVersion(MitigationKnowledgeBase knowledgeBase) {
        return knowledgeBase.getCurrentVersionEntity()
                .or(() -> versionRepository.findTopByKnowledgeBaseIdOrderByVersionNumberDesc(knowledgeBase.getId()))
                .orElseThrow(() -> new IllegalStateException(
                        "Mitigation Knowledge Base has no versions: " + knowledgeBase.getId()));
    }

    @Transactional(readOnly = true)
    public MitigationKnowledgeBaseVersion getCurrentVersion(Long knowledgeBaseId) {
        MitigationKnowledgeBase knowledgeBase = knowledgeBaseRepository.findById(knowledgeBaseId)
                .orElseThrow(() -> new EntityNotFoundException("Mitigation Knowledge Base not found: " + knowledgeBaseId));
        return getCurrentVersion(knowledgeBase);
    }

    @Transactional(readOnly = true)
    public MitigationKnowledgeBaseVersion getHistoricalVersion(Long knowledgeBaseId, int versionNumber) {
        return versionRepository.findByKnowledgeBaseIdAndVersionNumber(knowledgeBaseId, versionNumber)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Mitigation Knowledge Base version not found: " + knowledgeBaseId + " v" + versionNumber));
    }

    @Transactional(readOnly = true)
    public MitigationKnowledgeBaseVersion resolveExactVersion(
            Long knowledgeBaseId,
            Long knowledgeBaseVersionId,
            Integer versionNumber
    ) {
        MitigationKnowledgeBaseVersion version = versionRepository.findById(knowledgeBaseVersionId)
                .orElseThrow(() -> new EntityNotFoundException(
                        "Mitigation Knowledge Base version not found: " + knowledgeBaseVersionId));
        if (!Objects.equals(version.getKnowledgeBase().getId(), knowledgeBaseId)) {
            throw new IllegalArgumentException("Knowledge Base version does not belong to the requested Knowledge Base.");
        }
        if (versionNumber != null && version.getVersionNumber() != versionNumber) {
            throw new IllegalArgumentException("Knowledge Base version number does not match the requested version.");
        }
        return version;
    }

    public MitigationKnowledgeBaseVersion copyCurrentVersionForNext(
            MitigationKnowledgeBase knowledgeBase,
            String username
    ) {
        MitigationKnowledgeBaseVersion source = getCurrentVersion(knowledgeBase);
        return copyVersion(source, username, knowledgeBase.getCurrentVersion() + 1);
    }

    public MitigationKnowledgeBaseVersion copyVersion(
            MitigationKnowledgeBaseVersion source,
            String username,
            int versionNumber
    ) {
        return copyVersion(source, username, versionNumber, action -> true);
    }

    public MitigationKnowledgeBaseVersion copyVersionExcludingAction(
            MitigationKnowledgeBaseVersion source,
            String username,
            int versionNumber,
            String excludedActionCode
    ) {
        String excluded = normalizeCode(excludedActionCode);
        return copyVersion(source, username, versionNumber,
                action -> !Objects.equals(normalizeCode(action.getCode()), excluded));
    }

    public MitigationKnowledgeBaseVersion appendVersion(
            MitigationKnowledgeBase knowledgeBase,
            MitigationKnowledgeBaseVersion version
    ) {
        rebuildVersionIndexes(version);
        knowledgeBase.addVersion(version);
        knowledgeBaseRepository.saveAndFlush(knowledgeBase);
        return version;
    }

    public void rebuildVersionIndexes(MitigationKnowledgeBaseVersion version) {
        version.getQuestionMappings().clear();
        version.getAttributeMappings().clear();
        version.getParameterDefinitions().clear();
        version.getEstimates().clear();
        for (MitigationAction action : version.getActions()) {
            action.setKnowledgeBaseVersion(version);
            for (MitigationQuestionMapping mapping : action.getQuestionMappings()) {
                mapping.setMitigationAction(action);
                mapping.setKnowledgeBaseVersion(version);
                version.getQuestionMappings().add(mapping);
            }
            for (MitigationAttributeMapping mapping : action.getAttributeMappings()) {
                mapping.setMitigationAction(action);
                mapping.setKnowledgeBaseVersion(version);
                version.getAttributeMappings().add(mapping);
            }
            for (MitigationParameterDefinition parameter : action.getParameterDefinitions()) {
                parameter.setMitigationAction(action);
                parameter.setKnowledgeBaseVersion(version);
                version.getParameterDefinitions().add(parameter);
            }
            if (action.getEstimate() != null) {
                action.getEstimate().setMitigationAction(action);
                action.getEstimate().setKnowledgeBaseVersion(version);
                version.getEstimates().add(action.getEstimate());
            }
        }
        version.getDependencies().forEach(dependency -> dependency.setKnowledgeBaseVersion(version));
        version.getConflicts().forEach(conflict -> conflict.setKnowledgeBaseVersion(version));
        if (version.getSelectionPolicy() != null) {
            version.getSelectionPolicy().setKnowledgeBaseVersion(version);
        }
    }

    private MitigationKnowledgeBaseVersion copyVersion(
            MitigationKnowledgeBaseVersion source,
            String username,
            int versionNumber,
            Predicate<MitigationAction> includeAction
    ) {
        MitigationKnowledgeBaseVersion target = new MitigationKnowledgeBaseVersion();
        target.setCreatorUsername(username);
        target.setName(source.getName());
        target.setDescription(source.getDescription());
        target.setVersionNumber(versionNumber);

        Map<String, MitigationAction> copiedByCode = new LinkedHashMap<>();
        for (MitigationAction action : source.getActions()) {
            if (!includeAction.test(action)) {
                continue;
            }
            MitigationAction copy = copyAction(action, username);
            target.addAction(copy);
            copiedByCode.put(normalizeCode(copy.getCode()), copy);
        }

        for (MitigationActionDependency dependency : source.getDependencies()) {
            MitigationAction action = copiedByCode.get(normalizeCode(dependency.getAction().getCode()));
            MitigationAction required = copiedByCode.get(normalizeCode(dependency.getRequiredAction().getCode()));
            if (action == null || required == null) {
                continue;
            }
            MitigationActionDependency copy = new MitigationActionDependency();
            copy.setAction(action);
            copy.setRequiredAction(required);
            copy.setRationale(dependency.getRationale());
            copy.setSource(dependency.getSource());
            target.addDependency(copy);
        }

        for (MitigationActionConflict conflict : source.getConflicts()) {
            MitigationAction actionA = copiedByCode.get(normalizeCode(conflict.getActionA().getCode()));
            MitigationAction actionB = copiedByCode.get(normalizeCode(conflict.getActionB().getCode()));
            if (actionA == null || actionB == null) {
                continue;
            }
            MitigationActionConflict copy = new MitigationActionConflict();
            copy.setActionA(actionA);
            copy.setActionB(actionB);
            copy.setRationale(conflict.getRationale());
            copy.setSource(conflict.getSource());
            target.addConflict(copy);
        }

        target.setSelectionPolicy(copyPolicy(source.getSelectionPolicy()));
        return target;
    }

    private MitigationAction copyAction(MitigationAction source, String username) {
        MitigationAction copy = new MitigationAction();
        copy.setCreatorUsername(username);
        copy.setCode(source.getCode());
        copy.setName(source.getName());
        copy.setDescription(source.getDescription());
        copy.setActionType(source.getActionType());
        copy.setActive(source.isActive());
        copy.setImplementationDescription(source.getImplementationDescription());
        copy.setVerificationDescription(source.getVerificationDescription());
        copy.setSource(source.getSource());
        copy.setRationale(source.getRationale());
        copy.setResultingDataForm(source.getResultingDataForm());
        copy.setRecordRetentionEffect(source.getRecordRetentionEffect());
        copy.setApplicableSharingArrangements(new java.util.LinkedHashSet<>(source.getApplicableSharingArrangements()));
        if (source.getEstimate() != null) {
            copy.setEstimate(copyEstimate(source.getEstimate()));
        }
        for (MitigationQuestionMapping mapping : source.getQuestionMappings()) {
            copy.addQuestionMapping(copyQuestionMapping(mapping));
        }
        for (MitigationAttributeMapping mapping : source.getAttributeMappings()) {
            copy.addAttributeMapping(copyAttributeMapping(mapping));
        }
        for (MitigationParameterDefinition parameter : source.getParameterDefinitions()) {
            copy.addParameterDefinition(copyParameterDefinition(parameter));
        }
        return copy;
    }

    private MitigationQuestionMapping copyQuestionMapping(MitigationQuestionMapping source) {
        MitigationQuestionMapping copy = new MitigationQuestionMapping();
        copy.setConfiguration(source.getConfiguration());
        copy.setAssessmentScope(source.getAssessmentScope());
        copy.setCategoryCode(source.getCategoryCode());
        copy.setQuestionCode(source.getQuestionCode());
        copy.setTriggerOptionCode(source.getTriggerOptionCode());
        copy.setProjectedOptionCode(source.getProjectedOptionCode());
        copy.setNotes(source.getNotes());
        return copy;
    }

    private MitigationAttributeMapping copyAttributeMapping(MitigationAttributeMapping source) {
        MitigationAttributeMapping copy = new MitigationAttributeMapping();
        copy.setAttributeRole(source.getAttributeRole());
        copy.setDataType(source.getDataType());
        copy.setRequiresCandidateQid(source.isRequiresCandidateQid());
        copy.setRequiresDirectIdentifier(source.isRequiresDirectIdentifier());
        copy.setRequiresSensitiveAttribute(source.isRequiresSensitiveAttribute());
        copy.setNotes(source.getNotes());
        return copy;
    }

    private MitigationParameterDefinition copyParameterDefinition(MitigationParameterDefinition source) {
        MitigationParameterDefinition copy = new MitigationParameterDefinition();
        copy.setParameterCode(source.getParameterCode());
        copy.setDescription(source.getDescription());
        copy.setAllowedValues(new java.util.ArrayList<>(source.getAllowedValues()));
        return copy;
    }

    private MitigationActionEstimate copyEstimate(MitigationActionEstimate source) {
        MitigationActionEstimate copy = new MitigationActionEstimate();
        copy.setEstimatedCostMin(source.getEstimatedCostMin());
        copy.setEstimatedCostMax(source.getEstimatedCostMax());
        copy.setCurrency(source.getCurrency());
        copy.setEstimatedSetupDaysMin(source.getEstimatedSetupDaysMin());
        copy.setEstimatedSetupDaysMax(source.getEstimatedSetupDaysMax());
        copy.setEstimateScope(source.getEstimateScope());
        copy.setSource(source.getSource());
        copy.setAssumptions(source.getAssumptions());
        return copy;
    }

    private PlanSelectionPolicyDefinition copyPolicy(PlanSelectionPolicyDefinition source) {
        PlanSelectionPolicyDefinition copy = new PlanSelectionPolicyDefinition();
        if (source == null) {
            copy.setPolicyCode(PlanSelectionPolicyDefinition.DEFAULT_CONSERVATIVE);
            copy.setPolicyName("Default conservative");
            copy.setDescription("Deterministic conservative selection policy for feasible evaluated mitigation plans.");
            copy.setEnabledCriteria(defaultPolicyCriteria());
            return copy;
        }
        copy.setPolicyCode(source.getPolicyCode());
        copy.setPolicyName(source.getPolicyName());
        copy.setDescription(source.getDescription());
        copy.setEnabledCriteria(new java.util.ArrayList<>(source.getEnabledCriteria()));
        return copy;
    }

    public PlanSelectionPolicyDefinition defaultPolicyDefinition() {
        PlanSelectionPolicyDefinition policy = new PlanSelectionPolicyDefinition();
        policy.setPolicyCode(PlanSelectionPolicyDefinition.DEFAULT_CONSERVATIVE);
        policy.setPolicyName("Default conservative");
        policy.setDescription("Deterministically prefer feasible plans with critical/high driver coverage, fewer unresolved checks, fewer actions, and lower known operational burden.");
        policy.setEnabledCriteria(defaultPolicyCriteria());
        return policy;
    }

    private java.util.List<String> defaultPolicyCriteria() {
        return java.util.List.of(
                "REJECT_INVALID",
                "REJECT_INCOMPATIBLE",
                "COVER_ACTIONABLE_CRITICAL_DRIVERS",
                "PREFER_HIGH_DRIVER_COVERAGE",
                "PREFER_FEWER_UNRESOLVED_PROJECT_CHECKS",
                "PREFER_FEWER_ACTIONS",
                "PREFER_LOWER_KNOWN_COST",
                "PREFER_SHORTER_KNOWN_SETUP_TIME",
                "STABLE_ACTION_CODE_TIE_BREAK"
        );
    }

    private String normalizeCode(String value) {
        return value == null ? null : value.trim().toUpperCase(java.util.Locale.ROOT);
    }
}
