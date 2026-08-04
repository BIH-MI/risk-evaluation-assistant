import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MenuItem, Checkbox, IconButton, InputAdornment, Tooltip } from '@mui/material';
import { useMaterialUIController } from 'context';
import { useTheme } from '@mui/material/styles';
import RAInput from 'components/input/RAInput';
import RABox from 'components/layout/RABox';
import RATypography from 'components/display/RATypography';
// DataType options
import { DataTypeOptions } from 'utils/DataType';
import {
    ATTRIBUTE_SCALE_OPTIONS,
    normalizeAttributeScaleValue,
} from 'utils/AttributeScale';

// DataType icons
import booleanIcon from '../../../../../../assets/images/icons/datatypes/booleanIcon.png';
import dateIcon from '../../../../../../assets/images/icons/datatypes/dateIcon.png';
import decimalIcon from '../../../../../../assets/images/icons/datatypes/decimalIcon.png';
import geolocationIcon from '../../../../../../assets/images/icons/datatypes/geolocationIcon.png';
import integerIcon from '../../../../../../assets/images/icons/datatypes/integerIcon.png';
import stringIcon from '../../../../../../assets/images/icons/datatypes/stringIcon.png';
import Icon from '@mui/material/Icon';

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

const DataTypeTooltipContent = React.memo(({ dataType }) => {
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

// Shared styles
const sxInput = {
    '& .MuiOutlinedInput-root': {
        fontSize: '2rem',
        height: 45,
        '&.Mui-disabled': {
            backgroundColor: 'transparent',
        }
    },
    '& .MuiOutlinedInput-input': {
        padding: '15px',
        textAlign: 'left',
        '&.Mui-disabled': {
            color: 'dark.main',
            WebkitTextFillColor: 'currentColor',
            opacity: 1,
        }
    },
    width: '100%'
};

// Styling for the select input and dropdown
const sxSelect = {
    '& .MuiOutlinedInput-root': {
        height: 45,
        padding: 0,
        '&.Mui-disabled': {
            backgroundColor: 'transparent',
        }
    },
    '& .MuiOutlinedInput-input': {
        textAlign: 'center',
        '&.Mui-disabled': {
            color: 'dark.main',
            WebkitTextFillColor: 'currentColor',
            opacity: 1,
        }
    },
    '& .MuiSelect-icon': {
        '&.Mui-disabled': {
            color: 'dark.main',
            opacity: 1
        }
    },
    width: '85%'
};

/**
 * NameCell
 */
export function NameCell({
    initialValue,
    onCommit = () => {},
    disabled = false,
    tooltip = '',
    dataType = '',
}) {
    const [text, setText] = useState(initialValue || '');
    const ref = useRef(null);
    useEffect(() => setText(initialValue || ''), [initialValue]);
    const title = dataType ? <DataTypeTooltipContent dataType={dataType} /> : tooltip;

    const input = (
        <RAInput
            variant="outlined"
            size="small"
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={() => onCommit(text)}
            inputProps={{ 'data-cell': true }}
            inputRef={ref}
            disabled={disabled}
            fullWidth
            sx={sxInput}
        />
    );

    if (!title) {
        return input;
    }

    return (
        <Tooltip title={title} arrow placement="top">
            <RABox component="span" display="block" width="100%">
                {input}
            </RABox>
        </Tooltip>
    );
}
export const MemoNameCell = React.memo(NameCell);

const ScaleOption = React.memo(({ option }) => {
    const label = option?.label || '';
    return (
        <RABox display="flex" alignItems="center" gap={1} width="10%">
            {option?.icon && (
                <RABox
                    component="img"
                    src={option.icon}
                    alt={label || `level-${option.value}`}
                    sx={{ height: 20 }}
                />
            )}
            <RATypography variant="caption" fontWeight="medium" sx={{ textTransform: 'capitalize' }}>
                {label}
            </RATypography>
        </RABox>
    );
});

export function ScaleCell({ initialValue, onCommit, disabled = false }) {
    const safe = normalizeAttributeScaleValue(initialValue);
    const [value, setValue] = useState(safe);
    const ref = useRef(null);

    useEffect(() => {
        setValue(normalizeAttributeScaleValue(initialValue));
    }, [initialValue]);

    const handleChange = useCallback(e => {
        const next = normalizeAttributeScaleValue(e.target.value, undefined, { allowNull: false });
        setValue(next);
        onCommit(next);
    }, [onCommit]);

    if (value == null) {
        return (
            <RABox display="flex" justifyContent="center">
                <RATypography variant="caption" color="secondary">-</RATypography>
            </RABox>
        );
    }

    return (
        <RABox display="flex" justifyContent="center" width="120px">
            <RAInput
                variant="outlined"
                select
                size="small"
                value={value}
                onChange={handleChange}
                inputProps={{ 'data-cell': true }}
                inputRef={ref}
                sx={sxSelect}
                disabled={disabled}
                SelectProps={{
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        padding: '0px',
                        minWidth: 'unset !important'
                      }
                    },
                    MenuListProps: {
                      sx: {
                        // 3. Target the menu items inside to remove their limit too
                        '& .MuiMenuItem-root': {
                          minWidth: 'unset !important',
                        }
                      }
                    }
                  }
                }}
            >
                {ATTRIBUTE_SCALE_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                        <ScaleOption option={option} />
                    </MenuItem>
                ))}
            </RAInput>
        </RABox>
    );
}
export const MemoScaleCell = React.memo(ScaleCell);

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
