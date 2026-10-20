import { useLocation } from "react-router-dom";

/**
 * Development-only presentation mode for publication screenshots of the
 * Attribute Assessment table, enabled with `?paperScreenshot=1`. It only
 * changes layout and styling (compact rows, first page of six attributes);
 * data, ratings and evidence are unchanged. Always false in production.
 */
export function usePaperScreenshotMode() {
  const { search } = useLocation();
  if (process.env.NODE_ENV !== "development") return false;
  return new URLSearchParams(search).get("paperScreenshot") === "1";
}

export const PAPER_SCREENSHOT_ROW_COUNT = 6;
