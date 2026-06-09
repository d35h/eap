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

// ─── Premium branded email shell ────────────────────────────────────────────
// Editorial identity matching the site: charcoal field, gold accents, serif
// display headings + clean sans body. Table-based + inline styles for client
// compatibility (Gmail, Apple Mail, Outlook).
const C = {
  bg: '#0e1013',
  card: '#16191d',
  border: '#2a2419',
  rule: '#2d2920',
  gold: '#c2a063',
  goldText: '#10120f',
  ivory: '#f3eee4',
  muted: '#b4ac9e',
  faint: '#76705f',
};

// A body paragraph (sans, readable).
function para(text, { muted = false, gap = 16 } = {}) {
  return `<p style="margin:0 0 ${gap}px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:${muted ? C.faint : C.muted};">${text}</p>`;
}

function shell({ title, bodyHtml, button, link, fallback }) {
  const buttonRow = button && link
    ? `<tr><td style="padding-bottom:4px;">
         <a href="${link}" style="display:inline-block;background:${C.gold};color:${C.goldText};text-decoration:none;padding:14px 34px;border-radius:999px;font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">${button}</a>
       </td></tr>`
    : '';
  const fallbackRow = fallback && link
    ? `<tr><td style="padding-top:26px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${C.faint};">${fallback}<br/><a href="${link}" style="color:${C.muted};word-break:break-all;text-decoration:none;">${link}</a></td></tr>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:${C.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};padding:44px 16px;"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;background:${C.card};border:1px solid ${C.border};border-radius:16px;">
      <tr><td style="padding:46px 46px 42px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding-bottom:32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="44" style="width:44px;height:44px;border:1px solid ${C.gold};border-radius:12px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:bold;font-size:23px;line-height:44px;color:${C.gold};">E</td>
              <td style="padding-left:15px;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:3px;line-height:1.55;text-transform:uppercase;color:${C.gold};">Eurasian<br/>Art&nbsp;Platform</td>
            </tr></table>
          </td></tr>
          <tr><td style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:28px;line-height:1.25;letter-spacing:-0.3px;color:${C.ivory};padding-bottom:18px;">${title}</td></tr>
          <tr><td style="padding-bottom:${button ? '30px' : '6px'};">${bodyHtml}</td></tr>
          ${buttonRow}
          ${fallbackRow}
          <tr><td style="padding-top:36px;">
            <div style="border-top:1px solid ${C.rule};padding-top:22px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.5px;color:${C.faint};">
              Eurasian Art Platform &middot; <a href="https://myeap.xyz" style="color:${C.gold};text-decoration:none;">myeap.xyz</a>
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
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
  return {
    subject: c.subject(tour),
    html: shell({
      title: c.title(tour),
      bodyHtml: para(outcome) + para(c.detailsNote, { muted: true, gap: 0 }),
      button: loginUrl ? c.loginCta : null,
      link: loginUrl || null,
      fallback: null,
    }),
  };
}

// Jury invitation (always Russian - jurors are invited by the RU admin).
export function juryInviteEmail(link) {
  return {
    subject: 'Eurasian Art Platform · Приглашение в жюри',
    html: shell({
      title: 'Приглашение в жюри',
      bodyHtml: para('Вас пригласили в жюри Eurasian Art Platform. Создайте пароль, чтобы войти в кабинет и оценивать заявки художников.', { gap: 0 }),
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
  return shell({
    title: c.title,
    bodyHtml: para(m.body, { gap: 0 }),
    button: m.button,
    link,
    fallback: c.fallback,
  });
}
