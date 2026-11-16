# Capability Map: Local-First Budget Storage & Sync

Карта модулей для перевода приложения с Supabase на Local-First архитектуру с резервным копированием и синхронизацией между устройствами через Firebase Firestore.

| Module id | Responsibility | Depends on | GitHub Issue |
| --- | --- | --- | --- |
| `local-storage` | Персистентное локальное хранилище (`BudgetStorage`), soft-delete (`deletedAt`), `updatedAt`, дефолтные категории (`DEFAULT_CATEGORIES`) | — | [#18](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/issues/18) |
| `backup-and-migration` | Экспорт/импорт JSON-бэкапа, перенос данных из Supabase в локальную БД и переключение `activeStorage`, UI управления бэкапом | `local-storage` | TBD |
| `firebase-sync` | Фоновая двусторонняя синхронизация с Firebase Firestore между двумя Android-телефонами, авто-сессия, `firestore.rules` | `local-storage` | TBD |

Build order: `local-storage` → `backup-and-migration` → `firebase-sync`
