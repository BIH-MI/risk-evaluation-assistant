import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RAButton from "components/input/RAButton";
import RATypography from "components/display/RATypography";

function getCategoryButtonSx(isActive) {
  return (theme) => {
    const inactiveBackground =
      theme.palette.background.card || theme.palette.background.default;

    return {
      width: { xs: "100%", sm: "auto" },
      minWidth: { sm: 200 },
      minHeight: 44,
      py: 1,
      px: 2,
      fontWeight: isActive ? "bold" : "normal",
      textTransform: "none",
      bgcolor: isActive ? theme.palette.primary.main : inactiveBackground,
      color: isActive
        ? theme.palette.primary.contrastText
        : theme.palette.text.primary,
      borderColor: isActive
        ? theme.palette.primary.main
        : theme.palette.light?.main || theme.palette.divider,
      "&:hover": {
        bgcolor: isActive
          ? theme.palette.primary.dark
          : theme.palette.action.hover,
      },
      transition: theme.transitions.create(
        ["background-color", "border-color", "color"],
        {
          duration: theme.transitions.duration.short,
        }
      ),
    };
  };
}

function QuestionnaireCategoryTabs({ categories, activeCode, onChange }) {
  const { t } = useTranslation();

  if (categories.length <= 1) return null;

  return (
    <RABox
      borderBottom={1}
      p={2}
      sx={({ palette }) => ({
        bgcolor: palette.background.default,
        borderColor: palette.light?.main || palette.divider,
      })}
    >
      <RATypography variant="h5" fontWeight="bold" align="center" mb={2}>
        {t("recipientAssessments.form.contextRiskCategories")}
      </RATypography>

      <RABox display="flex" flexWrap="wrap" justifyContent="center" gap={1.5}>
        {categories.map((category) => {
          const isActive = activeCode === category.code;

          return (
            <RAButton
              key={category.code}
              variant={isActive ? "contained" : "outlined"}
              color={isActive ? "primary" : "secondary"}
              onClick={() => onChange(category.code)}
              sx={getCategoryButtonSx(isActive)}
            >
              {category.name}
            </RAButton>
          );
        })}
      </RABox>
    </RABox>
  );
}

QuestionnaireCategoryTabs.propTypes = {
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      code: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  activeCode: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

QuestionnaireCategoryTabs.defaultProps = {
  activeCode: "",
};

export default QuestionnaireCategoryTabs;
