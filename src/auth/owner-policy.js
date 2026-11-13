function evaluateOwnerRegistration(email, ownerEmail) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const configuredOwner = String(ownerEmail || "").trim().toLowerCase();
  if (!configuredOwner) {
    return {
      ok: false,
      status: 503,
      code: "owner_not_configured",
      error: "Owner registration is not configured. Set AUREX_OWNER_EMAIL on the server."
    };
  }
  if (!normalizedEmail || normalizedEmail !== configuredOwner) {
    return {
      ok: false,
      status: 403,
      code: "not_configured_owner",
      error: "Registration is restricted to the configured Aurex owner."
    };
  }
  return { ok: true, status: 200, code: "owner_allowed", error: null };
}

module.exports = { evaluateOwnerRegistration };
