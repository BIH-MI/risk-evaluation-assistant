export const emptyQidDiscoveryConfigurationForm = () => ({
  id: null,
  name: "",
  description: "",
  active: true,
  defaultConfiguration: false,
  versionNumber: 1,
  profiling: {
    maxSubsetSize: "4",
    maxEvaluatedSubsets: "25000",
  },
});

export function normalizeQidConfigurationToForm(configuration) {
  const empty = emptyQidDiscoveryConfigurationForm();
  const profiling = configuration?.profiling || {};

  return {
    id: configuration.id,
    name: configuration.name || "",
    description: configuration.description || "",
    active: Boolean(configuration.active),
    defaultConfiguration: Boolean(configuration.defaultConfiguration),
    versionNumber:
      configuration.versionNumber || configuration.currentVersion || 1,
    profiling: {
      maxSubsetSize: String(
        profiling.maxSubsetSize ?? empty.profiling.maxSubsetSize
      ),
      maxEvaluatedSubsets: String(
        profiling.maxEvaluatedSubsets ?? empty.profiling.maxEvaluatedSubsets
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
  { integer, min } = {}
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
  }
}

export function validateQidConfigurationForm(
  t,
  form,
  existingConfigurations = []
) {
  const fields = {};
  const profiling = {};

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

  addNumberError(
    t,
    profiling,
    "maxSubsetSize",
    form.profiling.maxSubsetSize,
    "qidDiscoveryConfiguration.fields.maxSubsetSize",
    { integer: true, min: 1 }
  );
  addNumberError(
    t,
    profiling,
    "maxEvaluatedSubsets",
    form.profiling.maxEvaluatedSubsets,
    "qidDiscoveryConfiguration.fields.maxEvaluatedSubsets",
    { integer: true, min: 1 }
  );

  return { fields, profiling };
}

export const hasQidConfigurationFormErrors = (errors) =>
  Object.keys(errors.fields).length > 0 ||
  Object.keys(errors.profiling).length > 0;

const payloadNumber = (value) =>
  value === null || value === undefined || value === "" ? null : Number(value);

export function qidConfigurationFormToPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    active: Boolean(form.active),
    defaultConfiguration: Boolean(form.defaultConfiguration),
    profiling: {
      maxSubsetSize: payloadNumber(form.profiling.maxSubsetSize),
      maxEvaluatedSubsets: payloadNumber(
        form.profiling.maxEvaluatedSubsets
      ),
    },
  };
}
