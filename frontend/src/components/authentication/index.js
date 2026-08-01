import React, { useState, useEffect } from "react";
import { useAuth, hasAuthParams } from "react-oidc-context";
import { useDispatch } from "react-redux";
import { useLocation, Navigate } from "react-router-dom";

import { fetchDatasets } from "store/datasets/datasetsThunks";
import { fetchRecipients } from "store/recipients/recipientsThunks";
import { fetchDataSharingActivities } from "store/dataSharingActivities/dataSharingActivitiesThunks";
import { fetchConfigurations } from "store/configurations/configurationThunks";

import RABox from "components/layout/RABox";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import RAAlert from "components/feedback/RAAlert";
import RATypography from "components/display/RATypography";
import { useTranslation } from "react-i18next";

export default function AuthenticationGuard({ children }) {
  // Re-added activeNavigator to prevent infinite loops
  const {
    isLoading,
    isAuthenticated,
    error: authError,
    user,
    activeNavigator,
  } = useAuth();
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const [showSpinner, setShowSpinner] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Once authenticated → load domain data + config list
  useEffect(() => {
    let active = true;

    if (isAuthenticated && user?.access_token) {
      setShowSpinner(true);
      const token = user.access_token;
      Promise.all([
        dispatch(fetchDatasets(token)),
        dispatch(fetchRecipients(token)),
        dispatch(fetchDataSharingActivities(token)),
        dispatch(fetchConfigurations(token)),
      ]).then((results) => {
        if (!active) return;

        // Check if any of the 4 fetches failed
        const hasFailure = results.some(
          (action) => action.meta && action.meta.requestStatus === "rejected"
        );

        if (hasFailure) {
          setErrorMessage(
            t(
              "common.sessionExpiredError",
              "Your session may have expired or an error occurred. Please open the app in a new tab to re-authenticate."
            )
          );
        }
        setShowSpinner(false);
      });
    }

    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.access_token, dispatch, t]);

  // Timeout protection (8 seconds)
  useEffect(() => {
    if (!showSpinner) return;
    const timer = setTimeout(() => {
      setErrorMessage(
        "Loading timeout exceeded. Please check your connection and try again."
      );
      setShowSpinner(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [showSpinner]);

  // Clear error messages after 5 sec
  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(""), 5000);
    return () => clearTimeout(t);
  }, [errorMessage]);

  // --- AUTHENTICATION RENDER LOGIC ---

  // Protect the OIDC callback from being interrupted by React Router.
  if (isLoading || activeNavigator || hasAuthParams()) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Redirect to /init if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/init" replace state={{ from: pathname }} />;
  }

  // Show spinner while initial data fetching happens
  if (showSpinner) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Auth error fallback
  if (authError) {
    return <Navigate to="/init" replace />;
  }

  return (
    <>
      {children}
      {errorMessage && (
        <RABox
          sx={{
            position: "fixed",
            bottom: (theme) => theme.spacing(2),
            right: (theme) => theme.spacing(2),
            zIndex: (theme) => theme.zIndex.snackbar,
            width: { xs: "90%", sm: 480 },
            maxWidth: "90vw",
            px: 1,
          }}
        >
          <RAAlert
            color="error"
            dismissible
            onClose={() => setErrorMessage("")}
          >
            <RATypography
              variant="body2"
              color="white"
              sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {errorMessage}
            </RATypography>
          </RAAlert>
        </RABox>
      )}
    </>
  );
}
