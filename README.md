# Прибой v2 — Парковка и аренда авто на юге России

**Колёса к морю.** React + Vite + Supabase SPA для бронирования аренды авто с опцией хранения своего автомобиля.

- Production: https://priboy-six.vercel.app
- Repo: https://github.com/Belix32/priboy

## Структура

```
priboy/
├── src/
│   ├── pages/Travel/       # Клиент: поиск, бронь, профиль, гайд
│   ├── pages/Admin/        # Админ-панель
│   ├── pages/Partner/      # Кабинет партнёра + проверка QR
│   ├── lib/travel/         # API, промокоды, настройки, профиль
│   └── hooks/              # useBookings, useCars, useDestinations
├── api/payments/           # Vercel serverless: ЮKassa create + webhook
└── supabase/
    ├── DEPLOY_ALL.sql      # Полный деплой схемы
    └── migrations/         # 001–005 по порядку
```

## Запуск

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
```

Без Supabase env — demo-режим (localStorage + mock auth).

## Supabase

1. Выполните [`supabase/DEPLOY_ALL.sql`](supabase/DEPLOY_ALL.sql) в SQL Editor (включает миграции 001–005).
2. В Auth: Email provider ON, sign-up ON.
3. Env на Vercel: `VITE_SUPABASE_*`, `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Основные flow

| Flow | Описание |
|------|----------|
| Бронирование | Search → Booking → Confirm → Success (pending до партнёра/оплаты) |
| QR | Доступен после status `confirmed` или `active` |
| Промокоды | Поле на странице бронирования + admin CRUD |
| Оплата | ЮKassa через `/api/payments/create` + webhook |
| Хранение авто | Add-on при аренде (не отдельный продукт) |

## Тесты

```bash
npm test
```

## API modules

- `api.ts` — core CRUD (dual-mode Supabase/localStorage)
- `promos.ts` — validatePromoCode, скидки
- `settings.ts` — app_settings в Supabase
- `profileApi.ts` — профиль + авто пользователя
- `payments.ts` — клиентский вызов ЮKassa
