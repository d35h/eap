# EAP — Eurasian Art Platform

Сайт платформы современного искусства Евразии.
React + Vite + React Router. Без сторонних UI-фреймворков.

## Что работает

- 🌐 Переключение языков (RU / KZ / EN) — выбор сохраняется в localStorage
- ⏱ Обратный отсчёт до дедлайна (тикает в реальном времени)
- 📝 Многошаговая форма подачи заявки (4 шага, валидация на каждом)
- 💾 Автосохранение формы в localStorage — если страница обновится, данные не потеряются
- 📎 Загрузка файлов с drag-and-drop
- 💳 Выбор способа оплаты (Apple Pay / Card / Google Pay / Bank)
- ✉️ Контактная форма с валидацией
- 📱 Адаптивная вёрстка + мобильное меню
- 🧭 Роутинг по страницам без перезагрузки

## Структура проекта

```
eap-site/
├── package.json
├── vite.config.js
├── index.html              ← точка входа HTML
├── src/
│   ├── main.jsx            ← инициализация React + роутер
│   ├── App.jsx             ← маршруты страниц
│   ├── styles.css          ← вся дизайн-система
│   ├── i18n.js             ← переводы RU/KZ/EN
│   ├── components/
│   │   ├── Header.jsx      ← шапка с навигацией и языками
│   │   ├── Footer.jsx
│   │   └── Countdown.jsx   ← таймер обратного отсчёта
│   ├── hooks/
│   │   ├── useTranslation.jsx  ← контекст языка
│   │   └── useFormPersist.js   ← автосохранение формы
│   └── pages/
│       ├── Landing.jsx     ← главная (все секции)
│       ├── Apply.jsx       ← визард подачи заявки
│       ├── Process.jsx     ← страница «Как подать»
│       └── NotFound.jsx
```

## Запуск локально

Нужен **Node.js 18+**. Если не установлен — скачайте на https://nodejs.org

```bash
# 1. Установить зависимости
npm install

# 2. Запустить dev-сервер
npm run dev
```

Откроется на `http://localhost:5173`. Изменения в коде применяются мгновенно.

## Сборка для продакшна

```bash
npm run build
```

Результат — в папке `dist/`. Это статические файлы, которые можно залить куда угодно.

## Деплой

### Cloudflare Pages (рекомендую — бесплатно и быстро)
1. Залейте проект на GitHub
2. Зайдите в Cloudflare Pages → Create Project → Connect to Git
3. Выберите репозиторий
4. Build command: `npm run build`
5. Build output: `dist`
6. Готово. Деплоится за 30 секунд, домен бесплатный.

### Netlify
1. https://app.netlify.com → Import from Git
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Создайте файл `public/_redirects` с содержимым: `/*  /index.html  200`
   (чтобы роутинг React Router работал на всех маршрутах)

### Vercel
1. https://vercel.com → Import Project
2. Framework: Vite (определит автоматически)
3. Deploy

### Свой сервер (nginx / Apache)
Залейте содержимое `dist/` в корень. Настройте веб-сервер так, чтобы все маршруты возвращали `index.html` (для SPA-роутинга).

Пример для nginx:
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Что нужно подключить к реальной работе

В коде уже есть точки интеграции, помеченные комментариями:

### 1. Контактная форма — `src/pages/Landing.jsx`, функция `submit`
Сейчас симулирует отправку. Подключите один из вариантов:
- **EmailJS** — без бэкенда, отправка прямо из браузера
- **Resend** — нужен серверный код (Cloudflare Worker / Vercel Function)
- **Formspree** — самый простой, не нужен бэк

### 2. Оплата — `src/pages/Apply.jsx`, функция `submitFinal`
Сейчас симулирует Stripe. Подключение:
1. Создайте аккаунт на https://stripe.com
2. Поставьте `@stripe/stripe-js`: `npm install @stripe/stripe-js`
3. Создайте Stripe Checkout Session на бэке (Cloudflare Worker подойдёт)
4. Замените симуляцию на редирект в Stripe Checkout
5. После успешной оплаты — сохраните заявку в БД

### 3. База художников
Рекомендую **Supabase** (бесплатно до 50К строк):
1. Создайте проект на supabase.com
2. Таблица `applicants`: id, first_name, last_name, email, phone, country, city, work_data (jsonb), payment_id, status, created_at
3. После оплаты — `supabase.from('applicants').insert(...)`

### 4. Загрузка файлов
Сейчас файлы хранятся в памяти браузера. Для реальной работы:
- Supabase Storage (вместе с БД)
- Cloudflare R2
- Uploadthing
Файлы заливайте только после успешной оплаты, чтобы не тратить место на брошенные заявки.

## Важные детали

- **Дедлайн** настраивается в `src/components/Countdown.jsx` (константа `DEADLINE`)
- **Email-адреса** в подвале и контактах меняются в `src/i18n.js` (поищите `info@eap.art`)
- **Партнёры** в футере — `src/components/Footer.jsx`
- **Команда** — в `src/i18n.js`, секция `team`
- **Новый язык** добавляется в `src/i18n.js`: добавьте блок переводов и запись в массив `LANGUAGES`

## Лицензия

Внутренний проект EAP. Не для распространения.
