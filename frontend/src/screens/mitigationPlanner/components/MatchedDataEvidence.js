import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import RABox from "components/layout/RABox";
import RATypography from "components/display/RATypography";
import { ExpandableSection, SectionLabel } from "./PlannerPrimitives";
import { formatAttributeRole, formatDataType } from "../utils/mitigationPlannerFormatters";

const COMBINATION_ROLE = "CANDIDATE_QID_COMBINATION";

function groupBy(items, keyOf) {
  return items.reduce((groups, item) => {
    const key = keyOf(item);
    return groups.set(key, [...(groups.get(key) || []), item]);
  }, new Map());
}

const describeAttribute = (target) =>
  [formatAttributeRole(target.attributeRole), target.dataType && formatDataType(target.dataType)]
    .filter(Boolean)
    .join(" · ");

function AttributeEvidence({ role, targets }) {
  const { t } = useTranslation();
  const roleLabel = formatAttributeRole(role);

  if (targets.length === 1) {
    return (
      <RABox>
        <RATypography variant="body2" fontWeight="bold" sx={{ overflowWrap: "anywhere" }}>
          {targets[0].attributeNames[0]}
        </RATypography>
        <RATypography variant="caption" display="block">
          {describeAttribute(targets[0])}
        </RATypography>
      </RABox>
    );
  }

  return (
    <RABox>
      <RATypography variant="body2">
        {t("mitigationPlanner.card.attributesMatched", "{{count}} {{role}} attributes matched", {
          count: targets.length,
          role: roleLabel,
        })}
      </RATypography>
      <ExpandableSection label={t("mitigationPlanner.card.showAttributes", "Show matched attributes")}>
        {targets.map((target) => (
          <RABox key={`${target.tableName}:${target.attributeNames[0]}`} py={0.25}>
            <RATypography variant="body2" fontWeight="bold" component="span" sx={{ overflowWrap: "anywhere" }}>
              {target.attributeNames[0]}
            </RATypography>
            <RATypography variant="caption" component="span">
              {"  "}
              {target.dataType ? formatDataType(target.dataType) : ""}
              {target.tableName ? ` · ${target.tableName}` : ""}
            </RATypography>
          </RABox>
        ))}
      </ExpandableSection>
    </RABox>
  );
}

AttributeEvidence.propTypes = {
  role: PropTypes.string.isRequired,
  targets: PropTypes.array.isRequired,
};

function CombinationEvidence({ tableName, targets }) {
  const { t } = useTranslation();

  return (
    <RABox>
      <RATypography variant="body2">
        {t(
          "mitigationPlanner.card.combinationsMatched",
          "{{count}} Candidate QID {{noun}} identified in {{table}}",
          { count: targets.length, noun: targets.length === 1 ? "combination" : "combinations", table: tableName }
        )}
      </RATypography>
      <ExpandableSection
        label={t("mitigationPlanner.card.showCombinations", "Show matched combinations")}
      >
        <RABox component="ol" sx={{ m: 0, pl: 3 }}>
          {targets.map((target) => (
            <li key={target.attributeNames.join("+")}>
              <RATypography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                {target.attributeNames.join(" + ")}
              </RATypography>
            </li>
          ))}
        </RABox>
      </ExpandableSection>
    </RABox>
  );
}

CombinationEvidence.propTypes = {
  tableName: PropTypes.string,
  targets: PropTypes.array.isRequired,
};

CombinationEvidence.defaultProps = {
  tableName: "",
};

// Candidate QID evidence is used to match catalogue actions; it does not represent a
// measured residual re-identification risk.
export default function MatchedDataEvidence({ targets }) {
  const { t } = useTranslation();
  const combinations = targets.filter((target) => target.attributeRole === COMBINATION_ROLE);
  const attributes = targets.filter((target) => target.attributeRole !== COMBINATION_ROLE);

  return (
    <RABox display="flex" flexDirection="column" gap={1}>
      <SectionLabel>{t("mitigationPlanner.card.matchedEvidence", "Matched Dataset Assessment evidence")}</SectionLabel>
      {targets.length === 0 && (
        <RATypography variant="body2" sx={{ color: "text.secondary" }}>
          This action is linked to a current Impact answer, not to specific attributes.
        </RATypography>
      )}
      {[...groupBy(attributes, (target) => target.attributeRole)].map(([role, group]) => (
        <AttributeEvidence key={role} role={role} targets={group} />
      ))}
      {[...groupBy(combinations, (target) => target.tableName)].map(([tableName, group]) => (
        <CombinationEvidence key={tableName} tableName={tableName} targets={group} />
      ))}
      {combinations.length > 0 && (
        <RATypography variant="caption">
          {t(
            "mitigationPlanner.card.combinationsNote",
            "These combinations were retained as Candidate QID evidence. This does not represent a measured residual re-identification risk."
          )}
        </RATypography>
      )}
    </RABox>
  );
}

MatchedDataEvidence.propTypes = {
  targets: PropTypes.arrayOf(
    PropTypes.shape({
      attributeRole: PropTypes.string,
      tableName: PropTypes.string,
      attributeNames: PropTypes.arrayOf(PropTypes.string),
    })
  ).isRequired,
};
