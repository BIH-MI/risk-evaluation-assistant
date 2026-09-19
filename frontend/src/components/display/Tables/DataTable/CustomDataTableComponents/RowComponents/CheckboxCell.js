import React from 'react';
import { Checkbox } from '@mui/material';
import RABox from 'components/layout/RABox';
import RATypography from 'components/display/RATypography';

export function CheckboxCell({ initialValue, onCommit, disabled = false }) {
    const [checked, setChecked] = React.useState(initialValue != null ? !!initialValue : null);
    React.useEffect(() => setChecked(initialValue != null ? !!initialValue : null), [initialValue]);

    const handleChange = React.useCallback((e) => {
        const next = e.target.checked;
        setChecked((prev) => {
            if (prev !== next) {
                onCommit(next);
                return next;
            }
            return prev;
        });
    }, [onCommit]);

    if (checked == null) {
        return (
            <RABox display="flex" justifyContent="center">
                <RATypography variant="caption" color="secondary">-</RATypography>
            </RABox>
        );
    }

    return (
        <RABox display="flex" justifyContent="center">
            <Checkbox
                checked={checked}
                onChange={handleChange}
                disabled={disabled}
                inputProps={{ "data-cell": true }}
            />
        </RABox>
    );
}

export const MemoCheckboxCell = React.memo(CheckboxCell);
