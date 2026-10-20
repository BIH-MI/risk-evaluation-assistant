package org.bihealth.mi.risk_assessment_api.model.qid;

import java.util.List;

/**
 * AI-assisted direct-identifier screening settings that apply when a QID
 * discovery configuration version stores none: versions created before AI
 * screening became configurable, and requests without an aiScreening object.
 * They reproduce the earlier behaviour (screening with DeBERTaV3-XSmall). Model ids are ids of the AI model registry
 * (frontend/src/qidDiscovery/aiSuggestions/modelRegistry.json).
 */
public final class QidDiscoveryAiScreeningDefaults {

    public static final String DEFAULT_MODEL_ID = "deberta-v3-xsmall";
    public static final boolean ENABLED = true;
    public static final List<String> ALLOWED_MODEL_IDS = List.of(DEFAULT_MODEL_ID);

    private QidDiscoveryAiScreeningDefaults() {
    }
}
