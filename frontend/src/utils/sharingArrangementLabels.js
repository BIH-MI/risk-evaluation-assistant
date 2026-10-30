// Sharing arrangements a Data Sharing Activity can require and a mitigation action can be restricted to.
export const SHARING_ARRANGEMENT_OPTIONS = [
  "PUBLIC_RELEASE",
  "CONTROLLED_DATA_TRANSFER",
  "SECURE_REMOTE_ANALYSIS",
  "MANAGED_QUERY",
];

// English labels of the knowledge-base administration screens. CONTROLLED_TRANSFER is the legacy
// code of CONTROLLED_DATA_TRANSFER.
const SHARING_ARRANGEMENT_LABELS = {
  PUBLIC_RELEASE: "Public Release",
  CONTROLLED_TRANSFER: "Controlled Data Transfer",
  CONTROLLED_DATA_TRANSFER: "Controlled Data Transfer",
  SECURE_REMOTE_ANALYSIS: "Secure Remote Analysis",
  MANAGED_QUERY: "Managed Query",
};

export function formatSharingArrangement(value) {
  if (SHARING_ARRANGEMENT_LABELS[value]) {
    return SHARING_ARRANGEMENT_LABELS[value];
  }

  return String(value || "")
    .toLowerCase()
    .split("_")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}
