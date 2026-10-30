package org.bihealth.mi.risk_assessment_api.enums;

/**
 * The coarsest date precision an analysis can still work with. For example, MONTH means dates may
 * be generalized to months but not to years.
 */
public enum TemporalResolution {
    DAY(DateResolution.DAY),
    MONTH(DateResolution.MONTH),
    QUARTER(DateResolution.QUARTER),
    YEAR(DateResolution.YEAR),
    NOT_REQUIRED(null);

    private final DateResolution coarsestAcceptable;

    TemporalResolution(DateResolution coarsestAcceptable) {
        this.coarsestAcceptable = coarsestAcceptable;
    }

    /** The coarsest acceptable date resolution, or null when temporal precision does not matter. */
    public DateResolution coarsestAcceptable() {
        return coarsestAcceptable;
    }
}
