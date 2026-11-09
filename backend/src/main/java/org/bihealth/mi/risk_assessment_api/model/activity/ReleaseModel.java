package org.bihealth.mi.risk_assessment_api.model.activity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum ReleaseModel {
    NON_PUBLIC,
    SEMI_PUBLIC,
    PUBLIC;

    @JsonCreator
    public static ReleaseModel fromValue(String value) {
        return value == null ? null : ReleaseModel.valueOf(value);
    }
}
