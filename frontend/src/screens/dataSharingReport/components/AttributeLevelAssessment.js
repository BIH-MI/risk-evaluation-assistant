import { useMemo } from "react";
import PropTypes from "prop-types";
import Checkbox from "@mui/material/Checkbox";
import { Trans, useTranslation } from "react-i18next";

import DataTable from "components/display/Tables/DataTable";
import { MemoScaleCell } from "components/display/Tables/DataTable/CustomDataTableComponents/RowComponents";
import RABox from "components/layout/RABox";
import RAInput from "components/input/RAInput";
import RATypography from "components/display/RATypography";
import {
  buildAttributeAssessmentTables,
  formatAttributeDimensionRanges,
} from "../reportDataUtils";

const SCALE_COLUMNS = [
  {
    field: "replicability",
    translationKey: "report.attributes.replicability",
    fallbackLabel: "Replicability",
  },
  {
    field: "availability",
    translationKey: "report.attributes.availability",
    fallbackLabel: "Availability",
  },
  {
    field: "distinguishability",
    translationKey: "report.attributes.distinguishability",
    fallbackLabel: "Distinguishability",
  },
  {
    field: "sensitivity",
    translationKey: "report.attributes.sensitivity",
    fallbackLabel: "Sensitivity",
  },
];

function createScaleColumn({ field, label, scoringSystem }) {
  return {
    Header: label,
    accessor: field,
    width: "10%",
    align: "center",
    Cell: ({ value }) => (
      <MemoScaleCell
        field={field}
        scoringSystem={scoringSystem}
        initialValue={value}
        onCommit={() => {}}
        disabled
      />
    ),
  };
}

export default function AttributeLevelAssessment({
  tableAssessments,
  identifiabilityThreshold,
  sensitivityThreshold,
  scoringSystem,
}) {
  const { t } = useTranslation();
  const scaleLabelsByField = useMemo(
    () =>
      SCALE_COLUMNS.reduce((labelsByField, column) => {
        labelsByField[column.field] = t(
          column.translationKey,
          column.fallbackLabel
        );
        return labelsByField;
      }, {}),
    [t]
  );
  const scaleRangeSummary = useMemo(
    () => formatAttributeDimensionRanges(scoringSystem, scaleLabelsByField),
    [scaleLabelsByField, scoringSystem]
  );
  const columns = useMemo(
    () => [
      {
        Header: t("report.attributes.name", "Name"),
        accessor: "name",
        width: "13%",
        align: "left",
        Cell: ({ value }) => (
          <RATypography variant="subtitle">{value}</RATypography>
        ),
      },
      ...SCALE_COLUMNS.map((column) =>
        createScaleColumn({
          field: column.field,
          label: scaleLabelsByField[column.field],
          scoringSystem,
        })
      ),
      {
        Header: t("report.attributes.directIdentifier", "Direct Identifier"),
        accessor: "directIdentifier",
        width: "10%",
        align: "center",
        Cell: ({ value }) => <Checkbox checked={Boolean(value)} disabled />,
      },
      {
        Header: t("report.attributes.quasiIdentifier", "Quasi Identifier"),
        accessor: "quasiIdentifier",
        width: "10%",
        align: "center",
        Cell: ({ value }) => <Checkbox checked={Boolean(value)} disabled />,
      },
      {
        Header: t(
          "report.attributes.sensitiveAttribute",
          "Sensitive Attribute"
        ),
        accessor: "sensitiveAttribute",
        width: "10%",
        align: "center",
        Cell: ({ value }) => <Checkbox checked={Boolean(value)} disabled />,
      },
    ],
    [scaleLabelsByField, scoringSystem, t]
  );
  const tableData = useMemo(
    () =>
      buildAttributeAssessmentTables({
        tableAssessments,
        identifiabilityThreshold,
        sensitivityThreshold,
        scoringSystem,
      }),
    [
      identifiabilityThreshold,
      scoringSystem,
      sensitivityThreshold,
      tableAssessments,
    ]
  );

  return (
    <RABox mt={3} mb={3}>
      <RATypography variant="body2" paragraph mb={4}>
        <Trans
          i18nKey="report.attributes.explanation"
          values={{
            identThreshold: identifiabilityThreshold,
            sensThreshold: sensitivityThreshold,
            scaleRange: scaleRangeSummary,
          }}
          components={{ strong: <strong /> }}
          defaults="Each table's attributes are scored with the configured Attribute Scoring System ({{scaleRange}}). An attribute is automatically marked as a Quasi-Identifier if the sum of its Replicability, Availability, and Distinguishability scores is greater than <strong>{{identThreshold}}</strong>. It is marked as a Sensitive Attribute if its Sensitivity score is greater than <strong>{{sensThreshold}}</strong>."
        />
      </RATypography>

      {tableData.length === 0 ? (
        <RATypography variant="body2">
          {t("report.attributes.noTables", "No table assessments available.")}
        </RATypography>
      ) : (
        tableData.map((tableSection) => (
          <RABox key={tableSection.id || tableSection.tableName} mb={4}>
            <RABox mb={2}>
              <RAInput
                label={t("report.attributes.tableName", "Table Name")}
                value={tableSection.tableName}
                disabled
                variant="standard"
                mb={1}
                sx={{ maxWidth: 300 }}
              />
            </RABox>

            <DataTable
              table={{ columns, rows: tableSection.rows }}
              canSearch={false}
              canAdd={false}
              isSorted={false}
              showAllEntries
            />
          </RABox>
        ))
      )}
    </RABox>
  );
}

AttributeLevelAssessment.propTypes = {
  tableAssessments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      tableId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      tableName: PropTypes.string,
      attributes: PropTypes.arrayOf(PropTypes.object),
    })
  ),
  identifiabilityThreshold: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
  sensitivityThreshold: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]).isRequired,
  scoringSystem: PropTypes.object,
};

AttributeLevelAssessment.defaultProps = {
  tableAssessments: [],
  scoringSystem: null,
};
