import React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import OnBlurRAInput from "components/input/RAInput/OnBlurRAInput";
import RAUserAutocomplete from "components/input/RAUserAutocomplete";
import RAButton from "components/input/RAButton";
import RATypography from "components/display/RATypography";
import RABox from "components/layout/RABox";
import RAAlert from "components/feedback/RAAlert";
import useRecipientForm from "./useRecipientForm";

function FloatingLockAlert({ message, onClose }) {
  const theme = useTheme();

  if (!message) return null;

  return (
    <RABox
      sx={{
        position: "fixed",
        bottom: theme.spacing(2),
        right: theme.spacing(2),
        width: 300,
        zIndex: theme.zIndex.snackbar,
      }}
    >
      <RAAlert color="error" dismissible onClose={onClose}>
        <RATypography variant="body2" color="white">
          {message}
        </RATypography>
      </RAAlert>
    </RABox>
  );
}

export default function AddEditRecipientForm() {
  const { t } = useTranslation();
  const {
    values,
    sharedUsers,
    isEditMode,
    isReadOnly,
    isSubmitting,
    submitError,
    lockError,
    handleFieldChange,
    handleSharedUsersChange,
    handleSubmit,
    clearLockError,
  } = useRecipientForm();

  return (
    <>
      <RABox py={8}>
        <RABox
          component="form"
          onSubmit={handleSubmit}
          sx={{
            maxWidth: 600,
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <RATypography variant="h5" textAlign="center">
            {isEditMode
              ? t("recipients.form.editTitle")
              : t("recipients.form.addTitle")}
          </RATypography>

          <OnBlurRAInput
            label={t("recipients.form.organizationLabel")}
            value={values.name}
            onCommit={(value) => handleFieldChange("name", value)}
            required
            fullWidth
            disabled={isReadOnly}
          />

          <OnBlurRAInput
            label={t("recipients.form.descriptionLabel")}
            value={values.description}
            onCommit={(value) => handleFieldChange("description", value)}
            fullWidth
            multiline
            rows={3}
            disabled={isReadOnly}
          />

          <OnBlurRAInput
            label={t("recipients.form.organizationLinkLabel")}
            value={values.organizationLink}
            onCommit={(value) => handleFieldChange("organizationLink", value)}
            fullWidth
            disabled={isReadOnly}
          />

          <RAUserAutocomplete
            multiple
            label={t("recipients.form.sharedWithLabel")}
            value={sharedUsers}
            onChange={handleSharedUsersChange}
            placeholder={t("recipients.form.searchUsersPlaceholder")}
            disabled={isReadOnly}
          />

          <RAButton
            type="submit"
            sx={{ alignSelf: "center", mt: 2 }}
            disabled={isReadOnly}
          >
            {isSubmitting
              ? t("recipients.form.saving")
              : isEditMode
              ? t("recipients.form.saveChanges")
              : t("recipients.form.createRecipient")}
          </RAButton>
        </RABox>

        {submitError && (
          <RAAlert color="error" sx={{ mt: 2, mx: "auto", maxWidth: 600 }}>
            <RATypography variant="body2" color="white">
              {submitError}
            </RATypography>
          </RAAlert>
        )}
      </RABox>

      <FloatingLockAlert message={lockError} onClose={clearLockError} />
    </>
  );
}

FloatingLockAlert.propTypes = {
  message: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

FloatingLockAlert.defaultProps = {
  message: null,
};
