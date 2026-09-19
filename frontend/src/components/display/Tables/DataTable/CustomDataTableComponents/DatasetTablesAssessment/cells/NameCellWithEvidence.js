import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RABox from "components/layout/RABox";
import { MemoNameCell } from "../../RowComponents";
import {
  NameEvidenceTooltip,
  evidenceTooltipComponentsProps,
} from "../evidence";

function hasAutomaticDirectIdentifierSummary(attribute) {
  return Boolean(
    attribute?.directIdentifierEvidenceSource ||
      attribute?.directIdentifierConcept ||
      attribute?.directIdentifierConfidence
  );
}

function hasNameCellEvidence(attribute) {
  return Boolean(
    attribute?.candidateQidCombinations?.length ||
      hasAutomaticDirectIdentifierSummary(attribute) ||
      attribute?.isDirectIdentifier ||
      attribute?.isExcluded
  );
}

function NameEvidenceInfoIcon({ attribute, t }) {
  if (!hasNameCellEvidence(attribute)) return null;

  return (
    <Tooltip
      arrow
      placement="top"
      componentsProps={evidenceTooltipComponentsProps}
      title={<NameEvidenceTooltip attribute={attribute} t={t} />}
    >
      <IconButton
        size="small"
        aria-label={t("datasetAssessments.evidence.info", "Evidence")}
        sx={{
          position: "absolute",
          top: -8,
          right: -8,
          zIndex: 2,
          width: 20,
          height: 20,
          p: 0,
          color: "info.main",
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 1,
          "&:hover": {
            bgcolor: "background.paper",
          },
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Tooltip>
  );
}

function NameCellWithEvidence({ row, t }) {
  const attribute = row.original;
  const hasCandidateQidEvidence =
    attribute.candidateQidCombinations?.length > 0;

  return (
    <RABox
      sx={(theme) => ({
        position: "relative",
        width: "100%",
        ...(hasCandidateQidEvidence
          ? {
              "& .MuiOutlinedInput-root": {
                backgroundColor: alpha(
                  theme.palette.warning.main,
                  theme.palette.mode === "dark" ? 0.24 : 0.16
                ),
              },
              "& .MuiOutlinedInput-root.Mui-disabled": {
                backgroundColor: alpha(
                  theme.palette.warning.main,
                  theme.palette.mode === "dark" ? 0.24 : 0.16
                ),
              },
            }
          : {}),
      })}
    >
      <MemoNameCell
        disabled
        initialValue={attribute.name}
        dataType={attribute.dataType}
      />
      <NameEvidenceInfoIcon attribute={attribute} t={t} />
    </RABox>
  );
}

export default NameCellWithEvidence;
