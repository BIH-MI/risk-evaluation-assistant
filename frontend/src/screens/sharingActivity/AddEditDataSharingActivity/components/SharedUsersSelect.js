import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RAUserAutocomplete from "components/input/RAUserAutocomplete";
import { avatarFieldSx } from "./ActivityFormSection";

/** REA users who may view the activity besides its creator. */
export default function SharedUsersSelect({ users, onChange, disabled }) {
  const { t } = useTranslation();

  return (
    <RAUserAutocomplete
      multiple
      label={t("dataSharingActivities.form.sharedUsersLabel")}
      value={users}
      onChange={onChange}
      placeholder={t("dataSharingActivities.form.searchUsersPlaceholder")}
      sx={avatarFieldSx}
      disabled={disabled}
    />
  );
}

SharedUsersSelect.propTypes = {
  users: PropTypes.arrayOf(PropTypes.shape({ username: PropTypes.string.isRequired })).isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};
