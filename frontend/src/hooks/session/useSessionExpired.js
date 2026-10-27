import { useSyncExternalStore } from "react";

import { sessionState } from "api/httpClient";

/**
 * True once any API call has been rejected with 401 for the current token.
 */
export function useSessionExpired() {
  return useSyncExternalStore(sessionState.subscribe, sessionState.isExpired);
}
