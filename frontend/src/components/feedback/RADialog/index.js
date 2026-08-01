import RAButton from "components/input/RAButton";
import { useMaterialUIController } from "context";
import PropTypes from "prop-types";
import { forwardRef } from "react";

import {
  RADialogActionsRoot,
  RADialogContentRoot,
  RADialogContentTextRoot,
  RADialogRoot,
  RADialogTitleRoot,
} from "components/feedback/RADialog/RADialogRoot";

const RADialog = forwardRef(function RADialog(
  {
    open,
    title,
    children,
    onClose,
    onConfirm,
    cancelText = "Cancel",
    confirmText = "OK",
  },
  ref
) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  return (
    <RADialogRoot
      ref={ref}
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      ownerState={{ darkMode }}
      aria-labelledby="radialog-title"
    >
      <RADialogTitleRoot id="radialog-title" align="center">
        {title}
      </RADialogTitleRoot>

      <RADialogContentRoot sx={{ px: 2 }}>
        <RADialogContentTextRoot component="div">
          {children}
        </RADialogContentTextRoot>
      </RADialogContentRoot>

      <RADialogActionsRoot>
        <RAButton variant="text" color="secondary" onClick={onClose}>
          {cancelText}
        </RAButton>
        <RAButton variant="contained" onClick={onConfirm}>
          {confirmText}
        </RAButton>
      </RADialogActionsRoot>
    </RADialogRoot>
  );
});

RADialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.node,
  children: PropTypes.node.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  cancelText: PropTypes.string,
  confirmText: PropTypes.string,
};

RADialog.defaultProps = {
  title: null,
  cancelText: "Cancel",
  confirmText: "OK",
};

export default RADialog;