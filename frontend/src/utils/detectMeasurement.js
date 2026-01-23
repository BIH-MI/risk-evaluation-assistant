// src/utils/detectMeasurement.js

import { DataType } from "./DataType";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/;

function isBoolean(val) {
    if (typeof val !== 'string') return false;
    return /^(true|false)$/i.test(val.trim());
}

function isISODate(val) {
    if (typeof val !== 'string') return false;
    const s = val.trim();
    return ISO_DATE_REGEX.test(s) && !isNaN(Date.parse(s));
}

function isISODateTime(val) {
    if (typeof val !== 'string') return false;
    const s = val.trim();
    return ISO_DATETIME_REGEX.test(s) && !isNaN(Date.parse(s));
}

function isNumeric(val) {
    if (val === null || val === undefined) return false;
    return !isNaN(val) && val !== '';
}

export function detectMeasurement(values = []) {
    const vals = values.map(v => (v == null ? '' : String(v).trim()));

    // boolean?
    if (vals.every(isBoolean)) {
        return { dataType: DataType.BOOLEAN };
    }

    // date or datetime -> unify both as DATETIME
    if (vals.every(v => isISODateTime(v) || isISODate(v))) {
        return { dataType: DataType.DATETIME };
    }

    // numeric?
    if (vals.every(isNumeric)) {
        const hasDecimal = vals.some(v => v.includes('.') || v.toLowerCase().includes('e'));
        return { dataType: hasDecimal ? DataType.DECIMAL : DataType.INTEGER };
    }

    // fallback
    return { dataType: DataType.STRING };
}
