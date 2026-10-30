import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RASelect from "components/input/RASelect";
import FieldInfo from "./FieldInfo";
import useKnowledgeBaseOptions from "../useKnowledgeBaseOptions";

const versionLabel = (name, versionNumber) => `${name} · v${versionNumber}`;

/**
 * Mitigation knowledge-base version the planner uses for the activity. The empty choice is sent as
 * null: a new activity is then pinned to the current version of the default knowledge base, and
 * an existing activity keeps its pin. Otherwise only the current version of an active knowledge
 * base, or the version the activity is already pinned to, can be chosen.
 */
export default function KnowledgeBaseVersionSelect({ value, onChange, isEdit, activity, disabled }) {
  const { t } = useTranslation();
  const { knowledgeBases, error } = useKnowledgeBaseOptions();

  const currentVersionOptions = knowledgeBases
    .filter((knowledgeBase) => knowledgeBase.currentVersionId != null)
    .map((knowledgeBase) => ({
      value: String(knowledgeBase.currentVersionId),
      label: versionLabel(knowledgeBase.name, knowledgeBase.currentVersion),
    }));

  const pinnedVersionId =
    activity?.mitigationKnowledgeBaseVersionId != null
      ? String(activity.mitigationKnowledgeBaseVersionId)
      : "";
  // A pin to an older version, or to an archived knowledge base, stays selectable.
  const pinnedVersionOptions =
    pinnedVersionId && !currentVersionOptions.some((option) => option.value === pinnedVersionId)
      ? [
          {
            value: pinnedVersionId,
            label: versionLabel(
              activity.mitigationKnowledgeBaseName,
              activity.mitigationKnowledgeBaseVersionNumber
            ),
          },
        ]
      : [];

  let emptyOptions = [];
  if (!isEdit) {
    emptyOptions = [{ value: "", label: t("dataSharingActivities.form.knowledgeBaseDefault") }];
  } else if (!pinnedVersionId) {
    emptyOptions = [{ value: "", label: t("dataSharingActivities.form.knowledgeBaseNotPinned") }];
  }

  const label = t("dataSharingActivities.form.knowledgeBaseLabel");

  return (
    <FieldInfo label={label} info={t("dataSharingActivities.form.knowledgeBaseInfo")}>
      <RASelect
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        options={[...emptyOptions, ...pinnedVersionOptions, ...currentVersionOptions]}
        SelectProps={{ displayEmpty: true }}
        InputLabelProps={{ shrink: true }}
        helperText={error || ""}
        error={Boolean(error)}
        disabled={disabled}
        size="medium"
        fullWidth
      />
    </FieldInfo>
  );
}

KnowledgeBaseVersionSelect.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  isEdit: PropTypes.bool.isRequired,
  activity: PropTypes.shape({
    mitigationKnowledgeBaseVersionId: PropTypes.number,
    mitigationKnowledgeBaseName: PropTypes.string,
    mitigationKnowledgeBaseVersionNumber: PropTypes.number,
  }),
  disabled: PropTypes.bool.isRequired,
};

KnowledgeBaseVersionSelect.defaultProps = {
  activity: null,
};
