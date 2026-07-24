# Browser layout audit — довідник 0.6.0-validation

Перевірено всі 22 розвороти (44 сторінки) у headless Chromium.

| Viewport | Layout | Рівні вміщення | Сторінок із переповненням |
|---|---|---|---:|
| 1920×1080 | two-page-spread | normal 39, compact 3, dense 1, tight 1 | 0 |
| 1456×768 | two-page-spread | normal 31, compact 5, dense 5, tight 3 | 0 |
| 1366×768 | two-page-spread | normal 28, compact 8, dense 5, tight 3 | 0 |

Додатково перевірено:

- нижня панель лишається поза 3D-контейнером сторінок;
- двосторінковий режим не показує внутрішні повзунки;
- сторінки `voting` і `session-recovery` переходять у компактний `tight`-макет без обрізання;
- великий текст зберігає односторінковий scroll-fallback;
- книга займає доступну висоту viewport без виходу за межі екрана.
