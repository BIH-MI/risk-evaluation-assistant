package org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.bihealth.mi.risk_assessment_api.exception.EntityNameAlreadyExistsException;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBase;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.model.MitigationKnowledgeBaseVersion;
import org.bihealth.mi.risk_assessment_api.mitigationplanner.knowledge.repository.MitigationKnowledgeBaseRepository;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class MitigationKnowledgeBaseService {

    private final MitigationKnowledgeBaseRepository knowledgeBaseRepository;
    private final MitigationKnowledgeBaseVersionService versionService;

    @Transactional(readOnly = true)
    public List<MitigationKnowledgeBase> listKnowledgeBases(boolean activeOnly, boolean isAdmin) {
        List<MitigationKnowledgeBase> knowledgeBases = activeOnly || !isAdmin
                ? knowledgeBaseRepository.findByActiveTrue()
                : knowledgeBaseRepository.findAllByOrderByLastModifiedDateDesc();
        return knowledgeBases.stream()
                .sorted(Comparator.comparing(MitigationKnowledgeBase::isDefaultKnowledgeBase, Comparator.reverseOrder())
                        .thenComparing(MitigationKnowledgeBase::isActive, Comparator.reverseOrder())
                        .thenComparing(kb -> kb.getLastModifiedDate() == null
                                ? kb.getCreationDate()
                                : kb.getLastModifiedDate(), Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MitigationKnowledgeBase getKnowledgeBase(Long id, boolean isAdmin) {
        MitigationKnowledgeBase knowledgeBase = knowledgeBaseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mitigation Knowledge Base not found: " + id));
        if (!isAdmin && !knowledgeBase.isActive()) {
            throw new EntityNotFoundException("Mitigation Knowledge Base not found: " + id);
        }
        return knowledgeBase;
    }

    public MitigationKnowledgeBase createKnowledgeBase(
            String name,
            String description,
            Boolean active,
            Boolean defaultKnowledgeBase,
            String username,
            boolean isAdmin
    ) {
        requireAdmin(isAdmin);
        validateUniqueName(name, null);

        MitigationKnowledgeBase knowledgeBase = new MitigationKnowledgeBase();
        knowledgeBase.setCreatorUsername(username);
        knowledgeBase.setName(requiredName(name));
        knowledgeBase.setDescription(trimToNull(description));
        knowledgeBase.setActive(active == null || active);
        knowledgeBase.setDefaultKnowledgeBase(Boolean.TRUE.equals(defaultKnowledgeBase));
        if (knowledgeBase.isDefaultKnowledgeBase() && !knowledgeBase.isActive()) {
            throw new IllegalArgumentException("The default mitigation Knowledge Base must be active.");
        }

        MitigationKnowledgeBaseVersion version = new MitigationKnowledgeBaseVersion();
        version.setCreatorUsername(username);
        version.setName(knowledgeBase.getName());
        version.setDescription(knowledgeBase.getDescription());
        version.setVersionNumber(1);
        version.setSelectionPolicy(versionService.defaultPolicyDefinition());
        knowledgeBase.addVersion(version);

        if (knowledgeBase.isDefaultKnowledgeBase()) {
            clearOtherDefaults(null);
        }
        return knowledgeBaseRepository.saveAndFlush(knowledgeBase);
    }

    public MitigationKnowledgeBase updateKnowledgeBase(
            Long id,
            String name,
            String description,
            Boolean active,
            Boolean defaultKnowledgeBase,
            boolean isAdmin
    ) {
        requireAdmin(isAdmin);
        MitigationKnowledgeBase knowledgeBase = knowledgeBaseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mitigation Knowledge Base not found: " + id));
        validateUniqueName(name, id);

        boolean nextActive = active == null || active;
        boolean nextDefault = Boolean.TRUE.equals(defaultKnowledgeBase);
        if (nextDefault && !nextActive) {
            throw new IllegalArgumentException("The default mitigation Knowledge Base must be active.");
        }

        knowledgeBase.setName(requiredName(name));
        knowledgeBase.setDescription(trimToNull(description));
        knowledgeBase.setActive(nextActive);
        knowledgeBase.setDefaultKnowledgeBase(nextActive && nextDefault);
        if (knowledgeBase.isDefaultKnowledgeBase()) {
            clearOtherDefaults(knowledgeBase.getId());
        }
        return knowledgeBaseRepository.saveAndFlush(knowledgeBase);
    }

    public MitigationKnowledgeBase archiveKnowledgeBase(Long id, boolean isAdmin) {
        requireAdmin(isAdmin);
        MitigationKnowledgeBase knowledgeBase = knowledgeBaseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mitigation Knowledge Base not found: " + id));
        knowledgeBase.setActive(false);
        knowledgeBase.setDefaultKnowledgeBase(false);
        return knowledgeBaseRepository.save(knowledgeBase);
    }

    public MitigationKnowledgeBase setDefaultKnowledgeBase(Long id, boolean isAdmin) {
        requireAdmin(isAdmin);
        MitigationKnowledgeBase knowledgeBase = knowledgeBaseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Mitigation Knowledge Base not found: " + id));
        if (!knowledgeBase.isActive()) {
            throw new IllegalArgumentException("Archived mitigation Knowledge Bases cannot be set as default.");
        }
        clearOtherDefaults(knowledgeBase.getId());
        knowledgeBase.setDefaultKnowledgeBase(true);
        return knowledgeBaseRepository.save(knowledgeBase);
    }

    public MitigationKnowledgeBase forkKnowledgeBase(
            Long sourceId,
            String requestedName,
            String requestedDescription,
            String username,
            boolean isAdmin
    ) {
        requireAdmin(isAdmin);
        MitigationKnowledgeBase source = knowledgeBaseRepository.findById(sourceId)
                .orElseThrow(() -> new EntityNotFoundException("Mitigation Knowledge Base not found: " + sourceId));
        MitigationKnowledgeBaseVersion sourceVersion = versionService.getCurrentVersion(source);

        String name = uniqueForkName(requestedName == null || requestedName.trim().isEmpty()
                ? source.getName() + " Fork"
                : requestedName);

        MitigationKnowledgeBase fork = new MitigationKnowledgeBase();
        fork.setCreatorUsername(username);
        fork.setName(name);
        fork.setDescription(trimToNull(requestedDescription) == null
                ? source.getDescription()
                : trimToNull(requestedDescription));
        fork.setActive(true);
        fork.setDefaultKnowledgeBase(false);

        MitigationKnowledgeBaseVersion forkVersion = versionService.copyVersion(sourceVersion, username, 1);
        forkVersion.setName(fork.getName());
        forkVersion.setDescription(fork.getDescription());
        fork.addVersion(forkVersion);
        return knowledgeBaseRepository.saveAndFlush(fork);
    }

    @Transactional(readOnly = true)
    public MitigationKnowledgeBase resolveDefaultActiveKnowledgeBase() {
        return knowledgeBaseRepository.findFirstByDefaultKnowledgeBaseTrueAndActiveTrueOrderByIdAsc()
                .orElseThrow(() -> new IllegalStateException(
                        "No default active mitigation Knowledge Base is configured."));
    }

    @Transactional(readOnly = true)
    public MitigationKnowledgeBase resolveKnowledgeBaseForPlanning(Long knowledgeBaseId) {
        MitigationKnowledgeBase knowledgeBase = knowledgeBaseId == null
                ? resolveDefaultActiveKnowledgeBase()
                : knowledgeBaseRepository.findById(knowledgeBaseId)
                .orElseThrow(() -> new EntityNotFoundException("Mitigation Knowledge Base not found: " + knowledgeBaseId));
        if (!knowledgeBase.isActive()) {
            throw new IllegalArgumentException("Archived mitigation Knowledge Bases cannot be selected for planning.");
        }
        return knowledgeBase;
    }

    private void clearOtherDefaults(Long excludeId) {
        knowledgeBaseRepository.findAll().stream()
                .filter(kb -> excludeId == null || !Objects.equals(kb.getId(), excludeId))
                .filter(MitigationKnowledgeBase::isDefaultKnowledgeBase)
                .forEach(kb -> {
                    kb.setDefaultKnowledgeBase(false);
                    knowledgeBaseRepository.save(kb);
                });
    }

    private void validateUniqueName(String rawName, Long excludeId) {
        String name = requiredName(rawName);
        String normalized = EntityNameNormalizer.normalizeForComparison(name);
        boolean exists = excludeId == null
                ? knowledgeBaseRepository.existsByNormalizedName(normalized)
                : knowledgeBaseRepository.existsByNormalizedNameAndIdNot(normalized, excludeId);
        if (exists) {
            throw new EntityNameAlreadyExistsException("mitigation Knowledge Base", name);
        }
    }

    private String uniqueForkName(String baseName) {
        String cleanedBase = requiredName(baseName);
        if (!knowledgeBaseRepository.existsByNormalizedName(EntityNameNormalizer.normalizeForComparison(cleanedBase))) {
            return cleanedBase;
        }

        int copyNumber = 2;
        while (true) {
            String candidate = cleanedBase + " " + copyNumber;
            if (!knowledgeBaseRepository.existsByNormalizedName(EntityNameNormalizer.normalizeForComparison(candidate))) {
                return candidate;
            }
            copyNumber++;
        }
    }

    private String requiredName(String value) {
        String name = EntityNameNormalizer.normalizeForStorage(value);
        if (name == null || name.isEmpty()) {
            throw new IllegalArgumentException("Name is required.");
        }
        return name;
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private void requireAdmin(boolean isAdmin) {
        if (!isAdmin) {
            throw new SecurityException("Only administrators can modify mitigation Knowledge Bases.");
        }
    }
}
