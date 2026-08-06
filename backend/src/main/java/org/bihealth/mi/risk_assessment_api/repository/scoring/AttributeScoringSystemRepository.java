package org.bihealth.mi.risk_assessment_api.repository.scoring;

import org.bihealth.mi.risk_assessment_api.model.scoring.AttributeScoringSystem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttributeScoringSystemRepository extends JpaRepository<AttributeScoringSystem, Long> {
    List<AttributeScoringSystem> findByActiveTrue();
    List<AttributeScoringSystem> findAllByOrderByLastModifiedDateDesc();
    Optional<AttributeScoringSystem> findFirstByDefaultSystemTrueAndActiveTrueOrderByIdAsc();
    Optional<AttributeScoringSystem> findFirstByActiveTrueOrderByIdAsc();
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
