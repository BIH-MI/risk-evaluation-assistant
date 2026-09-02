import { ATTRIBUTE_DIMENSIONS } from "./attributeScoringSystemConstants";
import {
  buildAttributeScoringSystemPayload,
  sortScoreOptionsByValue,
  validateDimensionScoreOptions,
} from "./attributeScoringSystemFormUtils";

function createFormWithOptions(scoreOptions) {
  return {
    id: 10,
    name: " Custom Scoring ",
    description: "",
    active: true,
    defaultSystem: false,
    defaultIdentifiabilityThreshold: "3",
    defaultSensitivityThreshold: "1",
    scoreOptions: ATTRIBUTE_DIMENSIONS.reduce(
      (optionsByDimension, dimension) => {
        optionsByDimension[dimension.key] = scoreOptions[dimension.key] || [
          { clientId: `${dimension.key}-low`, label: "Low", value: "0" },
          { clientId: `${dimension.key}-high`, label: "High", value: "1" },
        ];
        return optionsByDimension;
      },
      {}
    ),
  };
}

describe("attribute scoring system form utils", () => {
  it("sorts score options by numeric value without mutating the input", () => {
    const options = [
      { clientId: "low", label: "Low", value: "2" },
      { clientId: "invalid", label: "Moderate", value: "abc" },
      { clientId: "high", label: "High", value: "1" },
      { clientId: "critical", label: "Critical", value: "1" },
    ];

    const sorted = sortScoreOptionsByValue(options);

    expect(sorted.map((option) => option.clientId)).toEqual([
      "high",
      "critical",
      "low",
      "invalid",
    ]);
    expect(options.map((option) => option.clientId)).toEqual([
      "low",
      "invalid",
      "high",
      "critical",
    ]);
  });

  it("validates minimum option count, nonnegative values, and duplicate values", () => {
    expect(
      validateDimensionScoreOptions([{ label: "Low", value: "0" }])
        .dimensionError
    ).toBe("At least two score options are required.");

    expect(
      validateDimensionScoreOptions([
        { label: "Low", value: "-2" },
        { label: "Moderate", value: "1" },
      ]).rowErrors[0].value
    ).toBe("Score value cannot be negative.");

    expect(
      validateDimensionScoreOptions([
        { label: "Low", value: "1" },
        { label: "Moderate", value: "1" },
      ]).rowErrors[1].value
    ).toBe("Score value must be unique in this dimension.");
  });

  it("serializes displayOrder from numeric score order", () => {
    const payload = buildAttributeScoringSystemPayload(
      createFormWithOptions({
        replicability: [
          { clientId: "low", id: 1, label: "Low", value: "2" },
          { clientId: "moderate", id: 2, label: "Moderate", value: "1" },
          { clientId: "high", id: 3, label: "High", value: "3" },
        ],
      })
    );

    expect(payload.scoreOptions.replicability).toEqual([
      {
        id: 2,
        label: "Moderate",
        value: 1,
        description: null,
        displayOrder: 1,
      },
      {
        id: 1,
        label: "Low",
        value: 2,
        description: null,
        displayOrder: 2,
      },
      {
        id: 3,
        label: "High",
        value: 3,
        description: null,
        displayOrder: 3,
      },
    ]);
  });
});
