import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import AddIcon from "@mui/icons-material/Add";

import RAButton from "components/input/RAButton";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import TemplateSectionEditor from "./TemplateSectionEditor";
import { isFixedSectionTitle } from "../projectTemplateFormUtils";

export default function TemplateSectionsEditor({
  sections,
  errors,
  showErrors,
  onUpdateSection,
  onAddSection,
  onRemoveSection,
  onMoveSection,
  onUpdateRequirement,
  onAddRequirement,
  onRemoveRequirement,
}) {
  const { t } = useTranslation();

  return (
    <RABox display="flex" flexDirection="column" gap={2}>
      <RABox
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={2}
        flexWrap="wrap"
      >
        <RABox>
          <RATypography variant="h6">{t("projectTemplateConfiguration.section.title")}</RATypography>
          <RATypography
            variant="body2"
            display="block"
            mt={0.25}
            maxWidth={800}
            sx={{ color: ({ palette }) => palette.text.main || palette.text.secondary }}
          >
            {t("projectTemplateConfiguration.section.description")}
          </RATypography>
        </RABox>
        <RAButton
          type="button"
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={onAddSection}
        >
          {t("projectTemplateConfiguration.section.add")}
        </RAButton>
      </RABox>

      <RABox display="flex" flexDirection="column" gap={3}>
        {sections.map((section, index) => {
          const isFixedSection = isFixedSectionTitle(section.title);
          const previousSection = sections[index - 1];
          const nextSection = sections[index + 1];

          return (
            <TemplateSectionEditor
              key={section.clientId}
              allSections={sections}
              section={section}
              index={index}
              errors={errors[section.clientId] || {}}
              showErrors={showErrors}
              isFixedSection={isFixedSection}
              canRemoveSection={sections.length > 1 && !isFixedSection}
              canMoveUpSection={Boolean(
                !isFixedSection && previousSection && !isFixedSectionTitle(previousSection.title)
              )}
              canMoveDownSection={Boolean(
                !isFixedSection && nextSection && !isFixedSectionTitle(nextSection.title)
              )}
              onChange={(changes) => onUpdateSection(section.clientId, changes)}
              onRemove={() => onRemoveSection(section.clientId)}
              onMoveUp={() => onMoveSection(section.clientId, -1)}
              onMoveDown={() => onMoveSection(section.clientId, 1)}
              onAddRequirement={() => onAddRequirement(section.clientId)}
              onUpdateRequirement={(requirementClientId, changes) =>
                onUpdateRequirement(section.clientId, requirementClientId, changes)
              }
              onRemoveRequirement={(requirementClientId) =>
                onRemoveRequirement(section.clientId, requirementClientId)
              }
            />
          );
        })}
      </RABox>
    </RABox>
  );
}

TemplateSectionsEditor.propTypes = {
  sections: PropTypes.array.isRequired,
  errors: PropTypes.object.isRequired,
  showErrors: PropTypes.bool.isRequired,
  onUpdateSection: PropTypes.func.isRequired,
  onAddSection: PropTypes.func.isRequired,
  onRemoveSection: PropTypes.func.isRequired,
  onMoveSection: PropTypes.func.isRequired,
  onUpdateRequirement: PropTypes.func.isRequired,
  onAddRequirement: PropTypes.func.isRequired,
  onRemoveRequirement: PropTypes.func.isRequired,
};
