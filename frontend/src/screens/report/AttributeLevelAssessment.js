import React, { useMemo } from "react";
import DataTable from "../../components/display/Tables/DataTable";
import RABox from "../../components/layout/RABox";
import RATypography from "../../components/display/RATypography";
import Checkbox from "@mui/material/Checkbox";
import RAInput from "../../components/input/RAInput";
import { MemoScaleCell } from "../../components/display/Tables/DataTable/CustomDataTableComponents/RowComponents";
import { Trans, useTranslation } from "react-i18next";

export default function AttributeLevelAssessment({
  tableAssessments,
  identifiabilityThreshold,
  sensitivityThreshold,
}) {
  const { t } = useTranslation();

  // Column definitions
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
      {
        Header: t("report.attributes.replicability", "Replicability"),
        accessor: "replicability",
        width: "10%",
        align: "center",
        Cell: ({ value }) => (
          <MemoScaleCell
            initialValue={value}
            onCommit={() => {}}
            disabled={true}
          />
        ),
      },
      {
        Header: t("report.attributes.availability", "Availability"),
        accessor: "availability",
        width: "10%",
        align: "center",
        Cell: ({ value }) => (
          <MemoScaleCell
            initialValue={value}
            onCommit={() => {}}
            disabled={true}
          />
        ),
      },
      {
        Header: t("report.attributes.distinguishability", "Distinguishability"),
        accessor: "distinguishability",
        width: "10%",
        align: "center",
        Cell: ({ value }) => (
          <MemoScaleCell
            initialValue={value}
            onCommit={() => {}}
            disabled={true}
          />
        ),
      },
      {
        Header: t("report.attributes.sensitivity", "Sensitivity"),
        accessor: "sensitivity",
        width: "10%",
        align: "center",
        Cell: ({ value }) => (
          <MemoScaleCell
            initialValue={value}
            onCommit={() => {}}
            disabled={true}
          />
        ),
      },
      {
        Header: t("report.attributes.directIdentifier", "Direct Identifier"),
        accessor: "directIdentifier",
        width: "10%",
        align: "center",
        Cell: ({ value }) => <Checkbox checked={value} disabled />,
      },
      {
        Header: t("report.attributes.quasiIdentifier", "Quasi Identifier"),
        accessor: "quasiIdentifier",
        width: "10%",
        align: "center",
        Cell: ({ value }) => <Checkbox checked={value} disabled />,
      },
      {
        Header: t(
          "report.attributes.sensitiveAttribute",
          "Sensitive Attribute"
        ),
        accessor: "sensitiveAttribute",
        width: "10%",
        align: "center",
        Cell: ({ value }) => <Checkbox checked={value} disabled />,
      },
    ],
    [t]
  );

  // Build the per-table data
  const tableData = useMemo(() => {
    if (!Array.isArray(tableAssessments) || tableAssessments.length === 0) {
      return [];
    }

    return tableAssessments.map((ta) => {
      const rows = (ta.attributes || []).map((attr) => {
        if (attr.isDirectIdentifier) {
          return {
            name: attr.name,
            replicability: null,
            availability: null,
            distinguishability: null,
            sensitivity: null,
            directIdentifier: true,
            quasiIdentifier: false,
            sensitiveAttribute: false,
          };
        }

        const r = attr.replicability ?? 0;
        const a = attr.availability ?? 0;
        const d = attr.distinguishability ?? 0;
        const s = attr.sensitivity ?? 0;
        const totalScore = r + a + d;

        return {
          name: attr.name,
          replicability: r,
          availability: a,
          distinguishability: d,
          sensitivity: s,
          directIdentifier: false,
          quasiIdentifier: totalScore > (identifiabilityThreshold || 0),
          sensitiveAttribute: s > (sensitivityThreshold || 0),
        };
      });

      // Sort rows explicitly: Direct > Quasi > Sensitive > Normal
      rows.sort((a, b) => {
        const getRank = (row) => {
          if (row.directIdentifier) return 1;
          if (row.quasiIdentifier) return 2;
          if (row.sensitiveAttribute) return 3;
          return 4; // Standard attributes
        };
        return getRank(a) - getRank(b);
      });

      return {
        id: ta.id,
        tableName: ta.name || ta.tableName,
        rows,
      };
    });
  }, [tableAssessments, identifiabilityThreshold, sensitivityThreshold]);

  return (
    <RABox mt={3} mb={3}>
      <RATypography variant="body2" paragraph mb={4}>
        <Trans
          i18nKey="report.attributes.explanation"
          values={{
            identThreshold: identifiabilityThreshold,
            sensThreshold: sensitivityThreshold,
          }}
          components={{ strong: <strong /> }}
          defaults="Each table's attributes are scored on replicability, availability, distinguishability, and sensitivity (1-3). An attribute is automatically marked as a Quasi-Identifier if the sum of its Replicability, Availability, and Distinguishability scores is greater than <strong>{{identThreshold}}</strong>. It is marked as a Sensitive Attribute if its Sensitivity score is greater than <strong>{{sensThreshold}}</strong>."
        />
      </RATypography>

      {tableData.length === 0 ? (
        <RATypography variant="body2">
          {t("report.attributes.noTables", "No table assessments available.")}
        </RATypography>
      ) : (
        tableData.map((td) => (
          <RABox key={td.id} mb={4}>
            <RABox mb={2}>
              <RAInput
                label={t("report.attributes.tableName", "Table Name")}
                value={td.tableName}
                disabled
                variant="standard"
                mb={1}
                sx={{ maxWidth: 300 }}
              />
            </RABox>

            <DataTable
              table={{ columns, rows: td.rows }}
              canSearch={false}
              canAdd={false}
              isSorted={false}
              showAllEntries={true}
            />
          </RABox>
        ))
      )}
    </RABox>
  );
}
