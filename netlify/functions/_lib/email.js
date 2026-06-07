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
    subject: 'Eurasian Art Platform · Заявка оплачена',
    title: 'Заявка оплачена',
    fallback: 'Если кнопка не работает, откройте ссылку:',
    invite: { body: 'Спасибо! Мы получили вашу оплату. Создайте пароль, чтобы войти в личный кабинет и следить за статусом заявки.', button: 'Создать пароль' },
    login: { body: 'Спасибо! Мы получили вашу оплату. Войдите в личный кабинет, чтобы следить за статусом заявки.', button: 'Войти в кабинет' },
  },
  en: {
    subject: 'Eurasian Art Platform · Application paid',
    title: 'Application paid',
    fallback: 'If the button does not work, open this link:',
    invite: { body: 'Thank you! We have received your payment. Set a password to sign in to your account and follow your application status.', button: 'Set password' },
    login: { body: 'Thank you! We have received your payment. Sign in to your account to follow your application status.', button: 'Open account' },
  },
  kz: {
    subject: 'Eurasian Art Platform · Өтінім төленді',
    title: 'Өтінім төленді',
    fallback: 'Түйме жұмыс істемесе, сілтемені ашыңыз:',
    invite: { body: 'Рақмет! Төлеміңізді алдық. Жеке кабинетке кіріп, өтінім күйін бақылау үшін құпиясөз орнатыңыз.', button: 'Құпиясөз орнату' },
    login: { body: 'Рақмет! Төлеміңізді алдық. Өтінім күйін бақылау үшін жеке кабинетке кіріңіз.', button: 'Кабинетке кіру' },
  },
  zh: {
    subject: 'Eurasian Art Platform · 申请已支付',
    title: '申请已支付',
    fallback: '如果按钮无法使用，请打开此链接：',
    invite: { body: '谢谢！我们已收到您的付款。请设置密码，以登录个人账户并跟踪申请状态。', button: '设置密码' },
    login: { body: '谢谢！我们已收到您的付款。请登录个人账户以跟踪申请状态。', button: '进入账户' },
  },
};

export function emailCopy(lang) {
  return COPY[lang] || COPY.en;
}

// Generic branded email shell (same look as the paid email).
function brandedEmail({ title, body, button, link, fallback }) {
  return `<!doctype html><html><body style="margin:0;background:#121417;font-family:Georgia,'Times New Roman',serif;color:#f0ece4;padding:40px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#16181d;border:1px solid #2a2d33;padding:40px;">
      <tr><td style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#c2a063;padding-bottom:24px;">Eurasian Art Platform</td></tr>
      <tr><td style="font-size:26px;line-height:1.3;padding-bottom:16px;">${title}</td></tr>
      <tr><td style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#b9b2a6;padding-bottom:28px;">${body}</td></tr>
      <tr><td><a href="${link}" style="display:inline-block;background:#c2a063;color:#121417;text-decoration:none;padding:14px 30px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;">${button}</a></td></tr>
      <tr><td style="font-family:Arial,sans-serif;font-size:12px;color:#6a6459;padding-top:28px;line-height:1.6;">${fallback}<br><span style="color:#8a8270;word-break:break-all;">${link}</span></td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Localised copy for tour-result emails.
const TOUR_COPY = {
  ru: {
    subject: (t) => `Eurasian Art Platform · Результаты ${t === 1 ? 'первого' : 'второго'} тура`,
    title: (t) => `Результаты ${t === 1 ? 'первого' : 'второго'} тура`,
    advanced: (t) => (t === 1
      ? 'Поздравляем! Ваша работа прошла во второй тур.'
      : 'Поздравляем! Ваша работа вошла в число победителей.'),
    notAdvanced: (t) => (t === 1
      ? 'Спасибо за участие. К сожалению, в этот раз ваша работа не прошла во второй тур.'
      : 'Спасибо за участие. К сожалению, ваша работа не вошла в число победителей.'),
    feedbackLabel: 'Комментарии жюри',
    loginCta: 'Войти и посмотреть результаты',
    detailsNote: 'Подробные результаты доступны в вашем личном кабинете.',
  },
  en: {
    subject: (t) => `Eurasian Art Platform · ${t === 1 ? 'First' : 'Second'} round results`,
    title: (t) => `${t === 1 ? 'First' : 'Second'} round results`,
    advanced: (t) => (t === 1
      ? 'Congratulations! Your work has advanced to the second round.'
      : 'Congratulations! Your work is among the winners.'),
    notAdvanced: (t) => (t === 1
      ? 'Thank you for taking part. Unfortunately your work did not advance to the second round this time.'
      : 'Thank you for taking part. Unfortunately your work is not among the winners.'),
    feedbackLabel: 'Jury feedback',
    loginCta: 'Log in to see your results',
    detailsNote: 'Detailed results are available in your account.',
  },
  kz: {
    subject: (t) => `Eurasian Art Platform · ${t === 1 ? 'Бірінші' : 'Екінші'} тур нәтижелері`,
    title: (t) => `${t === 1 ? 'Бірінші' : 'Екінші'} тур нәтижелері`,
    advanced: (t) => (t === 1
      ? 'Құттықтаймыз! Жұмысыңыз екінші турға өтті.'
      : 'Құттықтаймыз! Жұмысыңыз жеңімпаздар қатарына енді.'),
    notAdvanced: (t) => (t === 1
      ? 'Қатысқаныңызға рақмет. Өкінішке орай, жұмысыңыз бұл жолы екінші турға өтпеді.'
      : 'Қатысқаныңызға рақмет. Өкінішке орай, жұмысыңыз жеңімпаздар қатарына енбеді.'),
    feedbackLabel: 'Қазылар алқасының пікірлері',
    loginCta: 'Нәтижелерді көру үшін кіріңіз',
    detailsNote: 'Толық нәтижелер жеке кабинетіңізде қолжетімді.',
  },
  zh: {
    subject: (t) => `Eurasian Art Platform · ${t === 1 ? '第一轮' : '第二轮'}结果`,
    title: (t) => `${t === 1 ? '第一轮' : '第二轮'}结果`,
    advanced: (t) => (t === 1
      ? '恭喜！您的作品已晋级第二轮。'
      : '恭喜！您的作品入选获奖名单。'),
    notAdvanced: (t) => (t === 1
      ? '感谢您的参与。很遗憾，您的作品本次未能晋级第二轮。'
      : '感谢您的参与。很遗憾，您的作品未能入选获奖名单。'),
    feedbackLabel: '评委意见',
    loginCta: '登录查看您的结果',
    detailsNote: '详细结果可在您的账户中查看。',
  },
};

// Tour-result email: outcome line + "see details in your cabinet" + a login
// button. Detailed feedback/scores live in the cabinet, not the email.
export function tourResultEmail({ lang, tour, advanced, loginUrl }) {
  const c = TOUR_COPY[lang] || TOUR_COPY.en;
  const outcome = advanced ? c.advanced(tour) : c.notAdvanced(tour);
  const loginHtml = loginUrl
    ? `<tr><td style="padding-top:28px;"><a href="${loginUrl}" style="display:inline-block;background:#c2a063;color:#121417;text-decoration:none;padding:14px 30px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;">${c.loginCta}</a></td></tr>`
    : '';
  const html = `<!doctype html><html><body style="margin:0;background:#121417;font-family:Georgia,'Times New Roman',serif;color:#f0ece4;padding:40px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#16181d;border:1px solid #2a2d33;padding:40px;">
      <tr><td style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#c2a063;padding-bottom:24px;">Eurasian Art Platform</td></tr>
      <tr><td style="font-size:24px;line-height:1.3;padding-bottom:14px;">${c.title(tour)}</td></tr>
      <tr><td style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#b9b2a6;padding-bottom:8px;">${outcome}</td></tr>
      <tr><td style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#8a8270;">${c.detailsNote}</td></tr>
      ${loginHtml}
    </table>
  </td></tr></table></body></html>`;
  return { subject: c.subject(tour), html };
}

// Jury invitation (always Russian - jurors are invited by the RU admin).
export function juryInviteEmail(link) {
  return {
    subject: 'Eurasian Art Platform · Приглашение в жюри',
    html: brandedEmail({
      title: 'Приглашение в жюри',
      body: 'Вас пригласили в жюри Eurasian Art Platform. Создайте пароль, чтобы войти в кабинет и оценивать заявки художников.',
      button: 'Создать пароль',
      link,
      fallback: 'Если кнопка не работает, откройте ссылку:',
    }),
  };
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
