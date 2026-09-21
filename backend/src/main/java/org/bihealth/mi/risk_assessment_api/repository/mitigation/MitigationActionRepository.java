package org.bihealth.mi.risk_assessment_api.repository.mitigation;

import org.bihealth.mi.risk_assessment_api.enums.MitigationActionType;
import org.bihealth.mi.risk_assessment_api.model.mitigation.MitigationAction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MitigationActionRepository extends JpaRepository<MitigationAction, Long> {
    Optional<MitigationAction> findByCode(String code);
    boolean existsByCode(String code);
    boolean existsByCodeAndIdNot(String code, Long id);
    List<MitigationAction> findByActionType(MitigationActionType actionType);
    List<MitigationAction> findByActiveTrue();
    List<MitigationAction> findByActionTypeAndActiveTrue(MitigationActionType actionType);
}
