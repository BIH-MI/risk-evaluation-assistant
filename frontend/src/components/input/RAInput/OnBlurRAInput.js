import React, { useState, useEffect, forwardRef } from 'react';
import PropTypes from 'prop-types';
import RAInput from './index';

/**
 * Like RAInput, but will only call onCommit(value) when the field
 * loses focus (onBlur), while still updating its own internal state
 * on every keystroke.
 */
const OnBlurRAInput = forwardRef(function OnBlurRAInput(
    { value, onCommit, ...props },
    ref
) {
    const [innerValue, setInnerValue] = useState(value ?? '');

    // whenever the outside value changes, resync
    useEffect(() => {
        setInnerValue(value ?? '');
    }, [value]);

    return (
        <RAInput
            {...props}
            ref={ref}
            value={innerValue}
            onChange={e => setInnerValue(e.target.value)}
            onBlur={() => onCommit(innerValue)}
        />
    );
});

OnBlurRAInput.propTypes = {
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onCommit: PropTypes.func.isRequired,
};

OnBlurRAInput.defaultProps = {
    value: '',
};

export default OnBlurRAInput;