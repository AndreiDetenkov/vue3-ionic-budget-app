# Capability Map: Local-First Budget Storage & Sync

Карта модулей для перевода приложения с Supabase на Local-First архитектуру с резервным копированием и синхронизацией между устройствами через Firebase Firestore.

| Module id | Responsibility | Depends on | GitHub Issue |
| --- | --- | --- | --- |
| `local-storage` | Персистентное локальное хранилище (`BudgetStorage`), soft-delete (`deletedAt`), `updatedAt`, дефолтные категории (`DEFAULT_CATEGORIES`) | — | [#18](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/issues/18) |
| `backup-and-migration` | Экспорт/импорт JSON-бэкапа, импорт CSV-транзакций, удаление Supabase и переключение `activeStorage`, UI управления бэкапом | `local-storage` | [#20](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/issues/20) |
| `firebase-sync` | Инкрементальный двусторонний Delta-Sync с Firebase Firestore, вход через Google в `BackupModal.vue`, семейный allowlist в `firestore.rules` | `local-storage` | [#22](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/issues/22) |

Build order: `local-storage` → `backup-and-migration` → `firebase-sync`
