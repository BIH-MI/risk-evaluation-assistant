// src/components/navigation/Breadcrumbs.jsx

import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { Breadcrumbs as MuiBreadcrumbs } from "@mui/material";
import Icon from "@mui/material/Icon";
import RATypography from "components/display/RATypography";
import RABox from "components/layout/RABox";

import { useTranslation } from "react-i18next";

// Human‐friendly fallback labels for each segment
const LABEL_MAP = {
  datasets: "Datasets",
  dataset: "Datasets",
  assessments: "Assessments",
  assessment: "Assessments",
  recipients: "Recipients",
  recipient: "Recipients",
  new: "New",
  edit: "Edit",
};

function Breadcrumbs({ icon, route, light }) {
  const { t } = useTranslation();

  // Split the incoming route string into segments
  const segments = Array.isArray(route)
    ? route
    : route.split("/").filter(Boolean);

  const breadcrumbs = [];
  let lastNonNumericKey = null;

  segments.forEach((seg) => {
    const key = seg.toLowerCase();
    const isNumber = !isNaN(Number(seg));

    let path = null;

    if (isNumber) {
      // Numeric segment: no link, leave path null
    } else {
      if (key === "datasets" || key === "dataset") {
        path = "/datasets";
      } else if (key === "recipients" || key === "recipient") {
        path = "/recipients";
      } else if (key === "assessments") {
        if (lastNonNumericKey === "datasets") {
          path = "/datasets/assessments";
        } else if (lastNonNumericKey === "recipients") {
          path = "/recipients/assessments";
        }
      } else {
        path = `/${key}`;
      }
      lastNonNumericKey = key;
    }

    // Determine default fallback string
    const defaultLabel =
      LABEL_MAP[key] || key.charAt(0).toUpperCase() + key.slice(1);

    // Translate using a predictable key pattern, using the defaultLabel if not found
    const label = t(`navigation.${key}`, defaultLabel);

    breadcrumbs.push({ label, path, isNumber });
  });

  // Page title logic
  const rawPageTitle = segments
    .filter((seg) => isNaN(Number(seg)))
    .map((seg) =>
      seg
        .split("-")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ")
    )
    .join(" ");

  // Ensure the page title is also translated by trying to look it up in your JSON files
  const pageTitle = t(
    `navigation.${rawPageTitle.replace(/ /g, "")}`,
    rawPageTitle
  );

  return (
    <RABox mr={{ xs: 0, xl: 8 }}>
      <MuiBreadcrumbs
        sx={{
          "& .MuiBreadcrumbs-separator": {
            color: ({ palette: { white, grey } }) =>
              light ? white.main : grey[600],
          },
        }}
      >
        <Link to="/">
          <RATypography
            component="span"
            variant="body2"
            color={light ? "white" : "dark"}
            opacity={light ? 0.8 : 0.5}
            sx={{ lineHeight: 0 }}
          >
            <Icon>{icon}</Icon>
          </RATypography>
        </Link>

        {breadcrumbs.map(({ label, path, isNumber }, idx) =>
          isNumber ? (
            <RATypography
              key={`${label}-${idx}`}
              component="span"
              variant="button"
              fontWeight="regular"
              textTransform="none"
              color={light ? "white" : "dark"}
              opacity={light ? 0.8 : 0.5}
              sx={{ lineHeight: 0 }}
            >
              {label}
            </RATypography>
          ) : path ? (
            <Link to={path} key={path}>
              <RATypography
                component="span"
                variant="button"
                fontWeight="regular"
                textTransform="none"
                color={light ? "white" : "dark"}
                opacity={light ? 0.8 : 0.5}
                sx={{ lineHeight: 0 }}
              >
                {label}
              </RATypography>
            </Link>
          ) : (
            <RATypography
              key={`${label}-${idx}`}
              component="span"
              variant="button"
              fontWeight="regular"
              textTransform="none"
              color={light ? "white" : "dark"}
              opacity={light ? 0.8 : 0.5}
              sx={{ lineHeight: 0 }}
            >
              {label}
            </RATypography>
          )
        )}
      </MuiBreadcrumbs>

      <RATypography
        fontWeight="bold"
        textTransform="none"
        variant="h6"
        color={light ? "white" : "dark"}
        noWrap
      >
        {pageTitle}
      </RATypography>
    </RABox>
  );
}

Breadcrumbs.defaultProps = {
  light: false,
};

Breadcrumbs.propTypes = {
  icon: PropTypes.node.isRequired,
  route: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  light: PropTypes.bool,
};

export default Breadcrumbs;
