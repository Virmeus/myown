# AdminPanel — Полнофункциональная панель управления

## 🛡️ Архитектура

```
├── server/               # Node.js бэкенд (Express)
│   ├── index.js          # Главный сервер
│   ├── config.js         # Конфигурация
│   ├── database.js       # SQLite база данных
│   ├── middleware/
│   │   └── auth.js       # JWT авторизация + аудит
│   ├── routes/
│   │   ├── auth.js       # Регистрация, вход, сессии
│   │   ├── passwords.js  # Менеджер паролей (AES-256)
│   │   ├── media.js      # Скачивание медиа (Cobalt API)
│   │   ├── cron.js       # Cron задачи (node-cron)
│   │   └── storage.js    # Облачное хранилище (multer)
│   └── services/
│       └── crypto.js     # AES-256-GCM шифрование
├── src/                  # React фронтенд
│   ├── App.tsx           # Главный компонент
│   ├── utils/
│   │   └── api.ts        # API клиент
│   ├── stores/
│   │   └── authStore.ts  # Zustand стор авторизации
│   ├── components/       # UI компоненты
│   └── pages/            # Страницы модулей
└── data/                 # Данные (создаётся автоматически)
    ├── admin.db          # SQLite база
    ├── uploads/          # Загруженные файлы
    └── media/            # Скачанные медиа
```

## 🚀 Запуск в одну команду

### Установка (один раз)
```bash
npm install
```

### Запуск
```bash
node start.js
```

**Всё!** Скрипт автоматически:
1. Соберёт фронтенд (если нужно)
2. Создаст директории для данных
3. Запустит сервер

Откройте **http://localhost:3001** в браузере.

При первом входе создайте учётную запись администратора.

---

### Альтернативные способы запуска

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

---

## 🔧 Разработка

Для разработки с hot-reload фронтенда:

```bash
# Терминал 1: Запуск бэкенда
node server/index.js

# Терминал 2: Запуск фронтенда (Vite dev server)
npm run dev
```

Фронтенд будет доступен на `http://localhost:3000` с автоматическим проксированием API запросов на бэкенд.

### Переменные окружения (опционально)
```bash
PORT=3001                    # Порт сервера
JWT_SECRET=your-secret-key   # Секрет для JWT
ENCRYPTION_KEY=your-key      # Ключ шифрования паролей
NODE_ENV=production          # Режим работы
```

## 🔐 Безопасность

- **JWT токены** с истечением через 24 часа
- **bcrypt** (12 раундов) для хеширования паролей
- **AES-256-GCM** шифрование для хранения паролей
- **Helmet** — security HTTP заголовки
- **Rate Limiting** — 20 попыток входа / 15 мин, 100 API запросов / мин
- **Блокировка аккаунта** после 5 неудачных попыток (15 мин)
- **HttpOnly cookies** для токенов
- **CORS** с whitelist доменов
- **Аудит логирование** всех действий
- **Сессии** с возможностью отзыва

## 📦 Модули

### 1. Менеджер паролей и ключей
- CRUD операции через REST API
- AES-256-GCM шифрование на сервере
- Генерация паролей и API ключей
- Категории и поиск

### 2. Скачивание медиа
- Интеграция с Cobalt API (реальный сервис)
- Поддержка YouTube, Instagram, TikTok, Twitter, и др.
- Выбор качества и типа (видео/аудио)
- Прогресс и статус задач

### 3. Cron задачи
- Реальное выполнение shell команд через `child_process`
- node-cron для планирования
- Валидация cron выражений
- Логи выполнения
- Ручной запуск

### 4. Облачное хранилище
- Загрузка файлов через multer (до 100 МБ)
- Создание папок
- Навигация по директориям
- Скачивание файлов
- Статистика использования

## 🔧 API Endpoints

### Auth
- `POST /api/auth/register` — Регистрация (первый пользователь)
- `POST /api/auth/login` — Вход
- `POST /api/auth/logout` — Выход
- `GET /api/auth/me` — Текущий пользователь
- `GET /api/auth/check` — Проверка необходимости регистрации
- `GET /api/auth/sessions` — Активные сессии

### Passwords
- `GET /api/passwords` — Список паролей
- `POST /api/passwords` — Создать
- `PUT /api/passwords/:id` — Обновить
- `DELETE /api/passwords/:id` — Удалить
- `POST /api/passwords/generate` — Генерация пароля
- `POST /api/passwords/generate-api-key` — Генерация API ключа

### Media
- `POST /api/media/download` — Начать скачивание
- `GET /api/media/tasks` — Список задач
- `GET /api/media/tasks/:id` — Статус задачи
- `DELETE /api/media/tasks/:id` — Удалить задачу
- `GET /api/media/download-file/:id` — Скачать файл

### Cron
- `GET /api/cron/tasks` — Список задач
- `POST /api/cron/tasks` — Создать
- `PUT /api/cron/tasks/:id` — Обновить
- `POST /api/cron/tasks/:id/toggle` — Вкл/Выкл
- `POST /api/cron/tasks/:id/run` — Запустить сейчас
- `DELETE /api/cron/tasks/:id` — Удалить
- `GET /api/cron/tasks/:id/logs` — Логи

### Storage
- `GET /api/storage/files` — Список файлов
- `POST /api/storage/upload` — Загрузить (multipart)
- `POST /api/storage/folder` — Создать папку
- `GET /api/storage/download/:id` — Скачать файл
- `DELETE /api/storage/files/:id` — Удалить
- `GET /api/storage/stats` — Статистика

## 📝 Лицензия

MIT
