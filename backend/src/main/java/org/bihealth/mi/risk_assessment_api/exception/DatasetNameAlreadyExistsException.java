package org.bihealth.mi.risk_assessment_api.exception;

import org.bihealth.mi.risk_assessment_api.model.NamedResourceConstraints;

public class DatasetNameAlreadyExistsException extends EntityNameAlreadyExistsException {

    public static final String CODE = "DATASET_NAME_ALREADY_EXISTS";
    public static final String DATASET_NAME_UNIQUE_CONSTRAINT = NamedResourceConstraints.DATASETS_NORMALIZED_NAME;

    public DatasetNameAlreadyExistsException(String datasetName) {
        super(CODE, "dataset", datasetName);
    }

    public String getDatasetName() {
        return getEntityName();
    }
}
