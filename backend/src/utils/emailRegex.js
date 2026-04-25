const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

// Common junk patterns that shouldn't be used as real contact emails
const BLOCKLIST = [
  /example\.com$/i,
  /sentry\.io$/i,
  /wixpress\.com$/i,
  /^wordpress@/i,
  /^u00[0-9a-f]/i,
];

export function extractEmails(text) {
  if (!text) return [];
  const matches = String(text).match(EMAIL_RE) || [];
  const cleaned = matches
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length < 120)
    .filter((e) => !BLOCKLIST.some((re) => re.test(e)));
  return [...new Set(cleaned)];
}

export function firstEmail(text) {
  const list = extractEmails(text);
  return list[0] || null;
}
