// Email delivery via Resend's HTTP API (https://resend.com).
// Server-side only. Returns false (no-op) when RESEND_API_KEY is not configured.

export async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) return false;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || 'EAP <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }
  return true;
}

// Branded "application paid — set your password" email.
export function inviteEmailHtml(link) {
  return `<!doctype html><html><body style="margin:0;background:#121417;font-family:Georgia,'Times New Roman',serif;color:#f0ece4;padding:40px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#16181d;border:1px solid #2a2d33;padding:40px;">
      <tr><td style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#c2a063;padding-bottom:24px;">Eurasian Art Platform</td></tr>
      <tr><td style="font-size:26px;line-height:1.3;padding-bottom:16px;">Заявка оплачена</td></tr>
      <tr><td style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#b9b2a6;padding-bottom:28px;">Спасибо! Мы получили вашу оплату. Создайте пароль, чтобы войти в личный кабинет и следить за статусом заявки.</td></tr>
      <tr><td><a href="${link}" style="display:inline-block;background:#c2a063;color:#121417;text-decoration:none;padding:14px 30px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Создать пароль</a></td></tr>
      <tr><td style="font-family:Arial,sans-serif;font-size:12px;color:#6a6459;padding-top:28px;line-height:1.6;">Если кнопка не работает, откройте ссылку:<br><span style="color:#8a8270;word-break:break-all;">${link}</span></td></tr>
    </table>
  </td></tr></table></body></html>`;
}
