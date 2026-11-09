package org.bihealth.mi.risk_assessment_api.model.activity;

import com.fasterxml.jackson.annotation.JsonCreator;

/** Describes who can receive the data; independent of the REA risk calculation. */
public enum ReleaseModel {
    NON_PUBLIC,
    SEMI_PUBLIC,
    PUBLIC;

    @JsonCreator
    public static ReleaseModel fromValue(String value) {
        return value == null ? null : ReleaseModel.valueOf(value);
    }
}
