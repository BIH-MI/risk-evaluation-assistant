import colors from "assets/theme/base/colors"; // Adjust path to match your project

/**
 * A universal color mapper for risk classifications, weights, and levels.
 * @param {string} label - The risk classification string (e.g., "COMPLIANT", "HIGH_RISK")
 * @param {Object} options - Optional parameters for dynamic or inverted mapping
 * @param {number} options.index - The index of the band in the array (for fallback)
 * @param {number} options.totalBands - Total number of bands (for fallback)
 * @param {boolean} options.isProtection - If true, reverses the logic (High = Green, Low = Red)
 * @returns {string} The hex color code from the theme
 */
export const getRiskColor = (label, options = {}) => {
  const { index, totalBands, isProtection = false } = options;
  const l = String(label || "").toUpperCase();

  // 0. Neutral / Zero weight/level is always neutral
  if (
    l.includes("ZERO") ||
    l.includes("INFORMATIONAL") ||
    l.includes("N/A")
    // NOTE: "NONE" has been removed from here so it can be evaluated as Red below!
  ) {
    return "#9e9e9e"; // Grey
  }

  // 1. Is it a WEIGHT? (Outer Circle in Pie Charts)
  if (l.includes("WEIGHT")) {
    if (isProtection) {
      if (l.includes("CRITICAL") || l.includes("SEVERE") || l.includes("10"))
        return "#2e7d32"; // Dark Green
      if (l.includes("SIGNIFICANT") || l.includes("HIGH") || l.includes("5"))
        return "#4caf50"; // Green
      if (l.includes("MODERATE") || l.includes("DOUBLE") || l.includes("3"))
        return "#81c784"; // Light Green
      if (l.includes("MINIMAL") || l.includes("STANDARD") || l.includes("1"))
        return "#c8e6c9"; // Very Light Green
    } else {
      if (l.includes("CRITICAL") || l.includes("SEVERE") || l.includes("10"))
        return "#c62828"; // Dark Red
      if (l.includes("SIGNIFICANT") || l.includes("HIGH") || l.includes("5"))
        return "#f44336"; // Red
      if (l.includes("MODERATE") || l.includes("DOUBLE") || l.includes("3"))
        return "#ff9800"; // Orange
      if (l.includes("MINIMAL") || l.includes("STANDARD") || l.includes("1"))
        return "#ffeb3b"; // Yellow
    }
  }

  // 2. Standard Risk metrics (Levels / Bands)
  if (isProtection) {
    if (
      l.includes("MAX") ||
      l.includes("HIGH") ||
      l.includes("CRITICAL") ||
      l.includes("SEVERE") ||
      l.includes("SIGNIFICANT")
    ) {
      return colors.success?.main || "#4caf50"; // Green
    }
    if (
      l.includes("MEDIUM") ||
      l.includes("MODERATE") ||
      l.includes("DOUBLE") ||
      l.includes("ATTENTION")
    ) {
      return colors.warning?.main || "#ff9800"; // Orange
    }
    if (
      l.includes("LOW") ||
      l.includes("MINIMAL") ||
      l.includes("NONE") ||
      l.includes("STANDARD") ||
      l.includes("SLIGHT")
    ) {
      return colors.error?.main || "#f44336"; // Red
    }
  } else {
    if (
      l.includes("COMPLIANT") ||
      l.includes("SAFE") ||
      l.includes("ACCEPTABLE") ||
      l.includes("NO RISK") ||
      l.includes("NO_RISK") ||
      l.includes("STABLE")
    ) {
      return "#dddddd"; // Light Grey
    }
    if (
      l.includes("LOW") ||
      l.includes("SLIGHT") ||
      l.includes("MINIMAL") ||
      l.includes("STANDARD")
    ) {
      return colors.success?.main || "#4caf50"; // Green
    }
    if (
      l.includes("MODERATE") ||
      l.includes("MEDIUM") ||
      l.includes("REVIEW") ||
      l.includes("WARNING") ||
      l.includes("NEEDS") ||
      l.includes("ATTENTION") ||
      l.includes("DOUBLE")
    ) {
      return colors.warning?.main || "#ff9800"; // Orange
    }
    if (
      l.includes("HIGH") ||
      l.includes("RISK") ||
      l.includes("CRITICAL") ||
      l.includes("UNACCEPTABLE") ||
      l.includes("SEVERE") ||
      l.includes("SIGNIFICANT") ||
      l.includes("MAX")
    ) {
      return colors.error?.main || "#f44336"; // Red
    }
  }

  // 3. Dynamic Index Fallback
  if (totalBands === 2) {
    return index === 0
      ? colors.success?.main || "#4caf50"
      : colors.error?.main || "#f44336";
  } else if (totalBands === 3) {
    if (index === 0) return colors.success?.main || "#4caf50";
    if (index === 1) return colors.warning?.main || "#ff9800";
    return colors.error?.main || "#f44336";
  }

  return "#dddddd";
};
