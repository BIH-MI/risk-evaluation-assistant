// src/components/display/RAAvatar.js
import { forwardRef } from "react";
import PropTypes from "prop-types";
import RAAvatarRoot from "./RAAvatarRoot";
import defaultAvatar from "assets/images/default-user.png";
import datasetDarkIcon from "assets/images/icons/datasets/dark.png";
import datasetLightIcon from "assets/images/icons/datasets/light.png";
import datasetAssessmentIcon from "assets/images/icons/assessments/dataset.png";
import recipientAssessmentIcon from "assets/images/icons/assessments/recipient.png";
import organizationIcon from "assets/images/icons/organizations/organization.png";
import { useMaterialUIController } from "context";

// Preset theme gradient keys for initials backgrounds
const BG_COLORS = [
    "primary",
    "info",
    "success",
    "warning",
    "error",
    "dark"
];

function getColorForLetter(letter) {
    const code = letter.charCodeAt(0);
    return BG_COLORS[code % BG_COLORS.length];
}

const RAAvatar = forwardRef(({
                                 variant = "user",
                                 src,
                                 alt = "",
                                 size = "md",
                                 shadow = "none",
                                 shape = "circular",
                                 firstName,
                                 lastName,
                                 ...rest
                             }, ref) => {
    const [controller] = useMaterialUIController();
    const { darkMode } = controller;

    // Initials mode: render initials with themed background
    if (variant === "initials" && firstName && lastName) {
        const initials = `${firstName[0].toUpperCase()}${lastName[0].toUpperCase()}`;
        const bgColor = getColorForLetter(initials[0]);
        return (
            <RAAvatarRoot
                ref={ref}
                ownerState={{ size, shadow, bgColor, shape }}
                {...rest}
            >
                {initials}
            </RAAvatarRoot>
        );
    }

    // Other variants: icon or default image
    let avatarSrc;
    switch (variant) {
        case "dataset":
            avatarSrc = darkMode ? datasetDarkIcon : datasetLightIcon;
            break;
        case "datasetAssessment":
            avatarSrc = datasetAssessmentIcon;
            break;
        case "recipientAssessment":
            avatarSrc = recipientAssessmentIcon;
            break;
        case "organization":
            avatarSrc = organizationIcon;
            break;
        default:
            avatarSrc = src || defaultAvatar;
    }

    return (
        <RAAvatarRoot
            ref={ref}
            ownerState={{ size, shadow, bgColor: "transparent", shape }}
            src={avatarSrc}
            alt={alt}
            {...rest}
        />
    );
});

RAAvatar.propTypes = {
    variant: PropTypes.oneOf([
        "user",
        "recipient",
        "shared",
        "dataset",
        "datasetAssessment",
        "recipientAssessment",
        "initials",
        "organization"
    ]),
    src: PropTypes.string,
    alt: PropTypes.string,
    size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl", "xxl"]),
    shadow: PropTypes.oneOf([
        "none","xs","sm","md","lg","xl","xxl","inset",
    ]),
    shape: PropTypes.oneOf(["circular","square"]),
    firstName: PropTypes.string,
    lastName: PropTypes.string
};

export default RAAvatar;
