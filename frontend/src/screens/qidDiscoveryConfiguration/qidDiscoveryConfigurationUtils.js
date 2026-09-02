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
    versionNumber: configuration.versionNumber || configuration.currentVersion || 1,
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

function addNumberError(errors, key, value, label, { integer, min, max } = {}) {
  const number = toNumber(value);

  if (number === null) {
    errors[key] = `${label} is required.`;
    return;
  }
  if (Number.isNaN(number)) {
    errors[key] = `${label} must be a valid number.`;
    return;
  }
  if (integer && !Number.isInteger(number)) {
    errors[key] = `${label} must be an integer.`;
    return;
  }
  if (min !== undefined && number < min) {
    errors[key] = `${label} must be at least ${min}.`;
    return;
  }
  if (max !== undefined && number > max) {
    errors[key] = `${label} must be at most ${max}.`;
  }
}

export function validateQidConfigurationForm(form, existingConfigurations = []) {
  const fields = {};
  const search = {};

  if (!form.name.trim()) {
    fields.name = "Name is required.";
  } else {
    const duplicateName = existingConfigurations.some(
      (configuration) =>
        configuration.id !== form.id &&
        String(configuration.name || "").trim().toLowerCase() ===
          form.name.trim().toLowerCase()
    );
    if (duplicateName) {
      fields.name = "A QID discovery configuration with this name already exists.";
    }
  }

  if (form.defaultConfiguration && !form.active) {
    fields.defaultConfiguration =
      "The default QID discovery configuration must be active.";
  }

  const searchType = form.search.searchType;
  const isAutomatic = searchType === "AUTOMATIC";
  const usesBeam = isAutomatic || searchType === "BEAM";

  if (!["AUTOMATIC", "EXACT", "BEAM"].includes(searchType)) {
    search.searchType = "QID Search Type is required.";
  }

  if (isAutomatic) {
    addNumberError(
      search,
      "exactSearchMaxCandidateCount",
      form.search.exactSearchMaxCandidateCount,
      "Exact Search Maximum Candidate Count",
      { integer: true, min: 1 }
    );
  }

  addNumberError(
    search,
    "maxCombinationSize",
    form.search.maxCombinationSize,
    "Maximum Combination Size",
    { integer: true, min: 1 }
  );

  ["beamWidth", "stagnationDepthLimit"].forEach((key) => {
    if (!usesBeam) return;
    const label =
      key === "beamWidth" ? "Beam Width" : "Stagnation Depth Limit";
    addNumberError(search, key, form.search[key], label, {
      integer: true,
      min: 1,
    });
  });

  if (usesBeam) {
    addNumberError(
      search,
      "minImprovement",
      form.search.minImprovement,
      "Minimum Improvement",
      { min: 0 }
    );
  }

  addNumberError(
    search,
    "targetDistinction",
    form.search.targetDistinction,
    "Target Distinction",
    { min: 0, max: 1 }
  );
  addNumberError(
    search,
    "targetSeparation",
    form.search.targetSeparation,
    "Target Separation",
    { min: 0, max: 1 }
  );
  addNumberError(
    search,
    "distinctionWeight",
    form.search.distinctionWeight,
    "Distinction Weight",
    { min: 0 }
  );
  addNumberError(
    search,
    "separationWeight",
    form.search.separationWeight,
    "Separation Weight",
    { min: 0 }
  );

  const distinctionWeight = toNumber(form.search.distinctionWeight);
  const separationWeight = toNumber(form.search.separationWeight);
  if (
    Number.isFinite(distinctionWeight) &&
    Number.isFinite(separationWeight) &&
    distinctionWeight + separationWeight <= 0
  ) {
    search.separationWeight =
      "Distinction Weight and Separation Weight cannot both be 0.";
  }

  addNumberError(
    search,
    "attributeCountPenalty",
    form.search.attributeCountPenalty,
    "Attribute Count Penalty",
    { min: 0 }
  );
  addNumberError(
    search,
    "maxPersistedCombinations",
    form.search.maxPersistedCombinations,
    "Maximum Retained Combinations",
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
