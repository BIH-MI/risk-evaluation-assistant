export {
  getQidSearchTypeLabel,
  QID_SEARCH_TYPE_OPTIONS,
} from "qidDiscovery/configuration/searchTypeLabels";

export const emptyQidDiscoveryConfigurationForm = () => ({
  id: null,
  name: "",
  description: "",
  active: true,
  defaultConfiguration: false,
  versionNumber: 1,
  search: {
    searchType: "AUTOMATIC",
    exactSearchMaxCandidateCount: "8",
    maxCombinationSize: "4",
    beamWidth: "10",
    minImprovement: "0.000001",
    stagnationDepthLimit: "2",
    targetDistinction: "0.95",
    targetSeparation: "0.95",
    distinctionWeight: "0.70",
    separationWeight: "0.30",
    attributeCountPenalty: "0.03",
    maxPersistedCombinations: "20",
  },
});

export function normalizeQidConfigurationToForm(configuration) {
  const empty = emptyQidDiscoveryConfigurationForm();
  const search = configuration?.search || {};

  return {
    id: configuration.id,
    name: configuration.name || "",
    description: configuration.description || "",
    active: Boolean(configuration.active),
    defaultConfiguration: Boolean(configuration.defaultConfiguration),
    versionNumber:
      configuration.versionNumber || configuration.currentVersion || 1,
    search: {
      ...empty.search,
      searchType: search.searchType || empty.search.searchType,
      exactSearchMaxCandidateCount: String(
        search.exactSearchMaxCandidateCount ??
          empty.search.exactSearchMaxCandidateCount
      ),
      maxCombinationSize: String(
        search.maxCombinationSize ?? empty.search.maxCombinationSize
      ),
      beamWidth: String(search.beamWidth ?? empty.search.beamWidth),
      minImprovement: String(
        search.minImprovement ?? empty.search.minImprovement
      ),
      stagnationDepthLimit: String(
        search.stagnationDepthLimit ?? empty.search.stagnationDepthLimit
      ),
      targetDistinction: String(
        search.targetDistinction ?? empty.search.targetDistinction
      ),
      targetSeparation: String(
        search.targetSeparation ?? empty.search.targetSeparation
      ),
      distinctionWeight: String(
        search.distinctionWeight ?? empty.search.distinctionWeight
      ),
      separationWeight: String(
        search.separationWeight ?? empty.search.separationWeight
      ),
      attributeCountPenalty: String(
        search.attributeCountPenalty ?? empty.search.attributeCountPenalty
      ),
      maxPersistedCombinations: String(
        search.maxPersistedCombinations ?? empty.search.maxPersistedCombinations
      ),
    },
  };
}

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
};

function addNumberError(
  t,
  errors,
  key,
  value,
  fieldLabelKey,
  { integer, min, max } = {}
) {
  const number = toNumber(value);
  const field = t(fieldLabelKey);

  if (number === null) {
    errors[key] = t("qidDiscoveryConfiguration.errors.fieldRequired", {
      field,
    });
    return;
  }
  if (Number.isNaN(number)) {
    errors[key] = t("qidDiscoveryConfiguration.errors.fieldInvalidNumber", {
      field,
    });
    return;
  }
  if (integer && !Number.isInteger(number)) {
    errors[key] = t("qidDiscoveryConfiguration.errors.fieldNotInteger", {
      field,
    });
    return;
  }
  if (min !== undefined && number < min) {
    errors[key] = t("qidDiscoveryConfiguration.errors.fieldBelowMin", {
      field,
      min,
    });
    return;
  }
  if (max !== undefined && number > max) {
    errors[key] = t("qidDiscoveryConfiguration.errors.fieldAboveMax", {
      field,
      max,
    });
  }
}

export function validateQidConfigurationForm(
  t,
  form,
  existingConfigurations = []
) {
  const fields = {};
  const search = {};

  if (!form.name.trim()) {
    fields.name = t("qidDiscoveryConfiguration.errors.nameRequired");
  } else {
    const duplicateName = existingConfigurations.some(
      (configuration) =>
        configuration.id !== form.id &&
        String(configuration.name || "")
          .trim()
          .toLowerCase() === form.name.trim().toLowerCase()
    );
    if (duplicateName) {
      fields.name = t("qidDiscoveryConfiguration.errors.nameNotUnique");
    }
  }

  if (form.defaultConfiguration && !form.active) {
    fields.defaultConfiguration = t(
      "qidDiscoveryConfiguration.errors.defaultNotActive"
    );
  }

  const searchType = form.search.searchType;
  const isAutomatic = searchType === "AUTOMATIC";
  const usesBeam = isAutomatic || searchType === "BEAM";

  if (!["AUTOMATIC", "EXACT", "BEAM"].includes(searchType)) {
    search.searchType = t(
      "qidDiscoveryConfiguration.errors.searchTypeRequired"
    );
  }

  if (isAutomatic) {
    addNumberError(
      t,
      search,
      "exactSearchMaxCandidateCount",
      form.search.exactSearchMaxCandidateCount,
      "qidDiscoveryConfiguration.fields.exactSearchMaxCandidateCount",
      { integer: true, min: 1 }
    );
  }

  addNumberError(
    t,
    search,
    "maxCombinationSize",
    form.search.maxCombinationSize,
    "qidDiscoveryConfiguration.fields.maxCombinationSize",
    { integer: true, min: 1 }
  );

  ["beamWidth", "stagnationDepthLimit"].forEach((key) => {
    if (!usesBeam) return;
    const fieldLabelKey =
      key === "beamWidth"
        ? "qidDiscoveryConfiguration.fields.beamWidth"
        : "qidDiscoveryConfiguration.fields.stagnationDepthLimit";
    addNumberError(t, search, key, form.search[key], fieldLabelKey, {
      integer: true,
      min: 1,
    });
  });

  if (usesBeam) {
    addNumberError(
      t,
      search,
      "minImprovement",
      form.search.minImprovement,
      "qidDiscoveryConfiguration.fields.minImprovement",
      { min: 0 }
    );
  }

  addNumberError(
    t,
    search,
    "targetDistinction",
    form.search.targetDistinction,
    "qidDiscoveryConfiguration.fields.targetDistinction",
    { min: 0, max: 1 }
  );
  addNumberError(
    t,
    search,
    "targetSeparation",
    form.search.targetSeparation,
    "qidDiscoveryConfiguration.fields.targetSeparation",
    { min: 0, max: 1 }
  );
  addNumberError(
    t,
    search,
    "distinctionWeight",
    form.search.distinctionWeight,
    "qidDiscoveryConfiguration.fields.distinctionWeight",
    { min: 0 }
  );
  addNumberError(
    t,
    search,
    "separationWeight",
    form.search.separationWeight,
    "qidDiscoveryConfiguration.fields.separationWeight",
    { min: 0 }
  );

  const distinctionWeight = toNumber(form.search.distinctionWeight);
  const separationWeight = toNumber(form.search.separationWeight);
  if (
    Number.isFinite(distinctionWeight) &&
    Number.isFinite(separationWeight) &&
    distinctionWeight + separationWeight <= 0
  ) {
    search.separationWeight = t(
      "qidDiscoveryConfiguration.errors.weightsCannotBothBeZero",
      {
        distinctionField: t(
          "qidDiscoveryConfiguration.fields.distinctionWeight"
        ),
        separationField: t("qidDiscoveryConfiguration.fields.separationWeight"),
      }
    );
  }

  addNumberError(
    t,
    search,
    "attributeCountPenalty",
    form.search.attributeCountPenalty,
    "qidDiscoveryConfiguration.fields.attributeCountPenalty",
    { min: 0 }
  );
  addNumberError(
    t,
    search,
    "maxPersistedCombinations",
    form.search.maxPersistedCombinations,
    "qidDiscoveryConfiguration.fields.maxPersistedCombinations",
    { integer: true, min: 1 }
  );

  return { fields, search };
}

export const hasQidConfigurationFormErrors = (errors) =>
  Object.keys(errors.fields).length > 0 ||
  Object.keys(errors.search).length > 0;

const payloadNumber = (value) =>
  value === null || value === undefined || value === "" ? null : Number(value);

export function qidConfigurationFormToPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    active: Boolean(form.active),
    defaultConfiguration: Boolean(form.defaultConfiguration),
    search: {
      searchType: form.search.searchType,
      exactSearchMaxCandidateCount: payloadNumber(
        form.search.exactSearchMaxCandidateCount
      ),
      maxCombinationSize: payloadNumber(form.search.maxCombinationSize),
      beamWidth: payloadNumber(form.search.beamWidth),
      minImprovement: payloadNumber(form.search.minImprovement),
      stagnationDepthLimit: payloadNumber(form.search.stagnationDepthLimit),
      targetDistinction: payloadNumber(form.search.targetDistinction),
      targetSeparation: payloadNumber(form.search.targetSeparation),
      distinctionWeight: payloadNumber(form.search.distinctionWeight),
      separationWeight: payloadNumber(form.search.separationWeight),
      attributeCountPenalty: payloadNumber(form.search.attributeCountPenalty),
      maxPersistedCombinations: payloadNumber(
        form.search.maxPersistedCombinations
      ),
    },
  };
}
