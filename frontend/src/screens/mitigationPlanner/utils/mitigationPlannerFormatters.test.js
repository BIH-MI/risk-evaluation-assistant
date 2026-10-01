import {
  formatPlanCost,
  formatPlanStatus,
  formatUnchangedMatrixPosition,
  planStatusHelp,
} from "./mitigationPlannerFormatters";

describe("formatUnchangedMatrixPosition", () => {
  it("explains every context category, not only the one held by a trigger", () => {
    // Commercial SPHN demo: audit rights raise Controls within HIGH, C-03/C-06 keep Likelihood HIGH.
    const text = formatUnchangedMatrixPosition([
      { categoryCode: "CONTROLS", baselineBand: "HIGH", projectedBand: "HIGH", reason: "SAME_SCORE_BAND" },
      {
        categoryCode: "LIKELIHOOD",
        baselineBand: "HIGH",
        projectedBand: "HIGH",
        reason: "HIGH_RISK_TRIGGERS_REMAIN",
        remainingHighRiskTriggerCount: 2,
      },
    ]);

    expect(text).toContain("Context-risk matrix position unchanged.");
    expect(text).toContain("stays in the same configured Controls band (HIGH)");
    expect(text).toContain("Likelihood remains HIGH because 2 high-risk-trigger responses are still active");
  });

  it("falls back to a neutral explanation without outcomes", () => {
    expect(formatUnchangedMatrixPosition([])).toContain("same configured risk bands");
  });
});

describe("plan status wording", () => {
  it("never presents a reviewable plan as safe or approved", () => {
    expect(formatPlanStatus("READY_FOR_REVIEW")).toBe("Ready for review");
    expect(planStatusHelp("READY_FOR_REVIEW")).toContain("not a statement that sharing is safe");
  });
});

describe("formatPlanCost", () => {
  it("never renders a missing or partial estimate as zero", () => {
    expect(formatPlanCost({ availability: "UNKNOWN" })).toBe("Unknown");
    expect(formatPlanCost({ availability: "PARTIAL", min: 0, max: 0 })).toBe("Incomplete estimate");
    expect(formatPlanCost({ availability: "KNOWN", min: 1000, max: 4000, currency: "EUR" })).toContain("EUR");
  });
});
