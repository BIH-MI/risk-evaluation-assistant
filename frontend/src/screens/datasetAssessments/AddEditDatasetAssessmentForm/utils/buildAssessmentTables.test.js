import {
  buildAssessmentTables,
  groupAssessmentAttributes,
} from "./buildAssessmentTables";

const names = (attributes) => attributes.map((attribute) => attribute.name);

test("groupAssessmentAttributes places direct identifiers first, candidate QIDs next, and preserves group order", () => {
  const grouped = groupAssessmentAttributes([
    { name: "gender" },
    { name: "age_at_diagnosis", candidateQidCombinations: [{ id: 1 }] },
    { name: "insurance_number", isExcluded: true },
    { name: "date_of_diagnosis", candidateQidCombinations: [{ id: 2 }] },
    { name: "patient_code", isDirectIdentifier: true },
    { name: "last_known_patient_status" },
  ]);

  expect(names(grouped)).toEqual([
    "insurance_number",
    "patient_code",
    "age_at_diagnosis",
    "date_of_diagnosis",
    "gender",
    "last_known_patient_status",
  ]);
  expect(grouped).toEqual(
    expect.not.arrayContaining([expect.objectContaining({ _originalOrder: 0 })])
  );
});

test("buildAssessmentTables groups after candidate QID evidence is attached without duplicating rows", () => {
  const tables = buildAssessmentTables({
    dataset: {
      tables: [
        {
          id: 10,
          name: "LEOSS",
          attributes: [
            { id: 1, name: "gender", dataType: "TEXT" },
            { id: 2, name: "age_at_diagnosis", dataType: "NUMBER" },
            {
              id: 3,
              name: "insurance_number",
              dataType: "TEXT",
              excluded: true,
            },
            { id: 4, name: "date_of_diagnosis", dataType: "DATE" },
            { id: 5, name: "uncomplicated_phase", dataType: "TEXT" },
          ],
          qidCombinations: [
            { id: 100, candidateCombination: true, attributeIds: [2, 4] },
            { id: 101, minimalQualifying: true, attributeIds: [2] },
          ],
        },
      ],
    },
    assessment: null,
    isEditMode: false,
    scoringSystem: null,
  });

  expect(names(tables[0].attributes)).toEqual([
    "insurance_number",
    "age_at_diagnosis",
    "date_of_diagnosis",
    "gender",
    "uncomplicated_phase",
  ]);
  expect(
    tables[0].attributes.filter(
      (attribute) => attribute.name === "age_at_diagnosis"
    )
  ).toHaveLength(1);
  expect(
    tables[0].attributes.find(
      (attribute) => attribute.name === "age_at_diagnosis"
    ).candidateQidCombinations
  ).toHaveLength(2);
});
