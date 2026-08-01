package org.bihealth.mi.risk_assessment_api.repository.locks;

import org.bihealth.mi.risk_assessment_api.model.lock.EntityLock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.time.Instant;

public interface EntityLockRepository extends JpaRepository<EntityLock, Long> {
    Optional<EntityLock> findByEntityTypeAndEntityId(String type, String id);
    void deleteByExpiresAtBefore(Instant cutoff);
}