// src/utils/detectMeasurement.js

import { DataType } from "./DataType";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/;
const WKT_GEOMETRY_REGEX =
    /^(?:SRID=\d+;)?(?:POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)\s*(?:Z|M|ZM)?\s*\(.+\)$/i;
const GEOJSON_GEOMETRY_TYPES = new Set([
    'Point',
    'LineString',
    'Polygon',
    'MultiPoint',
    'MultiLineString',
    'MultiPolygon',
    'GeometryCollection',
]);

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

// Spellings of "no value" written by R, pandas, SAS/Stata/SPSS and Excel.
// They are no evidence of a column's type. Whether they also count as missing
// values is decided per column in profileAndEncodeColumn.
const MISSING_VALUE_MARKERS = new Set(['NA', 'N/A', 'NULL', 'NAN', 'NONE', '#N/A', '<NA>', '.']);

export function isMissingValueMarker(value) {
    return typeof value === 'string' && MISSING_VALUE_MARKERS.has(value.trim().toUpperCase());
}

// CSV exports may use a decimal comma (including semicolon-delimited files).
// Accept one decimal separator, not grouped thousands or arbitrary JS literals.
const NUMBER_SHAPE = /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/;

// For a trimmed value: "dot" or "comma" for a number with that decimal
// separator, "plain" for a number without one (12, 1e5), null otherwise.
function getNumberFormat(value) {
    if (!NUMBER_SHAPE.test(value) || !Number.isFinite(Number(value.replace(',', '.')))) {
        return null;
    }
    if (value.includes('.')) return 'dot';
    return value.includes(',') ? 'comma' : 'plain';
}

// The number a cell holds, or NaN. A decimal comma counts only where the
// file's delimiter is not a comma.
function parseNumber(value, { allowDecimalComma = true } = {}) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return NaN;
    const text = value.trim();
    const format = getNumberFormat(text);
    if (!format || (format === 'comma' && !allowDecimalComma)) return NaN;
    return Number(text.replace(',', '.'));
}

function normalizeColumnName(columnName = '') {
    return String(columnName).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function hasLatitudeHint(columnName) {
    const rawName = String(columnName).toLowerCase();
    const name = normalizeColumnName(rawName);
    return (
        name === 'lat' ||
        name === 'latitude' ||
        /(^|[^a-z0-9])(lat|latitude)([^a-z0-9]|$)/.test(rawName)
    );
}

function hasLongitudeHint(columnName) {
    const rawName = String(columnName).toLowerCase();
    const name = normalizeColumnName(rawName);
    return (
        name === 'lon' ||
        name === 'lng' ||
        name === 'long' ||
        name === 'longitude' ||
        /(^|[^a-z0-9])(lon|lng|longitude)([^a-z0-9]|$)/.test(rawName) ||
        // "long" is also an ordinary word (long_term_use, long_covid), so in a
        // longer name it only counts as the last part (gps_long).
        /[^a-z0-9]long$/.test(rawName)
    );
}

function hasCoordinatePairHint(columnName) {
    const name = normalizeColumnName(columnName);
    return (
        name.includes('coordinate') ||
        name.includes('coords') ||
        name.includes('geolocation') ||
        name.includes('geometry') ||
        name.includes('geom') ||
        name.includes('latlon') ||
        name.includes('latlng') ||
        name.includes('lonlat') ||
        name.includes('lnglat') ||
        name.includes('location') ||
        name.includes('point') ||
        name.includes('wkt') ||
        name.includes('geojson')
    );
}

function isNumberInRange(value, min, max, options) {
    const num = parseNumber(value, options);
    return Number.isFinite(num) && num >= min && num <= max;
}

function isCoordinatePair(val, options) {
    if (typeof val !== 'string') return false;
    // One number is never a pair, even when a decimal comma ("1,5") splits it
    // into two runs of digits.
    if (Number.isFinite(parseNumber(val, options))) return false;
    const matches = val.match(/-?\d+(?:\.\d+)?/g);
    if (!matches || matches.length !== 2) return false;

    const first = Number(matches[0]);
    const second = Number(matches[1]);
    if (!Number.isFinite(first) || !Number.isFinite(second)) return false;

    const latLon = first >= -90 && first <= 90 && second >= -180 && second <= 180;
    const lonLat = first >= -180 && first <= 180 && second >= -90 && second <= 90;
    return latLon || lonLat;
}

function isWktGeometry(val) {
    return typeof val === 'string' && WKT_GEOMETRY_REGEX.test(val.trim());
}

function hasCoordinateArray(value) {
    if (!Array.isArray(value)) return false;
    if (value.length >= 2 && value.every((entry) => typeof entry === 'number')) {
        return isNumberInRange(value[0], -180, 180) && isNumberInRange(value[1], -90, 90);
    }
    return value.some(hasCoordinateArray);
}

function isGeoJsonGeometryObject(value) {
    if (!value || typeof value !== 'object') return false;

    if (value.type === 'FeatureCollection') {
        return Array.isArray(value.features) && value.features.every(isGeoJsonGeometryObject);
    }

    if (value.type === 'Feature') {
        return isGeoJsonGeometryObject(value.geometry);
    }

    if (!GEOJSON_GEOMETRY_TYPES.has(value.type)) {
        return false;
    }

    if (value.type === 'GeometryCollection') {
        return Array.isArray(value.geometries) && value.geometries.every(isGeoJsonGeometryObject);
    }

    return hasCoordinateArray(value.coordinates);
}

function isGeoJsonGeometry(val) {
    if (typeof val !== 'string') return false;
    try {
        return isGeoJsonGeometryObject(JSON.parse(val));
    } catch (_err) {
        return false;
    }
}

function isGeometryTypeName(val) {
    if (typeof val !== 'string') return false;
    return GEOJSON_GEOMETRY_TYPES.has(val.trim());
}

function isGeospatialValue(val, columnName, options) {
    if (isWktGeometry(val) || isGeoJsonGeometry(val)) {
        return true;
    }

    if (hasCoordinatePairHint(columnName) && isGeometryTypeName(val)) {
        return true;
    }

    return hasCoordinatePairHint(columnName) && isCoordinatePair(val, options);
}

function isGeospatialColumn(values, columnName, options) {
    if (values.every((value) => isGeospatialValue(value, columnName, options))) {
        return true;
    }

    if (hasLatitudeHint(columnName)) {
        return values.every((value) => isNumberInRange(value, -90, 90, options));
    }

    if (hasLongitudeHint(columnName)) {
        return values.every((value) => isNumberInRange(value, -180, 180, options));
    }

    return false;
}

// Why a column was typed as STRING although its values look numeric. The
// reasons are also the i18n keys under datasets.add.typeNotes.
export const TYPE_NOTE_REASON = {
    NON_NUMERIC_VALUES: 'nonNumericValues',
    MIXED_DECIMAL_SEPARATORS: 'mixedDecimalSeparators',
    AMBIGUOUS_DECIMAL_COMMA: 'ambiguousDecimalComma',
};

const TYPE_NOTE_EXAMPLE_LIMIT = 3;
const TYPE_NOTE_EXAMPLE_MAX_LENGTH = 24;

function buildTypeNote(reason, exampleValues, counts = {}) {
    return {
        reason,
        ...counts,
        examples: exampleValues.slice(0, TYPE_NOTE_EXAMPLE_LIMIT).map((value) =>
            value.length > TYPE_NOTE_EXAMPLE_MAX_LENGTH
                ? `${value.slice(0, TYPE_NOTE_EXAMPLE_MAX_LENGTH - 1)}…`
                : value
        ),
    };
}

function detectNumericType(values, { allowDecimalComma }) {
    const formats = values.map(getNumberFormat);
    const valuesWithFormat = (format) => values.filter((_, index) => formats[index] === format);

    const nonNumericValues = valuesWithFormat(null);
    if (nonNumericValues.length) {
        // Explained only when most values are numbers: a text column with a
        // few numbers in it needs no explanation.
        const mostlyNumeric = nonNumericValues.length * 2 <= values.length;
        return {
            dataType: DataType.STRING,
            typeNote: mostlyNumeric
                ? buildTypeNote(TYPE_NOTE_REASON.NON_NUMERIC_VALUES, nonNumericValues, {
                    count: nonNumericValues.length,
                    total: values.length,
                })
                : null,
        };
    }

    const commaValues = valuesWithFormat('comma');
    if (commaValues.length && !allowDecimalComma) {
        // In a comma-separated file, "1,234" may as well be a thousands separator.
        return {
            dataType: DataType.STRING,
            typeNote: buildTypeNote(TYPE_NOTE_REASON.AMBIGUOUS_DECIMAL_COMMA, commaValues),
        };
    }

    const dotValues = valuesWithFormat('dot');
    if (commaValues.length && dotValues.length) {
        // Next to "1,5", "1.234" may be a thousands separator, or the reverse.
        return {
            dataType: DataType.STRING,
            typeNote: buildTypeNote(TYPE_NOTE_REASON.MIXED_DECIMAL_SEPARATORS, [dotValues[0], commaValues[0]]),
        };
    }

    const hasDecimal = dotValues.length > 0 || commaValues.length > 0 || values.some(v => /e/i.test(v));
    return { dataType: hasDecimal ? DataType.DECIMAL : DataType.INTEGER, typeNote: null };
}

/**
 * Infers a column's data type from its observed values.
 *
 * Empty cells and NA-like markers (isMissingValueMarker) are no evidence of a
 * type. A decimal comma counts unless the file is comma-separated
 * (`allowDecimalComma: false`). `typeNote` explains, for the preview only, why
 * a mostly numeric column became STRING. It holds raw example values, so it
 * must never be persisted.
 */
export function detectMeasurement(values = [], columnName = '', { allowDecimalComma = true } = {}) {
    const options = { allowDecimalComma };
    const nonEmptyVals = [...new Set(
        values
            .map(v => (v == null ? '' : String(v).trim()))
            .filter(v => v && !isMissingValueMarker(v))
    )];

    if (nonEmptyVals.length === 0) {
        return { dataType: DataType.STRING, typeNote: null };
    }

    if (isGeospatialColumn(nonEmptyVals, columnName, options)) {
        return { dataType: DataType.GEOSPATIAL, typeNote: null };
    }

    if (nonEmptyVals.every(isBoolean)) {
        return { dataType: DataType.BOOLEAN, typeNote: null };
    }

    // date or datetime -> unify both as DATETIME
    if (nonEmptyVals.every(v => isISODateTime(v) || isISODate(v))) {
        return { dataType: DataType.DATETIME, typeNote: null };
    }

    return detectNumericType(nonEmptyVals, options);
}
