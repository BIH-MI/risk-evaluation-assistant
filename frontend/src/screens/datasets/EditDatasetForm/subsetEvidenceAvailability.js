/**
 * Edit Dataset has no raw rows or profiling session, so it can neither create
 * nor recalculate subset evidence. Persisted evidence is carried through
 * unchanged; included attributes without any (re-included, newly added, or
 * never profiled) trigger a short explanation of this limitation.
 *
 * Joint equivalence classes cannot be reconstructed from per-attribute
 * statistics, so no substitute evidence is derived here.
 */
export function findIncludedAttributesWithoutSubsetEvidence(tables = []) {
  return tables.flatMap((table) =>
    (table.attributes || [])
      .filter(
        (attribute) =>
          attribute.excluded !== true &&
          !(
            Array.isArray(attribute.subsetEvidence) &&
            attribute.subsetEvidence.length > 0
          )
      )
      .map((attribute) => ({
        tableName: table.name,
        attributeName: attribute.name,
      }))
  );
}

export function buildMissingSubsetEvidenceMessage(t, attributes) {
  if (!attributes.length) return "";

  return t("datasets.subsetEvidence.missingAction");
}
