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
import { getErrorMessage } from "utils/errors";

import getConfigurationsTableData from "./getConfigurationsTableData";

import {
  fetchConfigurations,
  forkConfiguration,
  archiveConfiguration,
  setDefaultConfiguration,
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

  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const [toForkId, setToForkId] = useState(null);
  const [toForkBaseName, setToForkBaseName] = useState("");
  const [newConfigName, setNewConfigName] = useState("");
  const [archiveTarget, setArchiveTarget] = useState(null);

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

  // --- FORK LOGIC ---
  const handleForkClick = (config) => {
    setToForkId(config.id);
    setToForkBaseName(config.name);
    setNewConfigName(`${config.name} Fork`);
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
        .then(() => {
          handleForkClose();
          dispatch(fetchConfigurations(token));
        })
        .catch((err) => {
          setErrorMsg(
            getErrorMessage(err, t("configurations.alerts.forkError"))
          );
          handleForkClose();
        });
    }
  };

  const handleSetDefault = (config) => {
    if (!config?.id || !token) return;
    dispatch(setDefaultConfiguration({ id: config.id, token }))
      .unwrap()
      .then(() => dispatch(fetchConfigurations(token)))
      .catch((err) => {
        setErrorMsg(
          getErrorMessage(err, "Failed to set default configuration.")
        );
      });
  };

  const handleArchiveConfirm = () => {
    if (!archiveTarget?.id || !token) return;
    dispatch(archiveConfiguration({ id: archiveTarget.id, token }))
      .unwrap()
      .then(() => {
        setArchiveTarget(null);
        dispatch(fetchConfigurations(token));
      })
      .catch((err) => {
        setErrorMsg(
          getErrorMessage(err, "Failed to archive configuration.")
        );
        setArchiveTarget(null);
      });
  };

  const { columns, rows } = getConfigurationsTableData(
    sortedConfigurations,
    (config) => handleEdit(config.id),
    handleForkClick,
    handleSetDefault,
    setArchiveTarget,
    isAdmin
  );

  return (
    <RABox>
      <RABox py={3} sx={{ "& .MuiTableRow-root": { height: 56 } }}>
        <DataTable
          table={{ columns, rows }}
          canSearch
          canAdd={isAdmin}
          searchColumnKey="displayName"
          searchPlaceholder={t(
            "configurations.searchPlaceholder",
            "Search configurations..."
          )}
          onAddClick={isAdmin ? handleAdd : undefined}
        />
      </RABox>

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

      <RADialog
        open={Boolean(archiveTarget)}
        title="Archive Configuration"
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        cancelText={t("common.cancel", "Cancel")}
        confirmText="Archive"
      >
        <RATypography variant="body2">
          Archive {archiveTarget?.name}? Existing assessments will keep using
          their saved configuration version, but this configuration will no
          longer be selectable for new assessments.
        </RATypography>
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
