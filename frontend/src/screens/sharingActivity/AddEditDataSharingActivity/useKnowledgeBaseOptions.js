import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";

import { fetchMitigationKnowledgeBasesApi } from "api/mitigationKnowledgeBases";
import { getErrorMessage } from "utils/errors";

/** Active mitigation knowledge bases, whose current versions an activity can be pinned to. */
export default function useKnowledgeBaseOptions() {
  const { user } = useAuth();
  const token = user?.access_token;
  const [knowledgeBases, setKnowledgeBases] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return undefined;

    let active = true;
    fetchMitigationKnowledgeBasesApi(token, { activeOnly: true })
      .then((items) => {
        if (active) setKnowledgeBases(items);
      })
      .catch((cause) => {
        if (active) setError(getErrorMessage(cause));
      });

    return () => {
      active = false;
    };
  }, [token]);

  return { knowledgeBases, error };
}
