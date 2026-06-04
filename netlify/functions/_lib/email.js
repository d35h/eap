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

// Localised copy for the "application paid" email.
// `invite` = new applicant (set a password); `login` = returning applicant (magic login link).
const COPY = {
  ru: {
    subject: 'EAP — заявка оплачена',
    title: 'Заявка оплачена',
    fallback: 'Если кнопка не работает, откройте ссылку:',
    invite: { body: 'Спасибо! Мы получили вашу оплату. Создайте пароль, чтобы войти в личный кабинет и следить за статусом заявки.', button: 'Создать пароль' },
    login: { body: 'Спасибо! Мы получили вашу оплату. Войдите в личный кабинет, чтобы следить за статусом заявки.', button: 'Войти в кабинет' },
  },
  en: {
    subject: 'EAP — application paid',
    title: 'Application paid',
    fallback: 'If the button does not work, open this link:',
    invite: { body: 'Thank you! We have received your payment. Set a password to sign in to your account and follow your application status.', button: 'Set password' },
    login: { body: 'Thank you! We have received your payment. Sign in to your account to follow your application status.', button: 'Open account' },
  },
  kz: {
    subject: 'EAP — өтінім төленді',
    title: 'Өтінім төленді',
    fallback: 'Түйме жұмыс істемесе, сілтемені ашыңыз:',
    invite: { body: 'Рақмет! Төлеміңізді алдық. Жеке кабинетке кіріп, өтінім күйін бақылау үшін құпиясөз орнатыңыз.', button: 'Құпиясөз орнату' },
    login: { body: 'Рақмет! Төлеміңізді алдық. Өтінім күйін бақылау үшін жеке кабинетке кіріңіз.', button: 'Кабинетке кіру' },
  },
  zh: {
    subject: 'EAP — 申请已支付',
    title: '申请已支付',
    fallback: '如果按钮无法使用，请打开此链接：',
    invite: { body: '谢谢！我们已收到您的付款。请设置密码，以登录个人账户并跟踪申请状态。', button: '设置密码' },
    login: { body: '谢谢！我们已收到您的付款。请登录个人账户以跟踪申请状态。', button: '进入账户' },
  },
};

export function emailCopy(lang) {
  return COPY[lang] || COPY.en;
}

// Branded "application paid" email. mode: 'invite' (new) | 'login' (returning).
export function paidEmailHtml(link, lang, mode) {
  const c = emailCopy(lang);
  const m = c[mode] || c.invite;
  return `<!doctype html><html><body style="margin:0;background:#121417;font-family:Georgia,'Times New Roman',serif;color:#f0ece4;padding:40px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#16181d;border:1px solid #2a2d33;padding:40px;">
      <tr><td style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#c2a063;padding-bottom:24px;">Eurasian Art Platform</td></tr>
      <tr><td style="font-size:26px;line-height:1.3;padding-bottom:16px;">${c.title}</td></tr>
      <tr><td style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#b9b2a6;padding-bottom:28px;">${m.body}</td></tr>
      <tr><td><a href="${link}" style="display:inline-block;background:#c2a063;color:#121417;text-decoration:none;padding:14px 30px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;">${m.button}</a></td></tr>
      <tr><td style="font-family:Arial,sans-serif;font-size:12px;color:#6a6459;padding-top:28px;line-height:1.6;">${c.fallback}<br><span style="color:#8a8270;word-break:break-all;">${link}</span></td></tr>
    </table>
  </td></tr></table></body></html>`;
}
