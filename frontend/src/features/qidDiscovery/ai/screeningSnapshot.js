import { REVIEW_STATE, SCREENING_STATUS } from "./screeningStatus";

/*
 * Persisted form of a column's screening (getColumnScreening): what its
 * status indicator showed in Add Dataset, stored with the attribute
 * (AttributeScreeningSnapshot on the backend) so Edit Dataset can show the
 * same details. Descriptive only: never Direct Identifier evidence, and the
 * persisted decision stays the attribute's excluded flag.
 */

/**
 * Snapshot of a column's screening, or null while it is still pending.
 *
 * @param {Object} screening Result of getColumnScreening.
 * @param {string} columnName Name the screening was computed for.
 */
export function toScreeningSnapshot(screening, columnName) {
  if (!screening || screening.status === SCREENING_STATUS.PENDING) {
    return null;
  }
  const { prediction } = screening;
  return {
    status: screening.status,
    message: screening.message,
    category: prediction.category || null,
    valueConcept: prediction.valueConcept || null,
    // Both are shown as "Potential identifier" when nothing more is named.
    potentialIdentifier: Boolean(prediction.nameOnly || prediction.valueReview),
    uncertain: Boolean(prediction.uncertain),
    evidence: [...screening.evidence],
    columnName,
  };
}

/** Screening in the shape AiColumnAssessmentInfo displays, or null. */
export function fromScreeningSnapshot(snapshot) {
  if (!snapshot?.status) return null;
  const review =
    snapshot.status === SCREENING_STATUS.REVIEW_NEEDED
      ? REVIEW_STATE.REQUIRED
      : snapshot.status === SCREENING_STATUS.REVIEWED
      ? REVIEW_STATE.COMPLETED
      : REVIEW_STATE.NOT_REQUIRED;
  return {
    status: snapshot.status,
    review,
    message: snapshot.message,
    prediction: {
      category: snapshot.category || null,
      nameOnly: Boolean(snapshot.potentialIdentifier),
      valueConcept: snapshot.valueConcept || null,
      valueReview: false,
      uncertain: Boolean(snapshot.uncertain),
    },
    evidence: snapshot.evidence || [],
    screenedName: snapshot.columnName || null,
  };
}

/**
 * Records a researcher's checkbox decision in a stored snapshot, as Add
 * Dataset does: the screening result is kept, the status becomes Reviewed.
 */
export function markScreeningSnapshotReviewed(snapshot, excluded) {
  if (!snapshot?.status) return snapshot;
  return {
    ...snapshot,
    status: SCREENING_STATUS.REVIEWED,
    message: excluded ? "reviewedExcluded" : "reviewedIncluded",
  };
}
