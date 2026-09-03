import PropTypes from "prop-types";
import { CircularProgress } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import TableViewIcon from "@mui/icons-material/TableView";
import { useTranslation } from "react-i18next";

import RAButton from "components/input/RAButton";
import RABox from "components/layout/RABox";

export default function ReportExportActions({
  isComputing,
  isGeneratingPdf,
  onDownloadPdf,
  onDownloadExcel,
}) {
  const { t } = useTranslation();

  return (
    <RABox display="flex" gap={3} justifyContent="center" my={4}>
      <RAButton
        variant="outlined"
        startIcon={
          isGeneratingPdf ? <CircularProgress size={20} /> : <DownloadIcon />
        }
        disabled={isComputing || isGeneratingPdf}
        onClick={onDownloadPdf}
        aria-label={t("report.downloadPdf")}
      >
        {isGeneratingPdf ? t("report.generatingPdf") : t("report.downloadPdf")}
      </RAButton>

      <RAButton
        variant="contained"
        color="success"
        startIcon={<TableViewIcon />}
        disabled={isComputing || isGeneratingPdf}
        onClick={onDownloadExcel}
        aria-label={t("report.downloadExcel", "Export to Excel")}
        sx={{ color: "white" }}
      >
        {t("report.downloadExcel", "Export to Excel")}
      </RAButton>
    </RABox>
  );
}

ReportExportActions.propTypes = {
  isComputing: PropTypes.bool.isRequired,
  isGeneratingPdf: PropTypes.bool.isRequired,
  onDownloadPdf: PropTypes.func.isRequired,
  onDownloadExcel: PropTypes.func.isRequired,
};
