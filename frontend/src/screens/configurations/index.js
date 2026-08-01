import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { Trans, useTranslation } from "react-i18next";

import DataTable from "components/display/Tables/DataTable";
import RADialog from "components/feedback/RADialog";
import RAAlert from "components/feedback/RAAlert";
import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import RAInput from "components/input/RAInput";
import { isAdminUser } from "utils/auth";

import getConfigurationsTableData from "./getConfigurationsTableData";

import {
  fetchConfigurations,
  deleteConfiguration,
  forkConfiguration,
} from "../../store/configurations/configurationThunks";

export default function Configurations() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const token = user?.access_token;
  const theme = useTheme();

  const status = useSelector((state) => state.configurations.status);
  const rawItems = useSelector((state) => state.configurations.items);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState(null);

  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const [toForkId, setToForkId] = useState(null);
  const [toForkBaseName, setToForkBaseName] = useState("");
  const [newConfigName, setNewConfigName] = useState("");

  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch configs on mount
  useEffect(() => {
    if (token) {
      dispatch(fetchConfigurations(token));
    }
  }, [dispatch, token]);

  // Sort by newest
  const sortedConfigurations = useMemo(() => {
    if (!rawItems) return [];
    return [...rawItems].sort((a, b) => {
      const dateA = new Date(a.lastModifiedDate || a.creationDate || 0);
      const dateB = new Date(b.lastModifiedDate || b.creationDate || 0);
      return dateB - dateA;
    });
  }, [rawItems]);

  const handleAdd = () => {
    navigate("/configuration/new");
  };

  const handleEdit = (id) => {
    navigate(`/configuration/${id}/edit`);
  };

  const handleView = (id) => {
    navigate(`/configuration/${id}/view`);
  };

  // --- DELETE LOGIC ---
  const handleDeleteClick = (id) => {
    setToDeleteId(id);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setToDeleteId(null);
  };

  const handleDeleteConfirm = () => {
    if (toDeleteId && token) {
      dispatch(deleteConfiguration({ id: toDeleteId, token }))
        .unwrap()
        .then(() => handleDialogClose())
        .catch((err) => {
          const errorMessage =
            typeof err === "string"
              ? err
              : err?.message || t("configurations.alerts.deleteError");
          setErrorMsg(errorMessage);
          handleDialogClose();
        });
    }
  };

  // --- FORK LOGIC ---
  const handleForkClick = (id, baseName) => {
    setToForkId(id);
    setToForkBaseName(baseName);
    setNewConfigName(`${baseName} Fork`);
    setForkDialogOpen(true);
  };

  const handleForkClose = () => {
    setForkDialogOpen(false);
    setToForkId(null);
    setToForkBaseName("");
    setNewConfigName("");
  };

  const handleForkConfirm = () => {
    if (toForkId && newConfigName.trim() && token) {
      dispatch(forkConfiguration({ id: toForkId, newConfigName, token }))
        .unwrap()
        .then((newConfig) => {
          handleForkClose();
          dispatch(fetchConfigurations(token));
        })
        .catch((err) => {
          const errorMessage =
            typeof err === "string"
              ? err
              : err?.message || t("configurations.alerts.forkError");
          setErrorMsg(errorMessage);
          handleForkClose();
        });
    }
  };

  const { columns, rows } = getConfigurationsTableData(
    sortedConfigurations,
    handleEdit,
    handleView,
    handleForkClick,
    handleDeleteClick,
    t,
    isAdmin
  );

  return (
    <RABox>
      <RABox py={3} sx={{ "& .MuiTableRow-root": { height: 56 } }}>
        <DataTable
          table={{ columns, rows }}
          canSearch
          canAdd={isAdmin}
          searchColumnKey="name"
          searchPlaceholder={t(
            "configurations.searchPlaceholder",
            "Search configurations..."
          )}
          onAddClick={isAdmin ? handleAdd : undefined}
        />
      </RABox>

      {/* Delete Confirmation */}
      <RADialog
        open={dialogOpen}
        title={t("configurations.dialogs.deleteConfigTitle")}
        onClose={handleDialogClose}
        onConfirm={handleDeleteConfirm}
        cancelText={t("common.cancel", "Cancel")}
        confirmText={t("configurations.dialogs.delete", "Delete")}
      >
        <RATypography variant="body2" mt={1}>
          {t(
            "configurations.dialogs.deleteConfigWarning",
            "Are you sure you want to delete this configuration? This action cannot be undone."
          )}
        </RATypography>
      </RADialog>

      {/* Fork Dialog */}
      <RADialog
        open={forkDialogOpen}
        title={t("configurations.dialogs.forkTitle", "Fork Configuration")}
        onClose={handleForkClose}
        onConfirm={handleForkConfirm}
        cancelText={t("common.cancel", "Cancel")}
        confirmText={t("configurations.dialogs.createFork", "Create Fork")}
      >
        <RABox mt={1}>
          <RATypography variant="body2" mb={3} component="div">
            <Trans
              i18nKey="configurations.dialogs.forkDesc"
              values={{ name: toForkBaseName }}
              components={{ strong: <strong /> }}
              defaults="Create a new standalone copy of <strong>{{name}}</strong>."
            />
          </RATypography>
          <RAInput
            label={t(
              "configurations.dialogs.forkNewName",
              "New Configuration Name"
            )}
            fullWidth
            value={newConfigName}
            onChange={(e) => setNewConfigName(e.target.value)}
          />
        </RABox>
      </RADialog>

      {/* Alerts */}
      <RABox
        sx={{
          position: "fixed",
          bottom: theme.spacing(2),
          right: theme.spacing(2),
          zIndex: theme.zIndex.snackbar,
          width: 350,
        }}
      >
        {errorMsg && (
          <RAAlert color="error" dismissible onClose={() => setErrorMsg(null)}>
            <RATypography variant="body2" color="white">
              {errorMsg}
            </RATypography>
          </RAAlert>
        )}
        {status === "loading" && (
          <RAAlert color="info">
            <RATypography variant="body2" color="white">
              {t("configurations.alerts.loading", "Loading configurations...")}
            </RATypography>
          </RAAlert>
        )}
      </RABox>
    </RABox>
  );
}
