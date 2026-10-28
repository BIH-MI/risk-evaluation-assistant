import { matchPath, useLocation } from "react-router-dom";
import useMediaQuery from "@mui/material/useMediaQuery";

// Below this window width (laptops) the sidebar never takes room from the
// page: it is hidden and opens over the content from the navbar's menu.
export const SIDENAV_DOCK_MIN_WIDTH = 1600;

// Pages that need the full width; the sidebar opens over them, as on a
// laptop, whatever the window width.
const FULL_WIDTH_ROUTES = [
  "/datasets/:datasetId/assessments/new",
  "/datasets/:datasetId/assessments/:assessmentId/edit",
];

/**
 * Whether the sidebar may be docked beside the page: a wide window and a
 * page that does not need the full width.
 */
export function useSidenavDockable() {
  const wide = useMediaQuery(`(min-width:${SIDENAV_DOCK_MIN_WIDTH}px)`, {
    noSsr: true,
  });
  const { pathname } = useLocation();
  const fullWidthPage = FULL_WIDTH_ROUTES.some((pattern) =>
    matchPath(pattern, pathname)
  );
  return wide && !fullWidthPage;
}
