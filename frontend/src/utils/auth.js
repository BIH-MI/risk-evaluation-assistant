function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;

  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function getRolesFromClaims(claims, clientId) {
  if (!claims) return [];

  const realmRoles = claims.realm_access?.roles || [];
  const clientRoles = clientId
    ? claims.resource_access?.[clientId]?.roles || []
    : [];

  return [...realmRoles, ...clientRoles].filter(Boolean);
}

export function getUserRoles(user, clientId = process.env.REACT_APP_OIDC_CLIENT_ID) {
  const roles = [
    ...getRolesFromClaims(user?.profile, clientId),
    ...getRolesFromClaims(decodeJwtPayload(user?.id_token), clientId),
    ...getRolesFromClaims(decodeJwtPayload(user?.access_token), clientId),
  ];

  return Array.from(new Set(roles));
}

export function hasUserRole(user, role, clientId) {
  const expectedRole = String(role).toLowerCase();

  return getUserRoles(user, clientId).some(
    (userRole) => String(userRole).toLowerCase() === expectedRole
  );
}

export function isAdminUser(user) {
  return hasUserRole(user, "ADMIN");
}
