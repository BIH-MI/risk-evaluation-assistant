package org.bihealth.mi.risk_assessment_api.enums;

public enum MitigationSharingArrangement {
    PUBLIC_RELEASE,
    @Deprecated
    CONTROLLED_TRANSFER,
    CONTROLLED_DATA_TRANSFER,
    SECURE_REMOTE_ANALYSIS,
    MANAGED_QUERY;

    public MitigationSharingArrangement canonical() {
        return this == CONTROLLED_TRANSFER ? CONTROLLED_DATA_TRANSFER : this;
    }
}
