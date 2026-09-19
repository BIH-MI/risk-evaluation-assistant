import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MenuItem } from '@mui/material';
import RAInput from 'components/input/RAInput';
import RABox from 'components/layout/RABox';
import RATypography from 'components/display/RATypography';
import {
    ATTRIBUTE_SCALE_OPTIONS,
    getOptionsForAttributeField,
    normalizeAttributeScaleValue,
} from 'utils/AttributeScale';
import { sxSelect } from './styles';

const ScaleOption = React.memo(({ option }) => {
    const label = option?.label || '';
    return (
        <RABox display="flex" alignItems="center" gap={0.75} width="100%" minWidth={0}>
            {option?.icon && (
                <RABox
                    component="img"
                    src={option.icon}
                    alt={label || `level-${option.value}`}
                    sx={{ width: 22, height: 22, objectFit: 'contain' }}
                />
            )}
            <RATypography variant="caption" fontWeight="medium" noWrap sx={{ textTransform: 'capitalize' }}>
                {label}
            </RATypography>
        </RABox>
    );
});

const ScaleSelectedValue = React.memo(({ option }) => {
    const label = option?.label || '';

    if (!option?.icon) {
        return (
            <RATypography variant="caption" fontWeight="medium" noWrap>
                {label || option?.value}
            </RATypography>
        );
    }

    return (
        <RABox display="flex" alignItems="center" justifyContent="flex-start" gap={0.75} width="100%" minWidth={0}>
            <RABox
                component="img"
                src={option.icon}
                alt={label || `level-${option.value}`}
                sx={{ width: 22, height: 22, objectFit: 'contain', display: 'block', flexShrink: 0 }}
            />
            <RATypography
                variant="caption"
                fontWeight="medium"
                noWrap
                sx={{ textTransform: 'capitalize', lineHeight: 1, minWidth: 0 }}
            >
                {label}
            </RATypography>
        </RABox>
    );
});

export function ScaleCell({
    initialValue,
    onCommit = () => {},
    disabled = false,
    field,
    scoringSystem,
    options,
}) {
    const scaleOptions = useMemo(
        () => options || getOptionsForAttributeField(field, scoringSystem),
        [field, options, scoringSystem]
    );
    const selectableOptions = useMemo(
        () => (scaleOptions.length > 0 ? scaleOptions : ATTRIBUTE_SCALE_OPTIONS),
        [scaleOptions]
    );
    const safe = normalizeAttributeScaleValue(initialValue, field, { scoringSystem });
    const [value, setValue] = useState(safe);
    const ref = useRef(null);
    const selectedOption = useMemo(
        () => selectableOptions.find(option => option.value === value),
        [selectableOptions, value]
    );

    useEffect(() => {
        setValue(normalizeAttributeScaleValue(initialValue, field, { scoringSystem }));
    }, [initialValue, field, scoringSystem]);

    const handleChange = useCallback(e => {
        const next = normalizeAttributeScaleValue(e.target.value, field, {
            allowNull: false,
            scoringSystem,
        });
        setValue(next);
        onCommit(next);
    }, [field, onCommit, scoringSystem]);

    if (value == null) {
        return (
            <RABox display="flex" justifyContent="center">
                <RATypography variant="caption" color="secondary">-</RATypography>
            </RABox>
        );
    }

    return (
        <RABox display="flex" justifyContent="flex-start" width="116px">
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
                  renderValue: () => <ScaleSelectedValue option={selectedOption} />,
                  MenuProps: {
                    PaperProps: {
                      sx: {
                        padding: '0px',
                        width: '116px',
                        minWidth: '116px !important',
                        maxWidth: '116px'
                      }
                    },
                    MenuListProps: {
                      sx: {
                        '& .MuiMenuItem-root': {
                          width: '116px',
                          minWidth: '116px !important',
                          maxWidth: '116px',
                        }
                      }
                    }
                  }
                }}
            >
                {selectableOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                        <ScaleOption option={option} />
                    </MenuItem>
                ))}
            </RAInput>
        </RABox>
    );
}

const getScoringSystemMemoKey = (scoringSystem) => {
    if (!scoringSystem) return '';
    return [
        scoringSystem.id ?? '',
        scoringSystem.versionNumber ?? scoringSystem.currentVersion ?? '',
        scoringSystem.name ?? '',
    ].join(':');
};

const areScaleCellPropsEqual = (prev, next) =>
    Object.is(prev.initialValue, next.initialValue) &&
    prev.disabled === next.disabled &&
    prev.field === next.field &&
    prev.commitKey === next.commitKey &&
    prev.options === next.options &&
    getScoringSystemMemoKey(prev.scoringSystem) === getScoringSystemMemoKey(next.scoringSystem);

export const MemoScaleCell = React.memo(ScaleCell, areScaleCellPropsEqual);
