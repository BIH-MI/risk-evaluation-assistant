// src/utils/CSVDropzone.js
import React, { useCallback } from 'react';
import { Box, FormControl, FormHelperText, Typography } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { detectMeasurement } from './detectMeasurement';
// FIX: Import RAButton to match the styling
import RAButton from 'components/input/RAButton';

export function CSVDropzone({ onParse, error, setError, onAddTable, onManualAdd }) {
    const parseCsv = useCallback(
        (file) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: false,
                worker: true,
                preview: 10000,
                complete: ({ data: rows, meta: { fields = [] } }) => {
                    const columnMeta = fields.map((field) => {
                        const vals = rows.map(r => r[field]);
                        const { dataType } = detectMeasurement(vals);
                        return {
                            field,
                            level: dataType,
                            excluded: false
                        };
                    });
                    // onParse is called when the worker is finished
                    onParse({
                        name: file.name,
                        rows: rows.length,
                        headers: fields,
                        columnMeta,
                        data: rows,
                    });
                },
                error: (err) => setError(`Parse error: ${err.message}`),
            });
        },
        [onParse, setError]
    );

    const onDrop = useCallback(
        (acceptedFiles) => {
            setError('');
            const invalid = acceptedFiles.some(f => !f.name.toLowerCase().endsWith('.csv'));
            if (invalid) {
                setError('All files must be .csv');
                return;
            }
            acceptedFiles.forEach(file => {
                onAddTable(file);
                parseCsv(file);
            });
        },
        [parseCsv, setError, onAddTable]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: true,
    });

    return (
        <Box
            {...getRootProps()}
            sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.400',
                p: 4,
                textAlign: 'center',
                bgcolor: isDragActive ? 'grey.100' : 'inherit',
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2
            }}
        >
            <input {...getInputProps()} />

            <Typography variant="subtitle2">
                {isDragActive ? 'Release CSV files here…' : 'Drag & drop CSV files here, or click to select'}
            </Typography>

            <Typography variant="caption" color="textSecondary">
                — OR —
            </Typography>

            <RAButton
                size="small"
                variant="gradient"
                onClick={(e) => {
                    e.stopPropagation(); // Prevent dropzone click (file dialog)
                    if (onManualAdd) onManualAdd();
                }}
            >
                Add Empty Table Manually
            </RAButton>

            {error && (
                <FormControl error>
                    <FormHelperText>{error}</FormHelperText>
                </FormControl>
            )}
        </Box>
    );
}