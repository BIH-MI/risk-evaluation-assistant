import React from "react";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import workflow from "assets/images/documentation/workflow.png";

export default function DocumentationPage() {
  return (
    <RABox p={4}>
      {/* ─── Overview ─────────────────────────────────────────────────── */}
      <RATypography variant="h5" fontWeight="bold" gutterBottom>
        Overview of the Application
      </RATypography>

      <RATypography variant="body2" paragraph>
        The Risk Evaluation Assistant (REA) is a web-based decision-support tool that helps
        data custodians plan risk-based anonymization for tabular datasets before sharing.
        REA focuses on schema-level metadata (eg, column names and data types) and structured
        questionnaires; it does not require uploading or storing record-level data in the backend.
        REA supports consistent, transparent decision-making by identifying which variables are
        likely to require protection and by deriving context-dependent parameters (eg, attack
        probability and a recommended anonymization risk threshold) that can be used to configure
        downstream anonymization engines. The current version of REA supports the following capabilities:
      </RATypography>

      <RABox component="ul" pl={4} mb={2}>
        <RABox component="li" mb={2}>
          <RATypography variant="body2">
            <strong>Attribute-level screening of identifiability and sensitivity:</strong>
            <br />
            REA supports a structured, column-level review based on Sensitivity, Replicability,
            Availability, and Distinguishability. Using configurable thresholds, attributes are
            flagged as direct identifiers, quasi-identifiers, and/or sensitive attributes to guide
            which variables should be removed, generalized, or otherwise protected prior to release.
          </RATypography>
        </RABox>

        <RABox component="li" mb={2}>
          <RATypography variant="body2">
            <strong>Context risk assessment of the sharing environment:</strong>
            <br />
            In addition to data attributes, REA models the release context using questionnaires
            that capture invasion of privacy (impact), the recipient’s motives and capacity, and
            mitigating controls (legal, organizational, and technical safeguards). These inputs are
            mapped to an estimated probability of attack for the specific sharing scenario.
          </RATypography>
        </RABox>

        <RABox component="li" mb={2}>
          <RATypography variant="body2">
            <strong>Derivation of a recommended anonymization risk threshold:</strong>
            <br />
            Based on the assessed context (eg, probability of attack) and the selected risk threshold
            for the scenario, REA computes a recommended maximum permissible data risk (eg, R<sub>anon</sub>).
            This value can be passed to anonymization engines as a quantitative constraint (eg, to derive
            a minimum k in k-anonymity).
          </RATypography>
        </RABox>
      </RABox>

      {/* ─── Main Workflow ─────────────────────────────────────────────────── */}
      <RATypography variant="h5" fontWeight="bold" gutterBottom mt={6}>
        Main Workflow
      </RATypography>

      <RATypography variant="body2" paragraph>
        The REA application follows a structured, multi-step workflow to assess risk and guide
        anonymization planning:
      </RATypography>

      <RABox component="ul" pl={4} mb={2}>
        <RABox component="li" mb={2}>
          <RATypography variant="body2">
            <strong>Register Dataset:</strong> Users define a dataset by uploading a CSV or manually entering schema
            details. Only metadata is extracted; raw record-level data stays in the browser.
          </RATypography>
        </RABox>

        <RABox component="li" mb={2}>
          <RATypography variant="body2">
            <strong>Perform Dataset Assessment:</strong> Two complementary assessments are conducted:
            <br />- A questionnaire estimating potential invasion of privacy (impact).
            <br />- An attribute-level review (Sensitivity, Replicability, Availability, Distinguishability).
          </RATypography>
        </RABox>

        <RABox component="li" mb={2}>
          <RATypography variant="body2">
            <strong>Create Recipient Profile:</strong> Information is entered for the intended data recipient,
            including organizational context and purpose of use.
          </RATypography>
        </RABox>

        <RABox component="li" mb={2}>
          <RATypography variant="body2">
            <strong>Perform Recipient Assessment:</strong> Questionnaires assess the recipient’s motives and capacity
            and the mitigating controls in place (legal, technical, and procedural).
          </RATypography>
        </RABox>

        <RABox component="li" mb={2}>
          <RATypography variant="body2">
            <strong>Define Data Sharing Activity:</strong> A specific sharing scenario is created by combining a dataset
            assessment with a recipient assessment. REA then generates the context-dependent outputs (eg, attack probability
            and recommended anonymization threshold).
          </RATypography>
        </RABox>

        <RABox component="li">
          <RATypography variant="body2">
            <strong>Review Risk Report:</strong> Users receive a visual and numeric breakdown of the assessments and the
            derived parameters that can be used to configure anonymization tools.
          </RATypography>
        </RABox>
      </RABox>

      <RABox
        component="img"
        src={workflow}
        alt="Application Workflow"
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
