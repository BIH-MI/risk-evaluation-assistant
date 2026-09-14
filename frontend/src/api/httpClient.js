export const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8080";

/**
 * Extracts the backend's actual error message from a failed response and
 * throws it as a standard Error. Spring's exception handlers return either a
 * JSON body ({message}/{error}) or plain text depending on which handler
 * matched, so both are tried before falling back to defaultMsg.
 */
export async function handleApiError(res, defaultMsg) {
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
