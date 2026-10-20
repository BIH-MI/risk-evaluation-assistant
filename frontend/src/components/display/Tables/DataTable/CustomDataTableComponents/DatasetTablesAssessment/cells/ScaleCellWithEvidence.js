import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import RABox from "components/layout/RABox";
import { MemoScaleCell } from "../../RowComponents";
import {
  EvidenceTooltip,
  evidenceTooltipComponentsProps,
  evidenceTooltipLightComponentsProps,
  hasEvidenceValue,
  shouldShowEvidenceIcon,
} from "../evidence";
import OriginalValueIndicator from "./OriginalValueIndicator";
import { usePaperScreenshotMode } from "../usePaperScreenshotMode";
import {
  getAttributeFieldEvidence,
  getOriginalAssessmentValue,
  isDirectIdentifierAttribute,
  scaleValuesAreEqual,
} from "../utils/assessmentTableUtils";

// Screenshot mode: open beside the rating so the tooltip covers neither the
// attribute names nor the compact rows above; flips if there is no room.
const sidePopperProps = {
  modifiers: [
    { name: "flip", options: { fallbackPlacements: ["left", "bottom", "top"] } },
    { name: "preventOverflow", options: { padding: 8 } },
  ],
};

function EvidenceInfoIcon({ evidence, field, scoringSystem, t }) {
  const paperScreenshot = usePaperScreenshotMode();
  if (!shouldShowEvidenceIcon(evidence)) return null;

  return (
    <Tooltip
      arrow
      placement={paperScreenshot ? "right" : "top"}
      PopperProps={paperScreenshot ? sidePopperProps : undefined}
      componentsProps={
        paperScreenshot
          ? evidenceTooltipLightComponentsProps
          : evidenceTooltipComponentsProps
      }
      title={
        <EvidenceTooltip
          evidence={evidence}
          field={field}
          scoringSystem={scoringSystem}
          t={t}
        />
      }
    >
      <IconButton
        size="small"
        aria-label={t("datasetAssessments.evidence.info", "Evidence")}
        sx={{
          position: "absolute",
          top: paperScreenshot ? -6 : -8,
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

function ScaleCellWithEvidence({
  tableId,
  row,
  field,
  scoringSystem,
  changeAttr,
  attributeEvidenceById,
  originalAssessmentValuesByAttributeId,
  isReadOnly,
  t,
}) {
  const paperScreenshot = usePaperScreenshotMode();
  const attribute = row.original;
  const evidence = getAttributeFieldEvidence(
    attribute,
    field,
    attributeEvidenceById
  );
  const receivesScaleScore = !isDirectIdentifierAttribute(attribute);
  const originalValue = getOriginalAssessmentValue(
    attribute,
    field,
    originalAssessmentValuesByAttributeId
  );
  const showOriginalValue =
    receivesScaleScore &&
    hasEvidenceValue(originalValue) &&
    !scaleValuesAreEqual(attribute[field], originalValue);

  return (
    <RABox
      display="flex"
      justifyContent="center"
      alignItems="center"
      sx={{ width: "100%" }}
    >
      <RABox
        display="flex"
        justifyContent="center"
        alignItems="center"
        sx={{
          position: "relative",
          width: "116px",
          minHeight: showOriginalValue ? 58 : paperScreenshot ? 34 : 42,
          flexDirection: "column",
        }}
      >
        <MemoScaleCell
          field={field}
          scoringSystem={scoringSystem}
          disabled={isReadOnly || !receivesScaleScore}
          commitKey={`${tableId}:${attribute.attributeId}:${field}`}
          initialValue={receivesScaleScore ? attribute[field] : null}
          onCommit={(val) => {
            if (!receivesScaleScore) return;
            changeAttr(tableId, attribute.attributeId, {
              [field]: val,
            });
          }}
        />
        <EvidenceInfoIcon
          evidence={receivesScaleScore ? evidence : null}
          field={field}
          scoringSystem={scoringSystem}
          t={t}
        />
        {showOriginalValue && (
          <OriginalValueIndicator
            originalValue={originalValue}
            field={field}
            scoringSystem={scoringSystem}
            t={t}
          />
        )}
      </RABox>
    </RABox>
  );
}

export default ScaleCellWithEvidence;
