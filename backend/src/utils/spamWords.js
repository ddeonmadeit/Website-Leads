// Common deliverability-damaging trigger words/patterns for subject lines.
export const SPAM_TRIGGERS = [
  'free', '!!!', '!!', 'urgent', 'act now', 'guaranteed', '100%',
  'limited time', 'risk free', 'winner', 'cash', 'click here',
  'buy now', 'apply now', 'cheap', 'weight loss', 'viagra',
  'lowest price', 'no obligation', 'no cost', 'earn $', 'make money',
  'order now', 'bonus', 'congratulations',
];

export function scanSpamTriggers(subject) {
  if (!subject) return { score: 0, hits: [] };
  const lower = subject.toLowerCase();
  const hits = [];
  for (const t of SPAM_TRIGGERS) {
    if (lower.includes(t)) hits.push(t);
  }
  // excessive punctuation / all-caps
  const excl = (subject.match(/!/g) || []).length;
  if (excl >= 2) hits.push(`${excl} exclamation marks`);
  const lettersOnly = subject.replace(/[^A-Za-z]/g, '');
  if (lettersOnly.length >= 6 && lettersOnly === lettersOnly.toUpperCase()) {
    hits.push('ALL CAPS');
  }
  return { score: hits.length, hits };
}
