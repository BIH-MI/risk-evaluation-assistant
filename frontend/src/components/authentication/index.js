import React, { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, Navigate } from "react-router-dom";

import { fetchDatasets } from "store/datasets/datasetsThunks";
import { fetchQuestions } from "store/questions/questionsThunks";
import { fetchRecipients } from "store/recipients/recipientsThunks";
import { fetchDataSharingActivities } from "store/dataSharingActivities/dataSharingActivitiesThunks";
import { fetchRiskBands } from "store/riskBands/riskBandsThunks";

import RABox from "components/layout/RABox";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import RAAlert from "components/feedback/RAAlert";
import RATypography from "components/display/RATypography";

export default function AuthenticationGuard({ children }) {
  const { isLoading, isAuthenticated, error: authError, user, signoutRedirect } = useAuth();
  const dispatch = useDispatch();
  const { pathname } = useLocation();

  const [showSpinner, setShowSpinner] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const datasetsStatus = useSelector((s) => s.datasets.status);
  const questionsStatus = useSelector((s) => s.questions.status);
  const recipientsStatus = useSelector((s) => s.recipients.status);
  const dataSharingStatus = useSelector((s) => s.dataSharingActivities.status);
  const riskBandsStatus = useSelector((s) => s.riskBands.status);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Once authenticated → load secured data
  useEffect(() => {
    if (isAuthenticated && user?.access_token) {
      const token = user.access_token;
      dispatch(fetchQuestions(token));
      dispatch(fetchDatasets(token));
      dispatch(fetchRecipients(token));
      dispatch(fetchDataSharingActivities(token));
      dispatch(fetchRiskBands(token));
    }
  }, [isAuthenticated, user?.access_token, dispatch]);

  // When all redux data loads → stop spinner
  useEffect(() => {
    if (
      questionsStatus === "succeeded" &&
      datasetsStatus === "succeeded" &&
      recipientsStatus === "succeeded" &&
      dataSharingStatus === "succeeded" &&
      riskBandsStatus === "succeeded"
    ) {
      setShowSpinner(false);
    }

    if (
      [questionsStatus, datasetsStatus, recipientsStatus, dataSharingStatus, riskBandsStatus].includes("failed")
    ) {
      setErrorMessage("Something went wrong. Please refresh the page.");
      setShowSpinner(false);
    }
  }, [
    questionsStatus,
    datasetsStatus,
    recipientsStatus,
    dataSharingStatus,
    riskBandsStatus,
    signoutRedirect,
  ]);

  // Timeout protection
  useEffect(() => {
    if (!showSpinner) return;
    const timer = setTimeout(() => {
      setErrorMessage("Loading timeout exceeded. Please check your connection and try again.");
      setShowSpinner(false);
      signoutRedirect();
    }, 8000);
    return () => clearTimeout(timer);
  }, [showSpinner, signoutRedirect]);

  // Clear error messages after 5 sec
  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(""), 5000);
    return () => clearTimeout(t);
  }, [errorMessage]);

  // --- FIX: Redirect to /init instead of /login ---
  // When not authenticated → go to /init route.
  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/init" replace state={{ from: pathname }} />;
  }

  // Show spinner while initial loading
  if (showSpinner || isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Auth error fallback
  // --- FIX: Redirect to /init instead of /login ---
  if (authError) {
    return <Navigate to="/init" replace />;
  }

  // UI error messages
  if (errorMessage) {
    return (
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
        <RAAlert color="error" dismissible onClose={() => setErrorMessage("")}>
          <RATypography
            variant="body2"
            color="white"
            sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
          >
            {errorMessage}
          </RATypography>
        </RAAlert>
      </RABox>
    );
  }

  return <>{children}</>;
}