# Публікація гри «СХОВИЩЕ» на Render

## 1. Завантаження на GitHub

1. Створіть новий репозиторій на GitHub.
2. Розпакуйте цей архів.
3. Завантажте до репозиторію **вміст цієї папки**, щоб `server.js`, `package.json` і `render.yaml` лежали в корені репозиторію.
4. Не завантажуйте локальні файли `data/*.json`, якщо вони з’являться після запуску гри.

## 2. Розгортання на Render через Blueprint

1. Увійдіть у Render через GitHub.
2. Натисніть **New → Blueprint**.
3. Виберіть створений репозиторій.
4. Render знайде `render.yaml`.
5. Натисніть **Apply / Deploy Blueprint**.
6. Після успішного запуску відкрийте адресу виду:
   `https://skhovyshche-online-xxxx.onrender.com`

## Ручне налаштування, якщо Blueprint не використовується

- Service type: `Web Service`
- Runtime: `Node`
- Build command: `npm install --omit=dev`
- Start command: `npm start`
- Health check path: `/api/health`
- Instance type: `Free`

## Важливо

- `start_server.bat`, `start_persistent_server.bat` і `start_internet.bat` на Render не запускаються.
- Сервер сам використовує порт, який Render передає через змінну `PORT`.
- Під час активної партії клієнти регулярно звертаються до сервера, тому він отримує трафік.
- На безкоштовному Render локальні JSON-файли можуть зникнути після сну, перезапуску або нового розгортання. Тому кімнати, локальні профілі, кампанії та авторські набори не варто вважати постійно збереженими.
