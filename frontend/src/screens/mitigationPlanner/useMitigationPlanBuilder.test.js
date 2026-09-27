import { customPlanIssues, defaultParameterChoices } from "./useMitigationPlanBuilder";

const coarsenDate = (compatibilities) => ({
  actionId: 1,
  actionName: "Coarsen temporal information",
  parameters: [
    {
      parameterCode: "TARGET_RESOLUTION",
      allowedValues: Object.entries(compatibilities).map(([value, compatibility]) => ({ value, compatibility })),
    },
  ],
});
const contextControl = { actionId: 2, actionName: "Prohibit onward disclosure", parameters: [] };

describe("Custom Plan completeness", () => {
  test("pre-selects a value only when exactly one value is known-compatible", () => {
    expect(defaultParameterChoices(coarsenDate({ MONTH: "COMPATIBLE", QUARTER: "INCOMPATIBLE" }))).toEqual({
      TARGET_RESOLUTION: "MONTH",
    });
    expect(defaultParameterChoices(coarsenDate({ MONTH: "COMPATIBLE", QUARTER: "COMPATIBLE" }))).toEqual({});
    expect(defaultParameterChoices(coarsenDate({ MONTH: "EVALUATION_REQUIRED" }))).toEqual({});
  });

  test("a missing required parameter names the action and blocks evaluation", () => {
    const actions = new Map([[1, coarsenDate({ MONTH: "COMPATIBLE", QUARTER: "COMPATIBLE" })]]);
    const issues = customPlanIssues([1], {}, actions);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("Coarsen temporal information");
  });

  test("an incompatible value is rejected", () => {
    const actions = new Map([[1, coarsenDate({ MONTH: "COMPATIBLE", YEAR: "INCOMPATIBLE" })]]);
    expect(customPlanIssues([1], { 1: { TARGET_RESOLUTION: "YEAR" } }, actions)[0].message).toContain("incompatible");
  });

  test("a context-only Custom Plan never requires a target resolution", () => {
    expect(customPlanIssues([2], {}, new Map([[2, contextControl]]))).toEqual([]);
  });

  test("parameters without allowed values stay unresolved by design", () => {
    const hierarchy = {
      actionId: 3,
      actionName: "Generalize numeric quasi-identifier",
      parameters: [{ parameterCode: "GENERALIZATION_HIERARCHY", allowedValues: [] }],
    };
    expect(customPlanIssues([3], {}, new Map([[3, hierarchy]]))).toEqual([]);
  });
});
