// components/feedback/RADialogRoots.js

import {
  Dialog as MuiDialog,
  DialogActions as MuiDialogActions,
  DialogContent as MuiDialogContent,
  DialogContentText as MuiDialogContentText,
  DialogTitle as MuiDialogTitle,
} from "@mui/material";
import { styled } from "@mui/material/styles";

/**
 * RADialogRoot
 * – adapts the paper background based on darkMode
 */
export const RADialogRoot = styled(MuiDialog)(({ theme, ownerState }) => ({
  "& .MuiPaper-root": {
    backgroundColor: ownerState.darkMode
      ? theme.palette.background.paper
      : theme.palette.background.default,
  },
}));

/**
 * RADialogTitleRoot
 * – uses primary text color for title
 */
export const RADialogTitleRoot = styled(MuiDialogTitle)(({ theme }) => ({
  color: theme.palette.text.primary,
}));

/**
 * RADialogContentRoot
 * – wrapper for the dialog’s content (you can tweak divider colors here)
 */
export const RADialogContentRoot = styled(MuiDialogContent)(({ theme }) => ({
  // add any additional content‐wrapper styles here
}));

/**
 * RADialogContentTextRoot
 * – sets the body text color
 */
export const RADialogContentTextRoot = styled(MuiDialogContentText)(
  ({ theme }) => ({
    color: theme.palette.text.primary,
  })
);

/**
 * RADialogActionsRoot
 * – custom padding for the action buttons row
 */
export const RADialogActionsRoot = styled(MuiDialogActions)(({ theme }) => ({
  padding: theme.spacing(1, 3, 2),
}));
