import React, { useState, useEffect, useCallback } from 'react';
import { MenuItem, IconButton, InputAdornment } from '@mui/material';
import Icon from '@mui/material/Icon';
import { useTheme } from '@mui/material/styles';
import { useMaterialUIController } from 'context';
import RAInput from 'components/input/RAInput';
import RABox from 'components/layout/RABox';
import RATypography from 'components/display/RATypography';
import { DataTypeOptions } from 'utils/DataType';
import { sxInput } from './styles';

import booleanIcon from '../../../../../../assets/images/icons/datatypes/booleanIcon.png';
import dateIcon from '../../../../../../assets/images/icons/datatypes/dateIcon.png';
import decimalIcon from '../../../../../../assets/images/icons/datatypes/decimalIcon.png';
import geolocationIcon from '../../../../../../assets/images/icons/datatypes/geolocationIcon.png';
import integerIcon from '../../../../../../assets/images/icons/datatypes/integerIcon.png';
import stringIcon from '../../../../../../assets/images/icons/datatypes/stringIcon.png';

const DATATYPE_ICON_MAP = {
    BOOLEAN: booleanIcon,
    DATETIME: dateIcon,
    DECIMAL: decimalIcon,
    GEOSPATIAL: geolocationIcon,
    INTEGER: integerIcon,
    STRING: stringIcon,
};

const formatDataTypeLabel = (dataType) => {
    if (!dataType) return '';
    return String(dataType)
        .toLowerCase()
        .replace(/(^|[_\s-])\w/g, (match) => match.toUpperCase())
        .replace(/[_-]/g, ' ');
};

export const DataTypeTooltipContent = React.memo(({ dataType }) => {
    const normalizedDataType = String(dataType || '').toUpperCase();
    const label = formatDataTypeLabel(dataType);
    const icon = DATATYPE_ICON_MAP[normalizedDataType];

    if (!label) return '';

    return (
        <RABox display="flex" alignItems="center" gap={1}>
            {icon && (
                <RABox
                    component="img"
                    src={icon}
                    alt={label}
                    sx={{ width: 18, height: 18 }}
                />
            )}
            <RATypography variant="caption" color="white" fontWeight="medium">
                {label}
            </RATypography>
        </RABox>
    );
});

const IconLabel = React.memo(({ src, alt, label, textColor }) => (
    <RABox display="flex" alignItems="center" gap={1} sx={{ whiteSpace: 'nowrap', color: textColor, p: 0 }}>
        <RABox component="img" src={src} alt={alt} sx={{ width: 20, height: 20 }} />
        <RATypography variant="caption" fontWeight="medium" noWrap sx={{ lineHeight: 1 }}>
            {label}
        </RATypography>
    </RABox>
));

export function DataTypeCell({ initialValue, onCommit, disabled = false }) {
    const [value, setValue] = useState(initialValue || '');
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setValue(initialValue || '');
    }, [initialValue]);

    const [controller] = useMaterialUIController();
    const theme = useTheme();
    const iconColor = controller.darkMode ? theme.palette.grey[100] : theme.palette.grey[900];
    const textColor = controller.darkMode ? theme.palette.common.white : theme.palette.text.primary;

    const handleChange = useCallback(
        (e) => {
            const next = e.target.value;
            setValue((prev) => {
                if (prev !== next) {
                    onCommit(next);
                    return next;
                }
                return prev;
            });
        },
        [onCommit]
    );

    return (
        <RAInput
            variant="outlined"
            select
            size="small"
            value={value}
            onChange={handleChange}
            disabled={disabled}
            inputProps={{ 'data-cell': true }}
            SelectProps={{
                open,
                onOpen: () => setOpen(true),
                onClose: () => setOpen(false),
            }}
            InputProps={{
                endAdornment: (
                    <InputAdornment position="end" sx={{ mr: 1 }}>
                        <IconButton
                            size="small"
                            disabled={disabled}
                            // FIX: Force icon color to stay 'iconColor' even when disabled
                            sx={{
                                p: 0,
                                color: iconColor,
                                '&.Mui-disabled': {
                                    color: iconColor
                                }
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setOpen((o) => !o)}
                        >
                            <Icon sx={{ fontSize: '1.5rem' }}>arrow_drop_down</Icon>
                        </IconButton>
                    </InputAdornment>
                ),
            }}
            // Uses updated sxInput to fix text color
            sx={{ ...sxInput, width: '100%' }}
        >
            {DataTypeOptions.map((dt) => (
                <MenuItem
                    key={dt}
                    value={dt}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color: textColor,
                        p: 1,
                        pl: 0.5,
                        pr: 0,
                    }}
                >
                    <IconLabel
                        src={DATATYPE_ICON_MAP[dt.toUpperCase()]}
                        alt={dt}
                        label={dt.charAt(0).toUpperCase() + dt.slice(1)}
                        textColor={textColor}
                    />
                </MenuItem>
            ))}
        </RAInput>
    );
}

export const MemoDataTypeCell = React.memo(DataTypeCell);
