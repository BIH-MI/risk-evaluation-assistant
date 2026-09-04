// src/utils/CSVDropzone.js
import React, { useCallback } from "react";
import { Box, FormControl, FormHelperText, Typography } from "@mui/material";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import RAButton from "components/input/RAButton";

export function CSVDropzone({
  onParse,
  error,
  setError,
  onAddTable,
  onManualAdd,
  disabled = false,
}) {
  const { t } = useTranslation();

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
        const addResult = onAddTable(file);
        if (addResult !== false) {
          onParse(file, addResult);
        }
      });
    },
    [onParse, setError, onAddTable, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: true,
    disabled,
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
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
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
        disabled={disabled}
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
