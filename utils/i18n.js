const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const coerceLocale = (raw) => {
  const value = normalizeString(raw).toLowerCase();
  if (value.startsWith("ar")) return "ar";
  return "en";
};

/**
 * Prefer explicit `?lang=` / `?locale=` when present, otherwise parse Accept-Language.
 */
const resolveRequestLocale = (req) => {
  const rawLang = normalizeString(req?.query?.lang) || normalizeString(req?.query?.locale);
  if (rawLang) {
    return coerceLocale(rawLang);
  }

  const header = normalizeString(req?.headers?.["accept-language"]);
  if (!header) return "en";

  // Example: "ar-AE,ar;q=0.9,en;q=0.8"
  const first = header.split(",")[0] || "";
  return coerceLocale(first.split(";")[0]);
};

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/**
 * Accepts:
 * - legacy string
 * - { en, ar }
 * - string JSON of `{ en, ar }`
 */
const normalizeBilingualField = (value, { fieldName = "field" } = {}) => {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (value === null) {
    return { ok: true, value: null };
  }

  if (typeof value === "string") {
    const trimmed = normalizeString(value);
    if (!trimmed) {
      return { ok: true, value: { en: "", ar: "" } };
    }

    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeBilingualField(parsed, { fieldName });
      } catch {
        return { ok: true, value: { en: trimmed, ar: trimmed } };
      }
    }

    return { ok: true, value: { en: trimmed, ar: trimmed } };
  }

  if (isPlainObject(value)) {
    const en = normalizeString(value.en);
    const ar = normalizeString(value.ar);
    return { ok: true, value: { en, ar } };
  }

  return {
    ok: false,
    error: new Error(`${fieldName} must be a string or an object with en/ar strings`),
  };
};

const assertBilingualRequired = (value, { fieldName }) => {
  if (!isPlainObject(value)) {
    const error = new Error(`${fieldName} is invalid`);
    error.statusCode = 400;
    throw error;
  }

  const en = normalizeString(value.en);
  const ar = normalizeString(value.ar);
  if (!en || !ar) {
    const error = new Error(`${fieldName}.en and ${fieldName}.ar are required`);
    error.statusCode = 400;
    throw error;
  }

  return { en, ar };
};

const pickLocalizedString = (value, locale) => {
  const loc = locale === "ar" ? "ar" : "en";

  if (typeof value === "string") {
    return value;
  }

  if (!isPlainObject(value)) {
    return "";
  }

  const primary = normalizeString(value[loc]);
  if (primary) return primary;

  const fallback = loc === "ar" ? normalizeString(value.en) : normalizeString(value.ar);
  return fallback || "";
};

const localizeServiceForPublic = (service, locale) => {
  if (!service || typeof service !== "object") return service;

  const title = pickLocalizedString(service.title, locale);
  const description = pickLocalizedString(service.description, locale);
  const category = pickLocalizedString(service.category, locale);
  const metaTitle = pickLocalizedString(service.metaTitle, locale);
  const metaDescription = pickLocalizedString(service.metaDescription, locale);

  const features = Array.isArray(service.features)
    ? service.features.map((item) => pickLocalizedString(item, locale)).filter(Boolean)
    : [];

  return {
    ...service,
    title,
    description,
    category,
    metaTitle,
    metaDescription,
    features,
  };
};

const localizeBlogForPublic = (blog, locale) => {
  if (!blog || typeof blog !== "object") return blog;

  return {
    ...blog,
    title: pickLocalizedString(blog.title, locale),
    shortDesc: pickLocalizedString(blog.shortDesc, locale),
    content: pickLocalizedString(blog.content, locale),
    category: pickLocalizedString(blog.category, locale),
    metaTitle: pickLocalizedString(blog.metaTitle, locale),
    metaDescription: pickLocalizedString(blog.metaDescription, locale),
  };
};

module.exports = {
  normalizeString,
  resolveRequestLocale,
  normalizeBilingualField,
  assertBilingualRequired,
  pickLocalizedString,
  localizeServiceForPublic,
  localizeBlogForPublic,
};
