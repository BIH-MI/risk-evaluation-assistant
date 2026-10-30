import i18next from "i18next";

import en from "locales/en/translation.json";
import {
  REQUIREMENT_GROUPS,
  formatPlanCost,
  formatPlanStatus,
  formatRequirementValue,
  formatUnchangedMatrixPosition,
  planStatusHelp,
} from "./mitigationPlannerFormatters";

describe("formatRequirementValue", () => {
  let t;

  beforeAll(async () => {
    const i18n = i18next.createInstance();
    await i18n.init({ lng: "en", resources: { en: { translation: en } } });
    t = i18n.t.bind(i18n);
  });

  const requirements = {
    maximumSetupTimeDays: 30,
    availableBudget: 5000,
    budgetCurrency: "EUR",
    requiredTemporalResolution: null,
    minimumCohortRetentionPercent: 90.5,
    analysisDataNeeded: ["INDIVIDUAL_LEVEL_DATA", "SYNTHETIC_DATA"],
    requiredExternalDeliverables: [],
    sharingArrangement: "SECURE_REMOTE_ANALYSIS",
  };
  const format = (requirement, values = requirements) => formatRequirementValue(requirement, values, t);

  it("formats days, money, percentages, options and option lists", () => {
    expect(format("maximumSetupTimeDays")).toBe("30 days");
    expect(format("maximumSetupTimeDays", { maximumSetupTimeDays: 1 })).toBe("1 day");
    expect(format("availableBudget")).toBe(`EUR ${(5000).toLocaleString()}`);
    expect(format("minimumCohortRetentionPercent")).toBe("90.5%");
    expect(format("sharingArrangement")).toBe("Secure remote analysis");
    expect(format("analysisDataNeeded")).toBe("Individual-level data, Synthetic data");
  });

  it("leaves unspecified requirements empty instead of showing zero", () => {
    expect(format("requiredTemporalResolution")).toBe("");
    expect(format("requiredExternalDeliverables")).toBe("");
    expect(format("availableBudget", null)).toBe("");
  });

  it("falls back to a readable label for an unknown option code", () => {
    expect(format("sharingArrangement", { sharingArrangement: "CONTROLLED_TRANSFER" })).toBe(
      "Controlled Transfer"
    );
  });

  it("groups only requirements that have a translated label", () => {
    REQUIREMENT_GROUPS.flatMap((group) => group.keys).forEach((requirement) => {
      expect(en.activityRequirements.fields[requirement]).toEqual(expect.any(String));
    });
  });
});

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
