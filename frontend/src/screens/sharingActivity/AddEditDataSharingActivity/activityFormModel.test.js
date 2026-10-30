import {
  EMPTY_ACTIVITY_FORM_VALUES,
  activityToFormValues,
  assessmentsForResource,
  selectDataset,
  selectRecipient,
  buildDataSharingActivityPayload,
  validateActivityForm,
} from "./activityFormModel";

const validValues = {
  ...EMPTY_ACTIVITY_FORM_VALUES,
  name: "Registry export",
  datasetAssessmentId: "3",
  recipientAssessmentId: "7",
};

describe("validateActivityForm", () => {
  it("requires a name and both assessments", () => {
    expect(validateActivityForm(EMPTY_ACTIVITY_FORM_VALUES)).toEqual({
      name: "dataSharingActivities.validation.nameRequired",
      datasetAssessmentId:
        "dataSharingActivities.validation.datasetAssessmentRequired",
      recipientAssessmentId:
        "dataSharingActivities.validation.recipientAssessmentRequired",
    });
    expect(validateActivityForm({ ...validValues, name: "  " })).toHaveProperty(
      "name"
    );
    expect(validateActivityForm(validValues)).toEqual({});
  });

  it("requires a three-letter currency code when a budget is set", () => {
    expect(
      validateActivityForm({ ...validValues, availableBudget: "5000" })
    ).toEqual({
      budgetCurrency: "dataSharingActivities.validation.currencyRequired",
    });
    expect(
      validateActivityForm({
        ...validValues,
        availableBudget: "5000",
        budgetCurrency: "EU",
      })
    ).toEqual({
      budgetCurrency: "dataSharingActivities.validation.currencyFormat",
    });
    expect(
      validateActivityForm({
        ...validValues,
        availableBudget: "5000",
        budgetCurrency: "EUR",
      })
    ).toEqual({});
  });

  it("rejects negative numbers, partial setup days and a retention above 100%", () => {
    expect(
      validateActivityForm({
        ...validValues,
        maximumSetupTimeDays: "2.5",
        availableBudget: "-1",
        budgetCurrency: "EUR",
        minimumCohortRetentionPercent: "100.5",
      })
    ).toEqual({
      maximumSetupTimeDays: "dataSharingActivities.validation.wholeDays",
      availableBudget: "dataSharingActivities.validation.negativeNumber",
      minimumCohortRetentionPercent:
        "dataSharingActivities.validation.percentAboveMax",
    });
    expect(
      validateActivityForm({
        ...validValues,
        maximumSetupTimeDays: "0",
        minimumCohortRetentionPercent: "100",
      })
    ).toEqual({});
  });

  it("does not allow a downloadable dataset from a secure remote analysis", () => {
    const values = {
      ...validValues,
      sharingArrangement: "SECURE_REMOTE_ANALYSIS",
      requiredExternalDeliverables: [
        "AGGREGATE_RESULTS",
        "ANONYMIZED_DOWNLOADABLE_DATASET",
      ],
    };

    expect(validateActivityForm(values)).toEqual({
      requiredExternalDeliverables:
        "dataSharingActivities.validation.downloadableDatasetNotAllowed",
    });
    expect(
      validateActivityForm({
        ...values,
        sharingArrangement: "CONTROLLED_DATA_TRANSFER",
      })
    ).toEqual({});
  });
});

describe("buildDataSharingActivityPayload", () => {
  it("sends unspecified requirements as null and empty lists, never as zero", () => {
    const payload = buildDataSharingActivityPayload({
      values: validValues,
      sharedUsernames: [],
      overrideTables: false,
      tables: [],
    });

    expect(payload).toMatchObject({
      datasetAssessmentId: 3,
      recipientAssessmentId: 7,
      sharingPurpose: null,
      mitigationKnowledgeBaseVersionId: null,
      tableAssessments: [],
    });
    expect(payload.requirements).toEqual({
      maximumSetupTimeDays: null,
      availableBudget: null,
      budgetCurrency: null,
      requiredTemporalResolution: null,
      minimumCohortRetentionPercent: null,
      analysisDataNeeded: [],
      requiredExternalDeliverables: [],
      sharingArrangement: null,
    });
  });

  it("round-trips the requirements of an activity response", () => {
    const requirements = {
      maximumSetupTimeDays: 30,
      availableBudget: 1234.5,
      budgetCurrency: "EUR",
      requiredTemporalResolution: "MONTH",
      minimumCohortRetentionPercent: 90.5,
      analysisDataNeeded: ["INDIVIDUAL_LEVEL_DATA"],
      requiredExternalDeliverables: ["REPORT", "CODE"],
      sharingArrangement: "SECURE_REMOTE_ANALYSIS",
    };
    const values = activityToFormValues({
      name: "Registry export",
      datasetAssessmentId: 3,
      recipientAssessmentId: 7,
      sharingPurpose: "Survival analysis",
      mitigationKnowledgeBaseVersionId: 12,
      requirements,
    });

    expect(values.maximumSetupTimeDays).toBe("30");
    expect(validateActivityForm(values)).toEqual({});

    const payload = buildDataSharingActivityPayload({
      values,
      sharedUsernames: ["alice"],
      overrideTables: false,
      tables: [],
    });
    expect(payload.requirements).toEqual(requirements);
    expect(payload.mitigationKnowledgeBaseVersionId).toBe(12);
    expect(payload.sharingPurpose).toBe("Survival analysis");
    expect(
      Object.keys(payload.requirements).some((key) =>
        key.endsWith("ConstraintType")
      )
    ).toBe(false);
  });
});

describe("activity assessment selection", () => {
  const assessments = [
    { id: 1, datasetId: 10 },
    { id: 2, datasetId: 20 },
    { id: 3, datasetId: 10 },
  ];

  it("only offers assessments belonging to the selected resource", () => {
    expect(
      assessmentsForResource(assessments, "datasetId", "10").map(({ id }) => id)
    ).toEqual([1, 3]);
    expect(assessmentsForResource(assessments, "datasetId", "")).toEqual([]);
    expect(
      assessmentsForResource([{ id: 7, recipientId: 5 }], "recipientId", "6")
    ).toEqual([]);
  });

  it.each([
    ["dataset", selectDataset, "datasetId", "datasetAssessmentId", "recipientAssessmentId"],
    ["recipient", selectRecipient, "recipientId", "recipientAssessmentId", "datasetAssessmentId"],
  ])(
    "choosing another %s clears only its assessment",
    (_, select, resource, related, unrelated) => {
      const updated = select(validValues, "42");
      expect(updated[resource]).toBe("42");
      expect(updated[related]).toBe("");
      expect(updated[unrelated]).toBe(validValues[unrelated]);
      expect(updated.name).toBe(validValues.name);
      expect(validateActivityForm(updated)).toHaveProperty(related);
    }
  );

  it("restores resource selections on edit without adding them to the API payload", () => {
    const values = activityToFormValues({
      ...validValues,
      datasetId: 10,
      recipientId: 20,
    });
    expect(values).toMatchObject({ datasetId: "10", recipientId: "20" });
    const payload = buildDataSharingActivityPayload({
      values,
      sharedUsernames: [],
      overrideTables: false,
      tables: [],
    });
    expect(payload).not.toHaveProperty("datasetId");
    expect(payload).not.toHaveProperty("recipientId");
    expect(payload).toMatchObject({
      datasetAssessmentId: 3,
      recipientAssessmentId: 7,
    });
  });
});
