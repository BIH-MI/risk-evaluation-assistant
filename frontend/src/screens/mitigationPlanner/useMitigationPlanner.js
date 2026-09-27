import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "react-oidc-context";

import { fetchMitigationOpportunitiesApi } from "api/mitigationPlanner";

export default function useMitigationPlanner() {
  const { id: rawId } = useParams();
  const [searchParams] = useSearchParams();
  const rawThreshold = searchParams.get("manualRiskThreshold");
  const parsedThreshold = rawThreshold === null ? NaN : Number(rawThreshold);
  const manualRiskThreshold = Number.isFinite(parsedThreshold) ? parsedThreshold : null;
  const { user } = useAuth();
  const token = user?.access_token;

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token || !rawId) return undefined;

    let cancelled = false;
    setLoading(true);
    setErrorMessage("");

    fetchMitigationOpportunitiesApi(rawId, token, manualRiskThreshold)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(
            error?.message || "Failed to load the mitigation planner."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawId, token, manualRiskThreshold]);

  const clearError = useCallback(() => setErrorMessage(""), []);

  return {
    activityId: rawId,
    token,
    manualRiskThreshold,
    overview,
    loading,
    errorMessage,
    clearError,
  };
}
