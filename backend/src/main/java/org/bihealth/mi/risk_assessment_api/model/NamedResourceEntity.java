package org.bihealth.mi.risk_assessment_api.model;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.Getter;
import lombok.Setter;
import org.bihealth.mi.risk_assessment_api.utils.EntityNameNormalizer;

/**
 * Base class for top-level resources whose display name is globally unique.
 */
@Getter
@Setter
@MappedSuperclass
public abstract class NamedResourceEntity extends AuditableEntity {

    @Column(name = "normalized_name")
    private String normalizedName;

    @Override
    public void setName(String name) {
        String storageName = EntityNameNormalizer.normalizeForStorage(name);
        super.setName(storageName);
        this.normalizedName = EntityNameNormalizer.normalizeForComparison(storageName);
    }

    @PrePersist
    @PreUpdate
    protected void refreshNormalizedName() {
        setName(getName());
    }
}
