// Per-table AI suggestion state shape, shared by the hook, the form and
// PreviewTable. Kept free of the worker client so it never pulls in the AI
// worker.

export const AI_TABLE_STATUS = Object.freeze({
  IDLE: "idle",
  LOADING_MODEL: "loading-model",
  CLASSIFYING: "classifying",
  READY: "ready",
  UNAVAILABLE: "unavailable",
});

export const EMPTY_TABLE_STATE = Object.freeze({
  status: AI_TABLE_STATUS.IDLE,
  progress: null,
  error: null,
  suggestions: {},
});

export function getTableAiState(aiStateByTable, tableId) {
  return aiStateByTable[tableId] || EMPTY_TABLE_STATE;
}
