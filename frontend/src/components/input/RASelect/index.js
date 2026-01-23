import React from "react";
import PropTypes from "prop-types";
import { TextField, MenuItem } from "@mui/material";

export default function RASelect({
                                     label,
                                     value,
                                     onChange,
                                     options,
                                     fullWidth = false,
                                     ...rest
                                 }) {
    return (
        <TextField
            select
            label={label}
            value={value}
            onChange={onChange}
            fullWidth={fullWidth}
            variant="outlined"
            size="small"
            {...rest}
        >
            {options.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                </MenuItem>
            ))}
        </TextField>
    );
}

RASelect.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func.isRequired,
    options: PropTypes.arrayOf(
        PropTypes.shape({ value: PropTypes.any.isRequired, label: PropTypes.node.isRequired })
    ).isRequired,
    fullWidth: PropTypes.bool,
};
