// Wraps a user-authored email body in a branded, responsive template.
// All inline styles for max email-client compatibility (Gmail strips <style>).

const SAFE_HEX = /^#[0-9a-fA-F]{3,8}$/;
const safeColor = (c, fallback) => (typeof c === 'string' && SAFE_HEX.test(c) ? c : fallback);
const safeUrl = (u) => {
  if (!u || typeof u !== 'string') return null;
  const s = u.trim();
  if (!/^https?:\/\//i.test(s)) return null;
  return s.replace(/[<>"']/g, '');
};
const safeText = (t, max = 80) => String(t ?? '').replace(/[<>]/g, '').slice(0, max);

export function hasAnyBranding(b) {
  if (!b) return false;
  return !!(b.logo_url || b.brand_color || b.bg_color || b.text_color || b.cta_url || b.font_family);
}

export function wrapBranded(bodyHtml, branding = {}) {
  const brand = safeColor(branding.brand_color, '#ff6b1a');
  const bg = safeColor(branding.bg_color, '#f4f4f5');
  const text = safeColor(branding.text_color, '#222222');
  const font = (typeof branding.font_family === 'string' && branding.font_family.length < 80)
    ? branding.font_family
    : 'Arial, Helvetica, sans-serif';
  const logoUrl = safeUrl(branding.logo_url);
  const ctaUrl = safeUrl(branding.cta_url);
  const ctaText = safeText(branding.cta_text, 60);

  const headerBlock = logoUrl
    ? `<tr><td style="padding:20px 32px;background:${brand};text-align:left">
        <img src="${logoUrl}" alt="" height="36" style="display:block;height:36px;border:0;outline:none;text-decoration:none">
      </td></tr>`
    : `<tr><td style="height:6px;background:${brand};line-height:6px;font-size:0">&nbsp;</td></tr>`;

  const ctaBlock = (ctaUrl && ctaText)
    ? `<tr><td style="padding:0 32px 32px;font-family:${font}">
        <a href="${ctaUrl}" style="display:inline-block;background:${brand};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:8px;font-weight:600;font-size:15px;font-family:${font}">${ctaText}</a>
      </td></tr>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title></title>
</head>
<body style="margin:0;padding:0;background:${bg};font-family:${font};color:${text};-webkit-text-size-adjust:100%">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg};padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
      ${headerBlock}
      <tr><td style="padding:32px 32px 8px;color:${text};line-height:1.6;font-size:15px;font-family:${font}">
${bodyHtml || ''}
      </td></tr>
      ${ctaBlock}
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
