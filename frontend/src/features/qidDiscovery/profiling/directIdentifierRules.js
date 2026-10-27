// Pure Direct Identifier definitions: value-pattern thresholds and value
// matchers. No detection or policy logic lives here.
//
// Field names are not matched against alias dictionaries. Interpreting a
// column name belongs to ai/columnNameRules.js and optional model predictions.
// Their combined screening may exclude attributes, but it does not create the
// value-pattern evidence defined here.
//
// Dependency direction: rules -> directIdentifierEvidence -> directIdentifierPolicy.

export const DIRECT_IDENTIFIER_CONFIDENCE = {
  HIGH: "HIGH",
  LOW: "LOW",
};

// Value-pattern support thresholds per concept. A pattern needs minimum
// support (enough analysed and matched values) and then either
// minMatchedFraction (supported -> detected) or reviewFraction (review only).
export const VALUE_PATTERN_THRESHOLDS = {
  EMAIL: {
    minAnalysedNonMissingCount: 10,
    minMatchedValueCount: 5,
    minMatchedFraction: 0.8,
    reviewFraction: 0.5,
  },
  IP_ADDRESS: {
    minAnalysedNonMissingCount: 10,
    minMatchedValueCount: 5,
    minMatchedFraction: 0.8,
    reviewFraction: 0.5,
  },
  PHONE: {
    minAnalysedNonMissingCount: 10,
    minMatchedValueCount: 5,
    minMatchedFraction: 0.85,
    reviewFraction: 0.6,
  },
  NATIONAL_IDENTIFIER: {
    minAnalysedNonMissingCount: 10,
    minMatchedValueCount: 5,
    minMatchedFraction: 0.8,
    reviewFraction: 0.5,
  },
};

export const VALUE_PATTERN_SOURCE_NAMES = {
  EMAIL: "email",
  IP_ADDRESS: "ip_address",
  PHONE: "phone",
  NATIONAL_IDENTIFIER: "national_identifier",
};

const IPV4_OCTET = "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4_REGEX = new RegExp(`^${IPV4_OCTET}(\\.${IPV4_OCTET}){3}$`);

function isEmailLike(value) {
  const text = String(value || "").trim();
  if (text.length > 254 || /\s/.test(text)) return false;
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(text);
}

function isIpv4Like(value) {
  const text = String(value || "").trim();
  return IPV4_REGEX.test(text);
}

function isIpv6Like(value) {
  const text = String(value || "").trim();
  if (!text.includes(":") || /[^0-9a-f:]/i.test(text)) return false;

  const compressedMarkerCount = (text.match(/::/g) || []).length;
  if (compressedMarkerCount > 1) return false;

  const parts = text.split(":");
  if (parts.length > 8) return false;
  if (!parts.some((part) => part !== "")) return false;
  if (!text.includes("::") && parts.length < 4) return false;
  if (!text.includes("::") && parts.some((part) => part === "")) return false;

  return parts.every((part) => part === "" || /^[0-9a-f]{1,4}$/i.test(part));
}

function isIpAddressLike(value) {
  return isIpv4Like(value) || isIpv6Like(value);
}

function isPhoneLike(value) {
  const text = String(value || "").trim();
  if (!text || /^\d+$/.test(text)) return false;
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(text)) return false;
  if (/^\d{3}-\d{2}-\d{4}$/.test(text)) return false;
  if (!/^\+?[0-9][0-9\s().-]{6,}[0-9]$/.test(text)) return false;

  const digits = text.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function isUsSsnLike(value) {
  const text = String(value || "").trim();
  if (!/^\d{3}-\d{2}-\d{4}$/.test(text)) return false;

  const [area, group, serial] = text.split("-");
  return (
    area !== "000" && area !== "666" && group !== "00" && serial !== "0000"
  );
}

export const VALUE_PATTERN_MATCHERS = {
  EMAIL: isEmailLike,
  IP_ADDRESS: isIpAddressLike,
  PHONE: isPhoneLike,
  NATIONAL_IDENTIFIER: isUsSsnLike,
};
