import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Autocomplete, Chip, CircularProgress, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import RABox from 'components/layout/RABox';
import RATypography from 'components/display/RATypography';
import RAAvatar from 'components/display/RAAvatar';
import { useUsersApi } from 'api/users';

export default function RAUserAutocomplete({
                                               value,
                                               onChange,
                                               placeholder = 'Shared users',
                                               multiple = false,
                                           }) {
    const theme = useTheme();
    const chipBg = theme.palette.mode === 'light'
        ? theme.palette.grey[200]
        : theme.palette.grey[700];
    const chipColor = theme.palette.text.primary;

    const { fetchUsers } = useUsersApi();

    const [inputValue, setInputValue] = useState('');
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef(null);

    // Keep a ref to the current value so we can use it inside the search effect
    const valueRef = useRef(value);
    useEffect(() => { valueRef.current = value; }, [value]);

    const normalizedValue = multiple
        ? (Array.isArray(value) ? value : [])
        : (value ?? null);

    // Helper to ensure selected values are always in the options list
    const mergeValueIntoOptions = (apiOptions) => {
        const currentValues = Array.isArray(valueRef.current)
            ? valueRef.current
            : (valueRef.current ? [valueRef.current] : []);

        const merged = [...apiOptions];
        currentValues.forEach(v => {
            if (!merged.some(o => o.username === v.username)) {
                merged.push(v);
            }
        });
        return merged;
    };

    // 1. Initialize options
    useEffect(() => {
        setOptions(mergeValueIntoOptions([]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2. Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (inputValue.length < 2) {
            setOptions(mergeValueIntoOptions([]));
            setLoading(false);
            return;
        }

        setLoading(true);

        debounceRef.current = setTimeout(async () => {
            try {
                const users = await fetchUsers(inputValue);
                const safeUsers = Array.isArray(users) ? users : [];
                setOptions(mergeValueIntoOptions(safeUsers));
            } catch (err) {
                setOptions(mergeValueIntoOptions([]));
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(debounceRef.current);
    }, [inputValue, fetchUsers]);

    return (
        <RABox mt={1} sx={{ width: "100%" }}>
            {/* Selected users as chips */}
            {Array.isArray(value) && value.length > 0 && (
                <RABox mb={1} sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {value.map((user) => (
                        <Chip
                            key={user.username}
                            size="small"
                            avatar={
                                <RAAvatar
                                    variant="user"
                                    firstName={user.firstName}
                                    lastName={user.lastName}
                                    size="xs"
                                />
                            }
                            label={
                                <RATypography variant="caption" noWrap>
                                    {user.firstName} {user.lastName}
                                </RATypography>
                            }
                            onDelete={(event) => {
                                const filtered = value.filter(
                                    (u) => u.username !== user.username
                                );
                                onChange(event, filtered);
                            }}
                            sx={{
                                backgroundColor: chipBg,
                                color: chipColor,
                                "& .MuiChip-deleteIcon": { color: chipColor },
                                px: 0.5,
                            }}
                        />
                    ))}
                </RABox>
            )}

            <Autocomplete
                multiple={multiple}
                options={options}
                value={normalizedValue}
                loading={loading}
                inputValue={inputValue}
                onInputChange={(_, v) => setInputValue(v)}
                onChange={(e, newVal) => onChange(e, newVal)}
                filterOptions={(options) => {
                    const selectedItems = Array.isArray(normalizedValue)
                        ? normalizedValue
                        : (normalizedValue ? [normalizedValue] : []);

                    const selectedSet = new Set(selectedItems.map(u => u.username));

                    return options.filter(opt => !selectedSet.has(opt.username));
                }}

                isOptionEqualToValue={(opt, val) => opt.username === val.username}
                getOptionLabel={(opt) => `${opt.firstName} ${opt.lastName}`}
                noOptionsText={
                    inputValue.length < 2
                        ? "Type at least 2 characters to search"
                        : "No users found"
                }
                disableCloseOnSelect={multiple}
                disableClearable={!multiple}
                renderTags={() => null}
                renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                        <li key={option.username} {...otherProps}>
                            <RABox display="flex" alignItems="center" gap={1} sx={{ p: 1 }}>
                                <RAAvatar
                                    variant="initials"
                                    firstName={option.firstName}
                                    lastName={option.lastName}
                                    size="xs"
                                />
                                <RABox ml={1}>
                                    <RATypography variant="subtitle" noWrap>
                                        {option.firstName} {option.lastName}
                                    </RATypography>
                                    <br />
                                    <RATypography
                                        variant="caption"
                                        noWrap
                                        sx={{ color: "text.secondary", mt: 0.5 }}
                                    >
                                        ({option.username})
                                    </RATypography>
                                </RABox>
                            </RABox>
                        </li>
                    );
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        placeholder={placeholder}
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {loading && <CircularProgress size={20} />}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                        }}
                    />
                )}
                ListboxProps={{
                    sx: {
                        width: "100%",
                        maxHeight: 48 * 5 + 8,
                        padding: 0,
                    },
                }}
                sx={{ width: "100%" }}
            />
        </RABox>
    );
}

RAUserAutocomplete.propTypes = {
    value: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.shape({
            username: PropTypes.string.isRequired,
            firstName: PropTypes.string.isRequired,
            lastName: PropTypes.string.isRequired,
            email: PropTypes.string,
        })),
        PropTypes.shape({
            username: PropTypes.string.isRequired,
            firstName: PropTypes.string.isRequired,
            lastName: PropTypes.string.isRequired,
            email: PropTypes.string,
        }),
        PropTypes.oneOf([null]),
    ]),
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    multiple: PropTypes.bool,
};