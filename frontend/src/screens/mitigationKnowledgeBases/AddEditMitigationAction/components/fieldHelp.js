export const FIELD_HELP = {
  actionType:
    "Data Transformation changes the released data representation.\nContext Control changes technical, organizational, or contractual safeguards.\nThe action type determines how this action can be used by the future Mitigation Planner.",
  active:
    "Inactive actions remain stored in the catalogue but are not considered when future mitigation plans are generated.",
  sharingArrangements:
    "This filter determines when the future planner may consider the action. It does not alter the Data Sharing Activity's selected sharing arrangement.",
  implementationGuidance:
    "Describe what would need to be implemented if this action is selected in a future mitigation plan.",
  verificationCriteria:
    "Describe what evidence would be required to confirm that the action has actually been implemented. A future counterfactual assessment must not assume a control is present until this evidence is available.",
  evidenceReference:
    "Optional source supporting the applicability or implementation of this mitigation action, for example a guideline, standard, policy, or publication.",
  costEstimate:
    "Optional estimated implementation cost range. Leave blank when unknown; blank values do not mean zero.",
  setupTime:
    "Optional estimated setup-time range. Leave blank when unknown; blank values do not mean zero days.",
  estimateScope:
    "Defines what the estimate covers, for example initial setup, this sharing activity, the complete Project, or annual operation. Scope is needed so the future planner can compare estimates with Project constraints correctly.",
  attributeClassification:
    "The assessed attribute classification that makes this data transformation applicable.",
  dataType:
    "Optional datatype restriction. 'Any data type' means the action applies to the selected attribute classification regardless of datatype.",
  parameterType:
    "The kind of value that must be chosen later when this action is used inside a concrete mitigation plan.",
  riskFramework:
    "The risk-assessment configuration whose stable question and option codes this mapping refers to.",
  triggerAnswer:
    "This answer is the trigger condition. When the Recipient Assessment currently contains this answer, the mitigation action may be proposed.",
  projectedAnswer:
    "This is the counterfactual answer used only when evaluating a proposed plan. It does not overwrite the real Recipient Assessment. The changed answer should only be used after the mitigation has been implemented and verified.",
};
