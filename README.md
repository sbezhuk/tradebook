# 📈 TradeBook — Щоденник трейдера (MVP)

Сучасний веб-додаток для ведення щоденника трейдингу з акцентом на аналітику, дисципліну та чітку клієнт-серверну архітектуру з підтримкою майбутніх мобільних додатків (iOS / Android / Flutter / React Native).

---

## 🌟 Ключові можливості

1. **Мульти-активний трейдинг**:
   - Криптовалюти (Crypto), Форекс (Forex), Акції (Stocks), Ф'ючерси (Futures), Сировина (Commodities).
   - Підтримка напрямків **LONG** та **SHORT**, статусів **OPEN** та **CLOSED**.
2. **Автоматичні фінансові метрики**:
   - Автоматичний розрахунок **Net PnL** з урахуванням комісій.
   - **ROI %** (Return on Investment).
   - **R:R (R-Multiple)** на основі виставленого Stop Loss (наприклад, `+2.5R`, `-1.0R`).
   - Живий калькулятор в модальному вікні ще до збереження угоди.
3. **Аналітика та графіки**:
   - Інтерактивна **крива капіталу (Equity Curve)**.
   - Статистика: Win Rate (%), Profit Factor, середній прибуток / збиток, найкращий / найгірший трейд, серія перемог.
   - Розподіл результатів за ринками, напрямком (Long vs Short), днями тижня та сетапами/тегами.
4. **Психологія та дисципліна**:
   - Оцінка слідування торговому плану (1-5 зірок).
   - Фіксація порушень ризик-менеджменту.
   - Нотатки до сетапу та ретроспектива помилок / висновків.
5. **Скріншоти та графіки**:
   - Прикріплення посилань на графіки (TradingView тощо) або пряме завантаження локальних зображень.
6. **Готовність до мобільного клієнта (Mobile-Ready API)**:
   - Стандартні **JWT Bearer** токени.
   - Повна автогенерація **OpenAPI / Swagger** (`/docs` та `/openapi.json`).
   - Будь-який мобільний розробник може згенерувати моделі даних в 1 команду.

---

## 🏗 Архітектура проекту

```
tradebook/
├── backend/                  # FastAPI (Python 3)
│   ├── app/
│   │   ├── api/v1/          # REST ендпоінти (auth, trades, analytics, upload)
│   │   ├── core/            # Конфігурація, безпека (JWT, bcrypt), база даних
│   │   ├── models/          # SQLAlchemy моделі (User, Trade)
│   │   ├── schemas/         # Pydantic v2 схеми валідації
│   │   ├── services/        # Калькулятор PnL/R:R та двигун аналітики
│   │   └── main.py          # Головний файл FastAPI, CORS, роутери
│   ├── seed_demo.py         # Скрипт створення демо-користувача та угод
│   └── requirements.txt
├── frontend/                 # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── api/             # HTTP-клієнт для взаємодії з бекендом
│   │   ├── components/      # UI компоненти (Navbar, StatCards, TradeList, Modals, Charts)
│   │   ├── context/         # AuthContext (JWT стан)
│   │   └── types/           # TypeScript інтерфейси
│   └── vite.config.ts
├── start.sh                 # Скрипт запуску в 1 команду
└── README.md
```

---

## 🚀 Швидкий запуск

### Варіант 1: Запуск скриптом (Рекомендовано)

```bash
chmod +x start.sh
./start.sh
```

Скрипт автоматично:
1. Створить віртуальне середовище Python та встановить залежності.
2. Ініціалізує базу даних SQLite та наповнить її реалістичними тестовими угодами.
3. Встановить пакети фронтенду (якщо ще не встановлені).
4. Запустить бекенд на порту **8000** та фронтенд на порту **5173**.

---

### Варіант 2: Ручний запуск окремо

#### 1. Бекенд:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed_demo.py     # створення демо-даних
uvicorn app.main:app --reload --port 8000
```

#### 2. Фронтенд:
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Доступ та демо-акаунт

- **Веб-додаток**: [http://localhost:5173](http://localhost:5173)
- **Інтерактивна документація API (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **OpenAPI JSON специфікація**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

> **Швидкий вхід**:
> На сторінці авторизації є кнопка **"Демо-режим в 1 клік"**, або використовуйте облікові дані:
> - **Логін**: `trader`
> - **Пароль**: `password123`
>
> Також ви можете будь-коли зареєструвати власний новий акаунт.

---

## 📱 Як підключити майбутній мобільний додаток

API спроектовано за стандартом REST:

1. **Автентифікація**:
   - `POST /api/v1/auth/login` (отримання `access_token`).
   - Наступні запити передають заголовок `Authorization: Bearer <access_token>`.
2. **Генерація клієнтського коду (OpenAPI Generator)**:
   Для Flutter (Dart), Swift (iOS) чи Kotlin (Android):
   ```bash
   npx @openapitools/openapi-generator-cli generate \
     -i http://localhost:8000/openapi.json \
     -g dart-dio \
     -o ./mobile_api_client
   ```
3. **Основні ендпоінти**:
   - `GET /api/v1/trades` — список угод з підтримкою фільтрів за ринком, стороною, статусом, тегами та сортуванням.
   - `POST /api/v1/trades` — збереження нової угоди (автоматичний розрахунок PnL та R-Multiple).
   - `PUT /api/v1/trades/{id}` — оновлення угоди.
   - `DELETE /api/v1/trades/{id}` — видалення угоди.
   - `GET /api/v1/analytics` — повна аналітика, показники та точки графіка Equity Curve.
   - `POST /api/v1/upload/image` — завантаження фото/скріншотів.
