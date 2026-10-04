import {
  buildAssessmentTables,
  groupAssessmentAttributes,
} from "./buildAssessmentTables";

const names = (attributes) => attributes.map((attribute) => attribute.name);

test("groupAssessmentAttributes places direct identifiers first and preserves group order", () => {
  const grouped = groupAssessmentAttributes([
    { name: "gender" },
    { name: "age_at_diagnosis" },
    { name: "insurance_number", isExcluded: true },
    { name: "date_of_diagnosis" },
    { name: "patient_code", isDirectIdentifier: true },
    { name: "last_known_patient_status" },
  ]);

  expect(names(grouped)).toEqual([
    "insurance_number",
    "patient_code",
    "gender",
    "age_at_diagnosis",
    "date_of_diagnosis",
    "last_known_patient_status",
  ]);
  expect(grouped).toEqual(
    expect.not.arrayContaining([expect.objectContaining({ _originalOrder: 0 })])
  );
});

test("buildAssessmentTables groups excluded attributes first without duplicating rows", () => {
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
        },
      ],
    },
    assessment: null,
    isEditMode: false,
    scoringSystem: null,
  });

  expect(names(tables[0].attributes)).toEqual([
    "insurance_number",
    "gender",
    "age_at_diagnosis",
    "date_of_diagnosis",
    "uncomplicated_phase",
  ]);
  expect(
    tables[0].attributes.filter(
      (attribute) => attribute.name === "age_at_diagnosis"
    )
  ).toHaveLength(1);
});
