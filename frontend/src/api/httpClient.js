export const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

let sessionExpired = false;
const sessionListeners = new Set();

function setSessionExpired(value) {
  if (sessionExpired === value) return;
  sessionExpired = value;
  sessionListeners.forEach((listener) => listener());
}

/**
 * Tracks whether the backend has rejected the current access token (401).
 * The authentication guard owns the single user-facing message for this
 * state, so screens read it to avoid stacking their own error on top.
 */
export const sessionState = {
  subscribe(listener) {
    sessionListeners.add(listener);
    return () => sessionListeners.delete(listener);
  },
  isExpired: () => sessionExpired,
  reset: () => setSessionExpired(false),
};

/**
 * Extracts the backend's actual error message from a failed response and
 * throws it as a standard Error. Spring's exception handlers return either a
 * JSON body ({message}/{error}) or plain text depending on which handler
 * matched, so both are tried before falling back to defaultMsg.
 */
export async function handleApiError(res, defaultMsg) {
  if (res.status === 401) setSessionExpired(true);

  const resClone = res.clone();
  let message = defaultMsg;
  let code;

  try {
    const errorData = await res.json();
    if (typeof errorData?.code === "string") {
      code = errorData.code;
    }
    if (errorData?.message) {
      message = errorData.message;
    } else if (typeof errorData?.error === "string") {
      message = errorData.error;
    }
  } catch {
    try {
      const text = await resClone.text();
      if (text && !text.trim().startsWith("<")) {
        message = text;
      }
    } catch {
      // no readable body; fall back to defaultMsg
    }
  }

  const error = new Error(message);
  error.code = code;
  error.status = res.status;
  throw error;
}
