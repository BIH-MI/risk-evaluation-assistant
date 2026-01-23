import RAButton from "components/input/RAButton";
import PropTypes from "prop-types";
import { forwardRef } from "react";

// Material icons
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ContentCopyIcon from "@mui/icons-material/ContentCopy"; // Import copy icon
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import { useMaterialUIController } from "context";

// Hook that returns the inverse background key *and* its contrast text color
const useInverseThemeColors = () => {
  const [controller] = useMaterialUIController();

  // pick the opposite palette key
  const bgColor = controller.darkMode ? "white" : "dark";
  // lookup its contrastText (falls back to text.primary)
  const textColor = controller.darkMode ? "dark" : "white";

  return { bgColor, textColor };
};

export const SaveIconButton = forwardRef(({ onClick, ...rest }, ref) => {
  const { bgColor, textColor } = useInverseThemeColors();

  return (
      <RAButton
          component="span"
          ref={ref}
          onClick={onClick}
          iconOnly
          aria-label="save"
          variant="contained"
          color={bgColor} // background
          size="small"
          {...rest}
      >
        <SaveIcon fontSize="small" sx={{ color: textColor }} />
      </RAButton>
  );
});

SaveIconButton.propTypes = {
  onClick: PropTypes.func,
};
SaveIconButton.defaultProps = {
  onClick: undefined,
};

/**
 * A circular, icon‐only button for editing.
 * Background is the inverse theme color; icon uses its contrastText.
 */
export const EditIconButton = forwardRef(({ onClick, ...rest }, ref) => {
  const { bgColor, textColor } = useInverseThemeColors();

  return (
      <RAButton
          component="span"
          ref={ref}
          onClick={onClick}
          iconOnly
          aria-label="edit"
          variant="contained"
          color={bgColor}
          size="small"
          {...rest}
      >
        <EditIcon fontSize="small" sx={{ color: textColor }} />
      </RAButton>
  );
});

EditIconButton.propTypes = {
  onClick: PropTypes.func,
};
EditIconButton.defaultProps = {
  onClick: undefined,
};

/**
 * A circular, icon‐only button for cancelling/closing.
 * Background is the inverse theme color; icon uses its contrastText.
 */
export const CancelIconButton = forwardRef(({ onClick, ...rest }, ref) => {
  const { bgColor, textColor } = useInverseThemeColors();

  return (
      <RAButton
          component="span"
          ref={ref}
          onClick={onClick}
          iconOnly
          aria-label="cancel"
          variant="contained"
          color={bgColor}
          size="small"
          {...rest}
      >
        <CloseIcon fontSize="small" sx={{ color: textColor }} />
      </RAButton>
  );
});

CancelIconButton.propTypes = {
  onClick: PropTypes.func,
};
CancelIconButton.defaultProps = {
  onClick: undefined,
};

/**
 * A circular, icon‐only button for triggering an assessment action.
 * Background is the inverse theme color; icon uses its contrastText.
 */
export const AssessmentIconButton = forwardRef(({ onClick, ...rest }, ref) => {
  const { bgColor, textColor } = useInverseThemeColors();

  return (
      <RAButton
          component="span"
          ref={ref}
          onClick={onClick}
          iconOnly
          aria-label="assessment"
          variant="contained"
          color={bgColor}
          size="small"
          {...rest}
      >
        <AssessmentIcon fontSize="small" sx={{ color: textColor }} />
      </RAButton>
  );
});

AssessmentIconButton.propTypes = {
  onClick: PropTypes.func,
};
AssessmentIconButton.defaultProps = {
  onClick: undefined,
};

/**
 * A circular, icon‐only button for copying.
 * Background is the inverse theme color; icon uses its contrastText.
 */
export const CopyIconButton = forwardRef(({ onClick, ...rest }, ref) => {
  const { bgColor, textColor } = useInverseThemeColors();

  return (
      <RAButton
          component="span"
          ref={ref}
          onClick={onClick}
          iconOnly
          aria-label="copy"
          variant="contained"
          color={bgColor}
          size="small"
          {...rest}
      >
        <ContentCopyIcon fontSize="small" sx={{ color: textColor }} />
      </RAButton>
  );
});

CopyIconButton.propTypes = {
  onClick: PropTypes.func,
};
CopyIconButton.defaultProps = {
  onClick: undefined,
};

export const FloatingAddButton = forwardRef(({ onClick, ...rest }, ref) => {
  const [controller] = useMaterialUIController();
  const { sidenavColor } = controller;

  return (
      <RAButton
          ref={ref}
          onClick={onClick}
          iconOnly
          aria-label="add"
          variant="gradient"
          color={sidenavColor} // matches your sidenav theme color
          circular
          size="medium"
          {...rest}
      >
        <AddIcon fontSize="small" />
      </RAButton>
  );
});

FloatingAddButton.propTypes = {
  onClick: PropTypes.func,
};
FloatingAddButton.defaultProps = {
  onClick: undefined,
};

export const AddIconButton = forwardRef(({ onClick, ...rest }, ref) => {
    const { bgColor, textColor } = useInverseThemeColors();

    return (
        <RAButton
            component="span"
            ref={ref}
            onClick={onClick}
            iconOnly
            aria-label="report"
            variant="contained"
            color={bgColor}
            size="small"
            {...rest}
        >
            <AddIcon fontSize="small" sx={{ color: textColor }} />
        </RAButton>
    );
});

AddIconButton.propTypes = {
    onClick: PropTypes.func,
};
AddIconButton.defaultProps = {
    onClick: undefined,
};


export const ReportIconButton = forwardRef(({ onClick, ...rest }, ref) => {
  const { bgColor, textColor } = useInverseThemeColors();

  return (
      <RAButton
          component="span"
          ref={ref}
          onClick={onClick}
          iconOnly
          aria-label="report"
          variant="contained"
          color={bgColor}
          size="small"
          {...rest}
      >
        <AssignmentIcon fontSize="small" sx={{ color: textColor }} />
      </RAButton>
  );
});

ReportIconButton.propTypes = {
  onClick: PropTypes.func,
};
ReportIconButton.defaultProps = {
  onClick: undefined,
};


export const LinkIconButton = forwardRef(({ onClick, ...rest }, ref) => {
    const { bgColor, textColor } = useInverseThemeColors();

    return (
        <RAButton
            component="span"
            ref={ref}
            onClick={onClick}
            iconOnly
            aria-label="report"
            variant="contained"
            color={bgColor}
            size="small"
            {...rest}
        >
            <OpenInNewIcon fontSize="small" sx={{ color: textColor }} />
        </RAButton>
    );
});

LinkIconButton.propTypes = {
    onClick: PropTypes.func,
};
LinkIconButton.defaultProps = {
    onClick: undefined,
};