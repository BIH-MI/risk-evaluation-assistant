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

function isNumeric(val) {
    if (val === null || val === undefined) return false;
    return !isNaN(val) && val !== '';
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
        /(^|[^a-z0-9])(lon|lng|long|longitude)([^a-z0-9]|$)/.test(rawName)
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

function isNumberInRange(value, min, max) {
    const num = Number(value);
    return Number.isFinite(num) && num >= min && num <= max;
}

function isCoordinatePair(val) {
    if (typeof val !== 'string') return false;
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

function isGeospatialValue(val, columnName) {
    if (isWktGeometry(val) || isGeoJsonGeometry(val)) {
        return true;
    }

    if (hasCoordinatePairHint(columnName) && isGeometryTypeName(val)) {
        return true;
    }

    return hasCoordinatePairHint(columnName) && isCoordinatePair(val);
}

function isGeospatialColumn(values, columnName) {
    if (values.every((value) => isGeospatialValue(value, columnName))) {
        return true;
    }

    if (hasLatitudeHint(columnName)) {
        return values.every((value) => isNumberInRange(value, -90, 90));
    }

    if (hasLongitudeHint(columnName)) {
        return values.every((value) => isNumberInRange(value, -180, 180));
    }

    return false;
}

export function detectMeasurement(values = [], columnName = '') {
    const vals = values.map(v => (v == null ? '' : String(v).trim()));
    const nonEmptyVals = vals.filter(Boolean);

    if (nonEmptyVals.length === 0) {
        return { dataType: DataType.STRING };
    }

    if (isGeospatialColumn(nonEmptyVals, columnName)) {
        return { dataType: DataType.GEOSPATIAL };
    }

    if (nonEmptyVals.every(isBoolean)) {
        return { dataType: DataType.BOOLEAN };
    }

    // date or datetime -> unify both as DATETIME
    if (nonEmptyVals.every(v => isISODateTime(v) || isISODate(v))) {
        return { dataType: DataType.DATETIME };
    }

    if (nonEmptyVals.every(isNumeric)) {
        const hasDecimal = nonEmptyVals.some(v => v.includes('.') || v.toLowerCase().includes('e'));
        return { dataType: hasDecimal ? DataType.DECIMAL : DataType.INTEGER };
    }

    return { dataType: DataType.STRING };
}
