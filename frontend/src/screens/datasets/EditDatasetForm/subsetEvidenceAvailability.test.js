import { buildEditDatasetPayload } from "./buildEditDatasetPayload";
import {
  buildMissingSubsetEvidenceMessage,
  findIncludedAttributesWithoutSubsetEvidence,
} from "./subsetEvidenceAvailability";

const t = (key) => key;
const persistedEvidence = [
  {
    subsetSize: 2,
    evaluatedSubsetCount: 14,
    meanDistinction: 0.071,
    meanSeparation: 0.997,
    meanSingletonFraction: 0.018,
  },
];

function buildTables() {
  return [
    {
      id: 1,
      name: "Patients",
      attributes: [
        {
          id: 10,
          name: "age_at_diagnosis",
          dataType: "NUMBER",
          excluded: false,
          distinction: 0.0098,
          subsetEvidence: persistedEvidence,
        },
        // Excluded when the CSV was profiled, so it has individual
        // statistics but no subset evidence.
        {
          id: 11,
          name: "complicated_phase",
          dataType: "BOOLEAN",
          excluded: true,
          distinction: 0.0002,
          subsetEvidence: [],
        },
      ],
    },
  ];
}

const payloadFor = (tables) =>
  buildEditDatasetPayload(tables, {
    name: "LEOSS",
    description: "",
    sharedUsernames: [],
  }).tables[0].attributes;

describe("Edit Dataset subset evidence", () => {
  test("no notice while every included attribute has persisted evidence", () => {
    expect(findIncludedAttributesWithoutSubsetEvidence(buildTables())).toEqual(
      []
    );
    expect(buildMissingSubsetEvidenceMessage(t, [])).toBe("");
  });

  test("re-including a persisted attribute surfaces the gap without fabricating evidence", () => {
    const tables = buildTables();
    tables[0].attributes[1] = { ...tables[0].attributes[1], excluded: false };

    const missing = findIncludedAttributesWithoutSubsetEvidence(tables);
    expect(missing).toEqual([
      { tableName: "Patients", attributeName: "complicated_phase" },
    ]);
    expect(buildMissingSubsetEvidenceMessage(t, missing)).toBe(
      [
        "datasets.subsetEvidence.missingTitle",
        "- Patients: complicated_phase",
        "",
        "datasets.subsetEvidence.missingAction",
      ].join("\n")
    );

    const [ageAttribute, reincluded] = payloadFor(tables);
    expect(reincluded.subsetEvidence).toEqual([]);
    expect(reincluded.distinction).toBe(0.0002);
    // Existing evidence for other attributes is carried through unchanged.
    expect(ageAttribute.subsetEvidence).toEqual(persistedEvidence);
  });

  test("a newly added schema-only attribute is listed", () => {
    const tables = buildTables();
    tables[0].attributes.push({
      id: "new-1",
      name: "new_attribute",
      dataType: "STRING",
      excluded: false,
    });

    expect(findIncludedAttributesWithoutSubsetEvidence(tables)).toEqual([
      { tableName: "Patients", attributeName: "new_attribute" },
    ]);
    expect(payloadFor(tables)[2].subsetEvidence).toEqual([]);
  });
});
