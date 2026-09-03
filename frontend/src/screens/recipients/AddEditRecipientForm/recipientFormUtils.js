export const EMPTY_RECIPIENT_FORM = {
  name: "",
  description: "",
  organizationLink: "",
};

export function mapRecipientToFormValues(recipient) {
  return {
    name: recipient?.name || "",
    description: recipient?.description || "",
    organizationLink: recipient?.organizationLink || "",
  };
}

export function getRecipientFormTargetKey(recipientId) {
  return recipientId ? `recipient:${recipientId}` : "new";
}

export function validateRecipientForm(values) {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  }

  return errors;
}

export function buildRecipientPayload(values, sharedUsernames) {
  return {
    name: values.name,
    description: values.description,
    organizationLink: values.organizationLink,
    sharedUsernames: sharedUsernames || [],
  };
}

export function getSubmitErrorMessage(error, fallbackMessage) {
  if (typeof error === "string" && error) return error;
  if (error?.message) return error.message;
  return fallbackMessage;
}
