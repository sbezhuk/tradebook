# 📈 TradeBook — Професійний щоденник трейдера

Сучасна веб-платформа для обліку та аналітики трейдингу з підтримкою мульти-акаунтів, інтеграцією біржових імпортів (Hyperliquid DEX з етапом попереднього перегляду), детальним аналізом дисципліни, розрахунком фандингу та капіталу.

Побудована за чіткою клієнт-серверною архітектурою з **Mobile-Ready REST API**, готовою до підключення мобільних додатків (iOS, Android, Flutter, React Native).

---

## 🌟 Ключові можливості

### 1. 💼 Мульти-акаунтність (Multi-Account Management)
- Створення та ведення кількох незалежних торгових рахунків (Hyperliquid, OKX, Binance, Prop-фірми тощо).
- Категоризація за типами: `PERSONAL`, `FUTURES`, `SPOT`, `PROP`, `DEMO`.
- Персоналізація: кастомні кольорові маркери, валюта рахунку, призначення дефолтного акаунта.
- Швидка фільтрація журналу та аналітики за обраним рахунком або консолідований перегляд («Всі рахунки»).

### 2. 💰 Управління капіталом та депозитами (Deposits & Capital Tracking)
- Облік операцій поповнення депозиту та виведення коштів (Withdrawals) з прив'язкою до рахунків.
- Автоматичний розрахунок поточного балансу: `Current Balance = Сукупні депозити + Total Net PnL`.
- Відстеження відсотка приросту капіталу (`Deposit Growth %` / `ROI`).
- Інтерактивна смуга сукупного капіталу (**Overall Capital Strip**) з історією транзакцій балансу.

### 3. ⚡ Імпорт з Hyperliquid з інтерактивним Preview & Duplicate Detection
- Прямий імпорт історії угод (`trade_history.csv`) та історії депозитів/виведень з DEX **Hyperliquid**.
- **Стандартизація торгових пар (`BASE/QUOTE`)**: автоматичне приведення символів до єдиного формату (наприклад, `BTC` → `BTC/USDT`, `NVDA (IO)` → `NVDA/USDT (IO)`) як при ручному створенні угоди, так і під час CSV-імпорту.
- **Етап інтерактивного попереднього перегляду (Preview Modal)**:
  - Можливість редагувати будь-які параметри перед записом у базу (ціна, об'єм, PnL, комісії, час, теги).
  - Гнучкий вибір записів за допомогою чекбоксів (можливість імпортувати лише обрані трейди).
  - **Розумне виявлення дублікатів (Duplicate Detection)**: автоматичний аналіз і позначення бейджами угод, які вже існують у системі, для запобігання повторному внесенню.
- Автоматична агрегація часткових виконань (fills) у цілісні позиції з коректним середньозваженим ціновим розрахунком.

### 4. 📊 Мульти-активний трейдинг та фандинг (Funding)
- Підтримка ринків: **Криптовалюти** (Crypto), **Форекс** (Forex), **Акції** (Stocks), **Ф'ючерси** (Futures), **Сировина / Інше**.
- Напрямки: **LONG** та **SHORT**.
- Статуси: **OPEN** (відкриті позиції з можливістю супроводу та подальшого закриття), **CLOSED**, **CANCELLED**.
- **Врахування фінансування (Funding Fee)** безпосередньо в угодах:
  $$\text{Net PnL} = \text{Gross PnL} - \text{Комісії} + \text{Funding}$$
- Роздільне відображення торгового прибутку (`Trade PnL`) та виплат фандингу (`Funding PnL`) в аналітиці.

### 5. 🧮 Автоматичні фінансові метрики та живий калькулятор
- Автоматичний розрахунок **Net PnL**, **ROI %** та **R:R (R-Multiple)** на основі Stop Loss.
- Динамічний калькулятор прямо у модальному вікні угоди під час введення ціни входу, виходу, стоп-лосу, комісій та фандингу ще до збереження.

### 6. 📅 Календар PnL та Daily Heatmap
- Інтерактивний календар торгових днів місяця.
- Візуальний тепловий індикатор прибутку/збитку (Heatmap).
- Детальна щоденна статистика в один клік: PnL дня, кількість угод, Win Rate, Profit Factor, торговий об'єм, комісії та список трейдів.

### 7. 📈 Аналітика та Bento Grid Insights
- Ключові KPI: **Win Rate (%)**, **Profit Factor**, середній прибуток / збиток, найкращий / найгірший трейд, максимальні серії перемог та поразок.
- Інтерактивна **крива капіталу (Equity Curve)** з кумулятивним PnL.
- Зрізи ефективності за ринками, торговими парами (символами), напрямками (Long vs Short), сетапами/тегами та днями тижня.
- **Місячні звітні періоди**: швидке перемикання між місяцями або режимом «За весь час».

### 8. 🧠 Психологія трейдингу та дисципліна
- Оцінка слідування торговому плану (1–5 зірок).
- Фіксація порушень ризик-менеджменту та правил системи.
- Розрахунок відсотка дисципліни (`rule_discipline_rate`).
- Нотатки до сетапу (Setup Notes) та ретроспектива помилок / висновків (Post-trade Notes).
- Прикріплення посилань на TradingView або локальне завантаження скріншотів графіків.

### 9. 📑 Журнал угод, пагінація та експорт
- Гнучкий фільтр (пошук за символом, ринком, стороною, статусом, тегами, рахунком).
- Серверна пагінація з вибором кількості рядків (10, 20, 50, 100) та збереженням у LocalStorage.
- Експорт відфільтрованих або всіх угод у **CSV**.

### 10. 🎨 Сучасний UI: Темна / Світла теми та мобільна адаптивність
- Стильний інтерфейс у стилі Glassmorphism з підтримкою **Dark** та **Light** тем.
- Складана бічна панель (Collapsible Sidebar) зі збереженням стану.
- Повна адаптивність під мобільні екрани (адаптивні модальні вікна, скрол, мобільне меню).
- Сувора робота з часовими поясами (**ISO 8601 UTC**) без локального зсуву дат.

### 11. 🔐 Безпека та Email OTP-верифікація (2FA)
- Підтвердження реєстрації та входу за допомогою **6-значного OTP-коду**, що надсилається на пошту через **Gmail SMTP**.
- Захист від перебору та спаму: термін дії коду (`OTP_EXPIRE_MINUTES`), обмеження кількості спроб (`OTP_MAX_ATTEMPTS`) та таймер повторного надсилання (`OTP_RESEND_COOLDOWN_SECONDS`).
- Можливість швидкого обходу OTP для демо-акаунта (`OTP_DEMO_BYPASS=true`).

---

## 🏗 Архітектура проекту

```
tradebook/
├── backend/                       # Бекенд на FastAPI (Python 3.10+)
│   ├── app/
│   │   ├── api/v1/                # REST ендпоінти API
│   │   │   ├── accounts.py        # Управління торговими рахунками
│   │   │   ├── analytics.py       # Аналітика, крива еквайті, щоденна активність
│   │   │   ├── auth.py            # Автентифікація, реєстрація, Email OTP, профіль (JWT)
│   │   │   ├── deposits.py        # Депозити, виведення та імпорт балансів
│   │   │   ├── trades.py          # CRUD угод, фільтри, імпорт Hyperliquid з Preview
│   │   │   └── upload.py          # Завантаження скріншотів графіків
│   │   ├── core/                  # Базові модулі: конфігурація (.env), безпека (JWT, bcrypt), DB
│   │   ├── models/                # SQLAlchemy моделі (User, TradingAccount, Trade, Deposit, OTPCode)
│   │   ├── schemas/               # Pydantic v2 моделі валідації та серіалізації
│   │   ├── services/              # Бізнес-логіка (калькулятор PnL, аналітика, імпортер, OTP email, символи)
│   │   └── main.py                # Точка входу FastAPI, CORS, роутери, роздача статики
│   ├── uploads/                   # Директорія для завантажених зображень
│   ├── .env.example               # Шаблон змінних оточення (DB, JWT, Gmail SMTP / OTP)
│   ├── test_api.py                # Набір pytest тестів основного API (17 сценаріїв)
│   ├── test_otp.py                # Набір pytest тестів Email OTP верифікації (6 сценаріїв)
│   ├── seed_demo.py               # Скрипт ініціалізації демо-користувача та угод
│   └── requirements.txt           # Залежності Python
│
├── frontend/                      # Фронтенд на React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── api/                   # HTTP-клієнт для взаємодії з бекендом
│   │   ├── components/            # UI компоненти:
│   │   │   ├── AccountModal.tsx   # Управління торговими рахунками
│   │   │   ├── AuthView.tsx       # Вхід, реєстрація та 6-значна OTP-верифікація
│   │   │   ├── DepositModal.tsx   # Додавання депозитів та зняття коштів
│   │   │   ├── GlassDateTimePicker.tsx # Кастомний вибір дати й часу
│   │   │   ├── GlassSelect.tsx    # Кастомні скляні селекти
│   │   │   ├── ImportView.tsx     # Імпорт Hyperliquid (Trades & Deposits)
│   │   │   ├── ImportEditModal.tsx# Редагування записів перед імпортом
│   │   │   ├── InsightsBento.tsx  # Bento Grid аналітика та KPI
│   │   │   ├── OverviewView.tsx   # Головний огляд та статистика
│   │   │   ├── PaginationBar.tsx  # Панель пагінації журналу угод
│   │   │   ├── PnlCalendarView.tsx# Календар прибутковості (Heatmap)
│   │   │   ├── PsychologyView.tsx # Аналіз психології та дисципліни
│   │   │   ├── TradeList.tsx      # Журнал угод із фільтрами та пагінацією
│   │   │   ├── TradeModal.tsx     # Створення/редагування угоди з калькулятором
│   │   │   ├── TradeDetailModal.tsx # Детальний перегляд угоди
│   │   │   ├── OverallCapitalStrip.tsx # Смуга сукупного капіталу
│   │   │   ├── TopBar.tsx         # Верхня панель (тема, місяці, пошук)
│   │   │   └── Sidebar.tsx        # Навігаційна панель із вибором рахунку
│   │   ├── context/               # AuthContext (авторизація), ThemeContext (Dark/Light)
│   │   ├── types/                 # TypeScript типи та інтерфейси
│   │   └── utils/                 # Утиліти дат (UTC), стандартизації символів та експорту в CSV
│   └── package.json
│
├── start.sh                       # Скрипт швидкого запуску обох частин
└── README.md
```

---

## 🛠 Технологічний стек

- **Бекенд**: Python 3.10+, [FastAPI](https://fastapi.tiangolo.com/), [SQLAlchemy 2.0](https://www.sqlalchemy.org/), [Pydantic v2](https://docs.pydantic.dev/), PostgreSQL (через `psycopg2-binary`) або SQLite, `PyJWT`, `bcrypt`, `uvicorn`, `pytest`.
- **Фронтенд**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), [Recharts](https://recharts.org/).

---

## 🚀 Швидкий запуск

### Варіант 1: Запуск скриптом в 1 команду (Рекомендовано)

```bash
chmod +x start.sh
./start.sh
```

**Скрипт автоматично виконує:**
1. Перевірку та запуск служби PostgreSQL (якщо встановлено локально через Homebrew).
2. Створення віртуального оточення Python (`backend/venv`) та встановлення залежностей.
3. Ініціалізацію схеми бази даних та заповнення демо-даними (`seed_demo.py`).
4. Встановлення пакетів фронтенду (`npm install`, якщо `node_modules` відсутній).
5. Паралельний запуск бекенду (`0.0.0.0:8000`) та фронтенду (`0.0.0.0:5173`).

---

### Варіант 2: Ручний запуск компонентів

#### 1. Бекенд:
```bash
cd backend

# Створення та активація venv
python3 -m venv venv
source venv/bin/activate

# Встановлення залежностей
pip install -r requirements.txt

# Наповнення демо-даними (за потреби)
python seed_demo.py

# Запуск сервера API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Фронтенд:
```bash
cd frontend

# Встановлення залежностей
npm install

# Запуск dev-сервера
npm run dev
```

---

## 🧪 Тестування та перевірка якості

### Запуск тестів бекенду (pytest):
```bash
backend/venv/bin/pytest backend/test_api.py backend/test_otp.py -v
```
> Покриває 23 автоматизовані тести:
> - **`test_api.py` (17 тестів)**: реєстрація та вхід, життєвий цикл угод, розрахунок Net PnL та фандингу, ізоляція мульти-акаунтів, імпорт з Hyperliquid та робота Preview/Commit етапу, перевірка дублікатів, стандартизація торгових пар (`BASE/QUOTE`), депозити, пагінація, звітні періоди, календар PnL та UTC-серіалізація.
> - **`test_otp.py` (6 тестів)**: OTP-потік реєстрації та входу, rate-limiting повторного надсилання, прострочені коди, перевищення ліміту спроб, обхід OTP для демо-акаунта.

### Перевірка збірки фронтенду:
```bash
cd frontend
npm run build
npm run lint
```

---

## 🔑 Доступ та демо-акаунт

- **Веб-додаток**: [http://localhost:5173](http://localhost:5173)
- **Інтерактивна документація API (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Альтернативна документація (ReDoc)**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI JSON специфікація**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

> **Швидкий вхід**:
> На сторінці входу доступна кнопка **«Демо-режим в 1 клік»**, або використовуйте облікові дані:
> - **Логін / Email**: `trader` або `trader@example.com`
> - **Пароль**: `password123`
>
> Також можна створити власний новий акаунт через форму реєстрації.

---

## ⚙️ Налаштування оточення (.env)

За замовчуванням бекенд готовий до роботи з локальним PostgreSQL або SQLite. Для налаштування бази даних, JWT та Gmail SMTP (для надсилання 6-значних OTP-кодів) скопіюйте шаблон `backend/.env.example` у `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Основні змінні у `backend/.env`:

```env
PROJECT_NAME="TradeBook API"
SECRET_KEY="your-super-secret-jwt-key"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# PostgreSQL (за замовчуванням):
DATABASE_URL="postgresql+psycopg2://localhost:5432/tradebook"

# Або SQLite для спрощеного локального запуску:
# DATABASE_URL="sqlite:///./tradebook.db"

# Gmail SMTP & OTP верифікація
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=TradeBook
SMTP_TLS=true
OTP_REQUIRED=true
OTP_EXPIRE_MINUTES=10
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5
OTP_DEMO_BYPASS=true
```

---

## 📱 Mobile-Ready API та підключення клієнтів

API TradeBook спроектовано за принципами RESTful API з повною сумісністю з мобільними платформами (iOS / Swift, Android / Kotlin, Flutter / Dart, React Native):

1. **Автентифікація**:
   - `POST /api/v1/auth/login` — повертає `access_token` або (`otp_required: true` + `temp_token` для подальшого підтвердження через `/login/verify-otp`).
   - Подальші запити використовують стандартний HTTP-заголовок `Authorization: Bearer <access_token>`.

2. **Основні ендпоінти API**:
   - **Автентифікація**:
     - `POST /api/v1/auth/register/send-otp` — валідація даних та надсилання 6-значного OTP-коду на email
     - `POST /api/v1/auth/register` — реєстрація нового користувача (з перевіркою OTP-коду)
     - `POST /api/v1/auth/login` — авторизація (отримання JWT або `temp_token` для OTP)
     - `POST /api/v1/auth/login/verify-otp` — завершення входу після перевірки 6-значного OTP-коду
     - `POST /api/v1/auth/resend-otp` — повторне надсилання OTP-коду з урахуванням cooldown
     - `GET /api/v1/auth/me` — дані поточного користувача
   - **Торгові акаунти**:
     - `GET /api/v1/accounts` — список акаунтів користувача
     - `POST /api/v1/accounts` — створення нового рахунку
     - `PUT /api/v1/accounts/{id}` — оновлення налаштувань рахунку
     - `DELETE /api/v1/accounts/{id}` — видалення рахунку
   - **Угоди (Trades)**:
     - `GET /api/v1/trades` — список угод (пагінація, фільтри за ринком, символом, статусом, стороною, тегами, акаунтом, звітним місяцем)
     - `POST /api/v1/trades` — створення угоди (авторозрахунок PnL, ROI %, R-Multiple)
     - `GET /api/v1/trades/{id}` — деталі угоди
     - `PUT /api/v1/trades/{id}` — оновлення/закриття угоди
     - `DELETE /api/v1/trades/{id}` — видалення окремої угоди
     - `DELETE /api/v1/trades` — масове очищення угод користувача
     - `GET /api/v1/trades/tags/all` — список усіх використаних тегів
     - `POST /api/v1/trades/import/hyperliquid/preview` — попередній перегляд імпорту угод із виявленням дублікатів
     - `POST /api/v1/trades/import/commit` — збереження відредагованих угод із Preview
     - `POST /api/v1/trades/import/hyperliquid` — прямий імпорт CSV
   - **Депозити та баланс**:
     - `GET /api/v1/deposits` — історія поповнень та зняттів
     - `POST /api/v1/deposits` — внесення депозиту
     - `POST /api/v1/deposits/withdraw` — виведення коштів
     - `POST /api/v1/deposits/import/hyperliquid/preview` — попередній перегляд імпорту депозитів
     - `POST /api/v1/deposits/import/commit` — фіксація імпорту депозитів
     - `DELETE /api/v1/deposits/{id}` — видалення запису депозиту
   - **Аналітика**:
     - `GET /api/v1/analytics` — комплексна статистика, баланс, приріст депозиту, точки кривої еквайті, розподіли та щоденна активність
   - **Медіа**:
     - `POST /api/v1/upload/image` — завантаження зображень/скріншотів

3. **Генерація клієнтського SDK за 1 команду**:
   Завдяки автогенерації схеми OpenAPI, клієнтський код для будь-якої мови генерується миттєво:

   ```bash
   # Для Flutter (Dart):
   npx @openapitools/openapi-generator-cli generate \
     -i http://localhost:8000/openapi.json \
     -g dart-dio \
     -o ./mobile_client_dart

   # Для Swift (iOS):
   npx @openapitools/openapi-generator-cli generate \
     -i http://localhost:8000/openapi.json \
     -g swift5 \
     -o ./mobile_client_swift

   # Для Kotlin (Android):
   npx @openapitools/openapi-generator-cli generate \
     -i http://localhost:8000/openapi.json \
     -g kotlin \
     -o ./mobile_client_kotlin
   ```

---

## 📄 Ліцензія

Розроблено для трейдерів, які цінують аналітику, системність та дисципліну. Усі права захищено.
