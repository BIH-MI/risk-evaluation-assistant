export const QID_SEARCH_TYPE_LABELS = Object.freeze({
  AUTOMATIC: "Automatic",
  EXACT: "Exact Level-Wise Search",
  BEAM: "Beam Search",
});

/**
 * Translation keys for the search-type enum values, keyed by the enum value
 * itself. The enum value stays the source of truth for storage and payloads
 * — only the rendered text is localized.
 */
export const QID_SEARCH_TYPE_TRANSLATION_KEYS = Object.freeze({
  AUTOMATIC: "qidDiscoveryConfiguration.searchTypes.automatic",
  EXACT: "qidDiscoveryConfiguration.searchTypes.exact",
  BEAM: "qidDiscoveryConfiguration.searchTypes.beam",
});

export const QID_SEARCH_TYPE_OPTIONS = Object.keys(QID_SEARCH_TYPE_LABELS).map(
  (value) => ({
    value,
    translationKey: QID_SEARCH_TYPE_TRANSLATION_KEYS[value],
  })
);

export const getQidSearchTypeLabel = (t, value) =>
  t(
    QID_SEARCH_TYPE_TRANSLATION_KEYS[value],
    QID_SEARCH_TYPE_LABELS[value] || value || ""
  );
