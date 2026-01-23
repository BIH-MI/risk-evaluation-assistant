// src/components/navigation/Breadcrumbs.jsx

import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { Breadcrumbs as MuiBreadcrumbs } from "@mui/material";
import Icon from "@mui/material/Icon";
import RATypography from "components/display/RATypography";
import RABox from "components/layout/RABox";

// Human‐friendly labels for each segment
const LABEL_MAP = {
    datasets:    "Datasets",
    dataset:     "Datasets",
    assessments: "Assessments",
    assessment:  "Assessments",
    recipients:  "Recipients",
    recipient:   "Recipients",
    new:         "New",
    edit:        "Edit",
};

function Breadcrumbs({ icon, route, light }) {
    // Split the incoming route string into segments (e.g. "/dataset/assessments/42/edit" → ["dataset","assessments","42","edit"])
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
            // Do not update lastNonNumericKey
        } else {
            // Non‐numeric segment: compute `path` based on `key` and `lastNonNumericKey`
            if (key === "datasets" || key === "dataset") {
                path = "/datasets";
            } else if (key === "recipients" || key === "recipient") {
                path = "/recipients";
            } else if (key === "assessments") {
                // Link to dataset or recipient assessments depending on lastNonNumericKey
                if (lastNonNumericKey === "datasets") {
                    path = "/datasets/assessments";
                } else if (lastNonNumericKey === "recipients") {
                    path = "/recipients/assessments";
                }
            } else {
                // e.g. "new" or "edit"
                path = `/${key}`;
            }
            // Update lastNonNumericKey since this segment is non‐numeric
            lastNonNumericKey = key;
        }

        // Determine label (use LABEL_MAP if present, otherwise capitalize)
        const label = LABEL_MAP[key] || key.charAt(0).toUpperCase() + key.slice(1);
        breadcrumbs.push({ label, path, isNumber });
    });

    // Page title: join non‐numeric segments, converting hyphens to spaces and capitalizing each word
    const pageTitle = segments
        .filter((seg) => isNaN(Number(seg)))
        .map((seg) =>
            seg
                .split("-")
                .map(
                    (word) =>
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                )
                .join(" ")
        )
        .join(" ");

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
                {/* Home icon → always links to “/” */}
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
                        // Numeric segment: plain text, no link
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
                    ) : (
                        // Non‐numeric: render as Link (if path exists) or plain text if path is null
                        path ? (
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
