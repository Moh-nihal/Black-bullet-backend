const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
};

const verifyRecaptchaToken = async ({ token, remoteIp }) => {
  const secret = normalizeString(process.env.RECAPTCHA_SECRET_KEY);
  if (!secret) {
    const error = new Error("Missing RECAPTCHA_SECRET_KEY configuration");
    error.statusCode = 500;
    throw error;
  }

  const recaptchaToken = normalizeString(token);
  if (!recaptchaToken) {
    return { ok: false, reason: "missing_token" };
  }

  const minScore = toNumber(process.env.RECAPTCHA_MIN_SCORE, 0.5);
  const body = new URLSearchParams({
    secret,
    response: recaptchaToken,
  });

  const ip = normalizeString(remoteIp);
  if (ip) {
    body.append("remoteip", ip);
  }

  const response = await fetch(RECAPTCHA_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    return { ok: false, reason: "verification_unavailable" };
  }

  const payload = await response.json();
  const isSuccess = Boolean(payload?.success);
  const score = typeof payload?.score === "number" ? payload.score : null;
  const scoreOk = score === null ? true : score >= minScore;

  if (!isSuccess || !scoreOk) {
    return {
      ok: false,
      reason: !isSuccess ? "verification_failed" : "score_below_threshold",
      score,
      minScore,
      errors: Array.isArray(payload?.["error-codes"]) ? payload["error-codes"] : [],
    };
  }

  return {
    ok: true,
    score,
    minScore,
    action: payload?.action || null,
    hostname: payload?.hostname || null,
  };
};

module.exports = {
  verifyRecaptchaToken,
};
