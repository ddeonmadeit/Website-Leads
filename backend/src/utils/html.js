// Minimal HTML → plain-text converter for auto-generated plain parts.
export function htmlToText(html) {
  if (!html) return '';
  let s = String(html);
  // line-breaks
  s = s.replace(/<\s*(br|hr)\s*\/?\s*>/gi, '\n');
  s = s.replace(/<\/\s*(p|div|h[1-6]|li|tr|table)\s*>/gi, '\n');
  // keep link URLs inline: <a href="X">Y</a>  -> Y (X)
  s = s.replace(/<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, inner) => {
      const label = inner.replace(/<[^>]+>/g, '').trim();
      if (!label) return href;
      if (label.toLowerCase() === href.toLowerCase()) return href;
      return `${label} (${href})`;
    });
  s = s.replace(/<li[^>]*>/gi, '- ');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/&nbsp;/g, ' ');
  s = s.replace(/&amp;/g, '&');
  s = s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

export function renderMergeTags(template, data) {
  if (!template) return '';
  return String(template).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = data?.[key];
    return v == null ? '' : String(v);
  });
}

export function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
