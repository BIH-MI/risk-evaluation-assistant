/**
 * Redux thunks in this app reject with `rejectWithValue(err.message)`, so
 * `dispatch(thunk()).unwrap()` throws a plain string on failure.
 */
export function getErrorMessage(error, fallback = "") {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return fallback;
}
