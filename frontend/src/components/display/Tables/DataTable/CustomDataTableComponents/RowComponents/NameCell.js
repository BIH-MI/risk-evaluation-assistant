import React, { useState, useEffect, useRef } from 'react';
import { Tooltip } from '@mui/material';
import RAInput from 'components/input/RAInput';
import RABox from 'components/layout/RABox';
import { DataTypeTooltipContent } from './DataTypeCell';
import { sxInput } from './styles';

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
