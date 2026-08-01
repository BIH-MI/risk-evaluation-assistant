import React from "react";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import workflow from "assets/images/documentation/workflow.png";
import { useTranslation } from "react-i18next";

export default function DocumentationPage() {
  const { t } = useTranslation();

  return (
    <RABox p={4}>
      {/* ─── Overview ─────────────────────────────────────────────────── */}
      <RATypography variant="h5" fontWeight="bold" gutterBottom>
        {t("documentation.title", "Overview of the Application")}
      </RATypography>

      <RATypography variant="body2" paragraph>
        {t(
          "documentation.description",
          "The Risk Evaluation Assistant (REA) is a web-based decision-support tool that helps data custodians plan risk-based anonymization for tabular datasets before sharing. REA focuses on schema-level metadata (eg, column names and data types) and structured questionnaires; it does not require uploading or storing record-level data in the backend. REA supports consistent, transparent decision-making by identifying which variables are likely to require protection and by deriving context-dependent parameters (eg, attack probability and a recommended anonymization risk threshold) that can be used to configure downstream anonymization engines. The current version of REA supports the following capabilities:"
        )}
      </RATypography>

      <RABox component="ul" pl={4} mb={2}>
        <RABox component="li" mb={2}>
          <RATypography variant="body2">
            <strong>
              {t(
                "documentation.attributeScreening",
                "Attribute-level screening of identifiability and sensitivity:"
              )}
            </strong>{" "}
            {t(
              "documentation.attributeScreeningDesc",
              "Evaluates tabular data attributes to determine their potential to act as quasi-identifiers or sensitive attributes."
            )}
          </RATypography>
        </RABox>

        <RABox component="li" mb={2}>
          <RATypography variant="body2">
            <strong>
              {t(
                "documentation.datasetAssessment",
                "Perform Dataset Assessment:"
              )}
            </strong>{" "}
            {t(
              "documentation.datasetAssessmentDesc",
              "Questionnaires evaluate the inherent risk of the data, including organizational context and purpose of use."
            )}
          </RATypography>
        </RABox>

        <RABox component="li" mb={2}>
          <RATypography variant="body2">
            <strong>
              {t(
                "documentation.recipientAssessment",
                "Perform Recipient Assessment:"
              )}
            </strong>{" "}
            {t(
              "documentation.recipientAssessmentDesc",
              "Questionnaires assess the recipient’s motives and capacity and the mitigating controls in place (legal, technical, and procedural)."
            )}
          </RATypography>
        </RABox>

        <RABox component="li" mb={2}>
          <RATypography variant="body2">
            <strong>
              {t(
                "documentation.defineActivity",
                "Define Data Sharing Activity:"
              )}
            </strong>{" "}
            {t(
              "documentation.defineActivityDesc",
              "A specific sharing scenario is created by combining a dataset assessment with a recipient assessment. REA then generates the context-dependent outputs (eg, attack probability and recommended anonymization threshold)."
            )}
          </RATypography>
        </RABox>

        <RABox component="li">
          <RATypography variant="body2">
            <strong>
              {t("documentation.reviewReport", "Review Risk Report:")}
            </strong>{" "}
            {t(
              "documentation.reviewReportDesc",
              "Users receive a visual and numeric breakdown of the assessments and the derived parameters that can be used to configure anonymization tools."
            )}
          </RATypography>
        </RABox>
      </RABox>

      <RABox
        component="img"
        src={workflow}
        alt={t("documentation.workflowAlt", "Application Workflow")}
        mt={4}
        sx={{
          display: "block",
          mx: "auto",
          backgroundColor: "transparent",
          height: "500px",
          width: "auto",
        }}
      />
    </RABox>
  );
}
