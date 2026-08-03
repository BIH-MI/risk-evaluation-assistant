// src/utils/CSVDropzone.js
import React, { useCallback } from "react";
import { Box, FormControl, FormHelperText, Typography } from "@mui/material";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { detectMeasurement } from "./detectMeasurement";
import { useTranslation } from "react-i18next";
import RAButton from "components/input/RAButton";

export function CSVDropzone({
  onParse,
  error,
  setError,
  onAddTable,
  onManualAdd,
}) {
  const { t } = useTranslation();

  const parseCsv = useCallback(
    (file) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        worker: true,
        preview: 10000,
        complete: ({ data: rows, meta: { fields = [] } }) => {
          const columnMeta = fields.map((field) => {
            const vals = rows.map((r) => r[field]);
            const { dataType } = detectMeasurement(vals, field);
            return {
              field,
              level: dataType,
              excluded: false,
            };
          });

          onParse({
            name: file.name,
            rows: rows.length,
            headers: fields,
            columnMeta,
            data: rows,
          });
        },
        error: (err) =>
          setError(t("datasets.alerts.parseError", { message: err.message })),
      });
    },
    [onParse, setError, t]
  );

  const onDrop = useCallback(
    (acceptedFiles) => {
      setError("");
      const invalid = acceptedFiles.some(
        (f) => !f.name.toLowerCase().endsWith(".csv")
      );
      if (invalid) {
        setError(t("datasets.alerts.onlyCsv"));
        return;
      }
      acceptedFiles.forEach((file) => {
        onAddTable(file);
        parseCsv(file);
      });
    },
    [parseCsv, setError, onAddTable, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: true,
  });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: "2px dashed",
        borderColor: isDragActive ? "primary.main" : "grey.400",
        p: 4,
        textAlign: "center",
        bgcolor: isDragActive ? "grey.100" : "inherit",
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <input {...getInputProps()} />

      <Typography variant="subtitle2">
        {isDragActive
          ? t("datasets.add.dropzoneRelease")
          : t("datasets.add.dropzoneDrag")}
      </Typography>

      <Typography variant="caption" color="textSecondary">
        {t("datasets.add.dropzoneOr")}
      </Typography>

      <RAButton
        size="small"
        variant="gradient"
        onClick={(e) => {
          e.stopPropagation(); // Prevent dropzone click (file dialog)
          if (onManualAdd) onManualAdd();
        }}
      >
        {t("datasets.add.addManualTable")}
      </RAButton>

      {error && (
        <FormControl error>
          <FormHelperText>{error}</FormHelperText>
        </FormControl>
      )}
    </Box>
  );
}
