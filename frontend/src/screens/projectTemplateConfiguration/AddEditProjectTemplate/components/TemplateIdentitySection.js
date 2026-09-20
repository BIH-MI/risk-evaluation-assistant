import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { Chip, FormControlLabel, Grid, Paper, Switch } from "@mui/material";

import RAInput from "components/input/RAInput";
import RATypography from "components/display/RATypography";
import RABox from "components/layout/RABox";

const adminPaperSx = {
  p: { xs: 2, md: 3 },
  borderRadius: 2,
  bgcolor: ({ palette }) =>
    palette.background.card || palette.background.paper || palette.background.default,
  color: ({ palette }) => palette.text.main || palette.text.primary,
  border: "1px solid",
  borderColor: "divider",
};

export default function TemplateIdentitySection({ form, errors, showErrors, onChange }) {
  const { t } = useTranslation();
  const versionLabel = form.versionNumber
    ? `${t("projectTemplateConfiguration.fields.version")} ${form.versionNumber}`
    : t("projectTemplateConfiguration.fields.versionNew");

  return (
    <Paper
      elevation={2}
      sx={adminPaperSx}
    >
      <RABox display="flex" alignItems="center" justifyContent="space-between" gap={2} mb={2}>
        <RATypography variant="h6">{t("projectTemplateConfiguration.identity.title")}</RATypography>
        <Chip size="small" label={versionLabel} />
      </RABox>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <RAInput
            label={t("projectTemplateConfiguration.fields.name")}
            value={form.name}
            onChange={(event) => onChange("name", event.target.value)}
            fullWidth
            required
            error={showErrors && Boolean(errors.name)}
            helperText={showErrors ? errors.name : ""}
          />
        </Grid>
        <Grid item xs={12}>
          <RAInput
            label={t("projectTemplateConfiguration.fields.description")}
            value={form.description}
            onChange={(event) => onChange("description", event.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={form.active}
                onChange={(event) => onChange("active", event.target.checked)}
              />
            }
            label={t("projectTemplateConfiguration.fields.active")}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Switch
                checked={form.defaultTemplate}
                onChange={(event) => onChange("defaultTemplate", event.target.checked)}
              />
            }
            label={t("projectTemplateConfiguration.fields.default")}
          />
          {showErrors && errors.defaultTemplate && (
            <RATypography variant="caption" color="error" display="block">
              {errors.defaultTemplate}
            </RATypography>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
}

TemplateIdentitySection.propTypes = {
  form: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
