// Pure data for Direct Identifier detection: field-name aliases, value-pattern
// matchers, and their confidence thresholds. Consumed by directIdentifierEvidence.js.

export const DIRECT_IDENTIFIER_CONFIDENCE = {
  HIGH: "HIGH",
  LOW: "LOW",
};

export const DIRECT_IDENTIFIER_CONCEPTS = {
  PERSON_NAME: {
    aliases: [
      "first_name",
      "last_name",
      "surname",
      "family_name",
      "full_name",
      "given_name",
      "middle_name",
      "forename",
      "personal_name",
      "person_name",
      "patient_name",
      "legal_name",
    ],
  },
  EMAIL: {
    aliases: ["email", "email_address", "e_mail", "email_addr"],
  },
  PHONE: {
    aliases: [
      "phone",
      "phone_number",
      "telephone",
      "telephone_number",
      "mobile",
      "mobile_number",
      "cell_phone",
      "cell_number",
      "contact_phone",
    ],
  },
  POSTAL_ADDRESS: {
    aliases: [
      "street_address",
      "home_address",
      "residential_address",
      "postal_address",
      "mailing_address",
    ],
  },
  NATIONAL_IDENTIFIER: {
    aliases: [
      "social_security_number",
      "ssn",
      "national_id",
      "national_identifier",
      "national_identification_number",
    ],
  },
  PASSPORT: {
    aliases: ["passport", "passport_number"],
  },
  MEDICAL_RECORD_NUMBER: {
    aliases: [
      "mrn",
      "medical_record_number",
      "medical_record_no",
      "medical_record_num",
    ],
  },
  IP_ADDRESS: {
    aliases: ["ip", "ip_address", "ip_addr", "internet_protocol_address"],
  },
};

export const TOKEN_ABBREVIATIONS = {
  addr: ["address"],
  no: ["number"],
  num: ["number"],
  tel: ["telephone"],
  mob: ["mobile"],
  fname: ["first", "name"],
  lname: ["last", "name"],
  mrn: ["medical", "record", "number"],
  ssn: ["social", "security", "number"],
};

// Tokens that mark a field name as ID-like on their own, wherever they appear
// in the name (e.g. "id_number", "record_id", "IdCode", "uuid"). A match here
// is weaker than a DIRECT_IDENTIFIER_CONCEPTS alias: it flags the field for
// review as a potential identifier. Policy excludes these fields from QID
// search by default, but the evidence itself remains LOW confidence because
// "id" alone does not say what kind of identifier it is.
export const GENERIC_IDENTIFIER_TOKENS = new Set([
  "id",
  "identifier",
  "uuid",
  "guid",
]);

export const DEFAULT_VALUE_PATTERN_THRESHOLDS = {
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
