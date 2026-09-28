# Budget App — Design System v2

Дизайн-система для приложения на Ionic 8 + Vue 3. Основана на дизайне v2 (`public/design-v2`) и текущем коде.
Визуальная версия с мокапами — в артефакте «Budget App Design System».

- Токены: `src/assets/theme/tokens.css` (префикс `--ds-`)
- Маппинг в Ionic: `src/assets/theme/variables.css` (`--ion-color-*` → `--ds-*`)
- Компоненты: `src/core/components/ui/` (предлагаемая папка)

## 1. Принципы

1. **Сумма — главный герой.** Крупные цифры, `tabular-nums`, пробел как разделитель тысяч (`282 254`), валюта мельче и
   светлее.
2. **Спокойный зелёный.** Бренд-градиент используется только в двух местах: hero-карта суммы и главная кнопка. Всё
   остальное — нейтральные поверхности.
3. **Одна строка — один паттерн.** Транзакция выглядит одинаково на главной, в «Все транзакции» и в отчётах.
4. **Никаких литералов в компонентах.** Только `--ds-*` или `--ion-*` переменные.

## 2. Аудит текущего состояния

**Просмотрено компонентов:** 17 · **Проблем:** 21 · **Оценка:** 58/100

### Покрытие токенами

| Категория   | Определено                  | Захардкожено в `.vue`                                                                                 |
|-------------|-----------------------------|-------------------------------------------------------------------------------------------------------|
| Цвета       | 7 кастомных + палитра Ionic | 5 hex (`#1b4332`, `#3f7a63`, `#8e95a2`, `#2f2f2f`×2) + 4 `rgba()` (градиент продублирован в 2 файлах) |
| Типографика | только `--ion-font-family`  | 16 разных `font-size` (0.6rem … 3.4rem, плюс `14px`); `Roboto` в `BaseHeader`                         |
| Радиусы     | нет                         | 5 значений: `8px`, `0.7rem`, `1rem`, `1.6rem`, `9999px`                                               |
| Отступы     | утилиты Ionic               | смесь `rem`/`px`, магические `translateX(6px)` в ripple                                               |

### Ошибки в теме

| Проблема                                                                            | Где                      | Исправление                                                                                 |
|-------------------------------------------------------------------------------------|--------------------------|---------------------------------------------------------------------------------------------|
| `--ion-color-tertiary-rgb: 0,0,0`, shade `#000`, tint `#1a1a1a` при цвете `#ff9f1c` | `variables.css`          | `255, 159, 28` / `#e08c19` / `#ffa933`                                                      |
| Заголовок страницы в `Roboto`, всё остальное в Manrope                              | `BaseHeader.vue`         | убрать `font-family`, использовать `--ds-type-title-lg-*`                                   |
| `tab="categories"` у кнопки Reports                                                 | `TabsPage.vue`           | `tab="reports"`                                                                             |
| Мятный текст `#d0fde4` на конце градиента `#40916c` — 3.4:1                         | `TotalAmount.vue`        | конец градиента `#2d6a4f` → 5.7:1                                                           |
| Плейсхолдер суммы `#dadddf` на `#f2f4f4` — 1.2:1                                    | `AddTransactionForm.vue` | `--ds-text-placeholder` (4.4:1) или оставить светлым, но добавить подпись «KGS» и автофокус |

### Консистентность экранов

| Экран                        | Статус   | Что не так                                                                                                                                |
|------------------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------|
| Transactions                 | v2 ✅    | «View All» выглядит как фильтр-чип; KGS повторяется в каждой строке                                                                       |
| New transaction              | v2 ✅    | невыбранные плитки выглядят disabled; кнопка «назад» на табе; `0.00`, хотя сумма целая (`parseInt`)                                       |
| Reports                      | v1 ⚠️    | карточка итога в стиле v1 (обводка), шапка серая при белом контенте, фильтры переносятся на 2 строки, категории не отсортированы по сумме |
| Transaction List (модалка)   | смесь ⚠️ | плоские строки вместо карточек, формат даты `28.09.2026 Monday` вместо «Сегодня», «Close» — чип                                           |
| Update transaction (модалка) | v1 ❌    | outline-инпуты и select Material, не похоже на форму добавления                                                                           |

### Полнота компонентов

| Компонент               | Состояния                               | Варианты                     | Доступность                | Оценка |
|-------------------------|-----------------------------------------|------------------------------|----------------------------|--------|
| TransactionListItem     | ⚠️ нет pressed/skeleton                 | ⚠️ карточка задаётся снаружи | ✅                         | 6/10   |
| CategoriesForm (плитки) | ⚠️ нет focus                            | ❌                           | ❌ `div @click`, нет role  | 4/10   |
| TotalAmount             | ❌ нет loading/hidden                   | ❌ дубль в Reports           | ✅                         | 4/10   |
| Кнопка (submit)         | ⚠️ loading есть, disabled не стилизован | ❌ разный стиль в Add/Update | ✅                         | 5/10   |
| Текстовое поле          | ⚠️                                      | ❌ два разных стиля          | ⚠️ label не связан с input | 4/10   |
| Фильтры отчёта          | ✅                                      | ⚠️                           | ⚠️ нет `aria-pressed`      | 6/10   |
| Empty state             | ❌                                      | ❌                           | ✅                         | 2/10   |

## 3. Токены

Полный список — в `tokens.css`. Коротко:

### Цвет (семантика)

| Токен                    | Значение            | Для чего                       |
|--------------------------|---------------------|--------------------------------|
| `--ds-bg-app`            | `#f2f4f4`           | фон всех страниц **и** шапки   |
| `--ds-bg-surface`        | `#ffffff`           | строки, карточки               |
| `--ds-bg-subtle`         | `#edf0ef`           | поля ввода, невыбранные плитки |
| `--ds-bg-selected`       | `#dde7d1`           | выбранная плитка, активный таб |
| `--ds-bg-brand-gradient` | `#1b4332 → #2d6a4f` | hero-карта, главная кнопка     |
| `--ds-text-primary`      | `#2f2f2f`           | основной текст                 |
| `--ds-text-secondary`    | `#5f5f5f`           | категория, дата, валюта        |
| `--ds-text-heading`      | `#325647`           | заголовки страниц и секций     |
| `--ds-text-on-brand`     | `#d0fde4`           | текст на градиенте             |
| `--ds-border-default`    | `#dadbdc`           | обводка строк и плиток         |

### Цвета категорий

Каждой категории — пара `--ds-cat-<icon>-bg` / `--ds-cat-<icon>-fg` (контраст иконки ≥ 6.8:1). Ключ совпадает с
`PredefinedIcon` из `core/utils/icons.ts`, поэтому цвет выбирается автоматически. Цвет категории — только для аватара,
**никогда** для суммы или текста.

### Типографика (Manrope)

| Роль         | Размер / вес                 | Где                                  |
|--------------|------------------------------|--------------------------------------|
| display      | 52 / 800                     | сумма в hero                         |
| amount-input | 48 / 700                     | ввод суммы                           |
| title-lg     | 28 / 800                     | заголовок страницы                   |
| title        | 20 / 700                     | «Recent expenses», «Spend breakdown» |
| body-lg      | 17 / 600                     | название транзакции, сумма в строке  |
| body         | 16 / 500                     | инпуты, кнопки                       |
| label        | 14 / 500                     | подписи плиток, категория в строке   |
| caption      | 12 / 600                     | валюта, даты, подписи табов          |
| overline     | 12 / 600, UPPERCASE, +0.12em | «TODAY», «MONTHLY SPENDING»          |

16 размеров → 9 ролей. Минимальный размер текста — 12px (сейчас подписи табов 9.6px).

### Отступы, радиусы, тени, движение

- Отступы: сетка 4px, `--ds-space-1…10`. Поля страницы — `--ds-gutter` (16), между строками — 8, между секциями — 24.
- Радиусы: `sm 12` (аватар), `md 16` (строка, плитка), `lg 24` (hero, bottom sheet), `pill` (кнопки, чипы, текстовые
  поля).
- Тени: только `--ds-shadow-hero` на hero-карте и главной кнопке. Строки — обводка без тени.
- Движение: `fast 120ms` нажатие, `base 200ms` выбор/раскрытие, `slow 320ms` шторка. Учитывать `prefers-reduced-motion`.

## 4. Компоненты

Предлагаемые имена с префиксом `Ui`, папка `src/core/components/ui/`.

### UiPageHeader (сейчас `BaseHeader`)

Крупный заголовок слева, фон `--ds-bg-app` (без полосы), опционально back / action справа и прогресс-бар.

| Prop       | Тип               | По умолчанию | Описание                             |
|------------|-------------------|--------------|--------------------------------------|
| `title`    | `string`          | —            | заголовок                            |
| `back`     | `string \| false` | `false`      | `default-href` для back-кнопки       |
| `loading`  | `boolean`         | `false`      | тонкий `ion-progress-bar` под шапкой |
| слот `end` | —                 | —            | кнопки справа («Готово», «Закрыть»)  |

### UiMoney

Единый вывод суммы. Форматирование через `formatAmount`, `tabular-nums`.

| Prop       | Тип                                 | По умолчанию | Описание                     |
|------------|-------------------------------------|--------------|------------------------------|
| `value`    | `number`                            | —            | сумма в сомах                |
| `size`     | `'sm' \| 'md' \| 'lg' \| 'display'` | `'md'`       | 14 / 17 / 20 / 52            |
| `currency` | `boolean`                           | `true`       | показывать «KGS»             |
| `hidden`   | `boolean`                           | `false`      | режим приватности: `••• •••` |
| `tone`     | `'default' \| 'on-brand'`           | `'default'`  | цвет                         |

```vue

<script setup lang="ts">
  import { computed } from 'vue';
  import { formatAmount } from '@/core/utils';

  const { value, size = 'md', currency = true, hidden = false, tone = 'default' } = defineProps<{
    value: number;
    size?: 'sm' | 'md' | 'lg' | 'display';
    currency?: boolean;
    hidden?: boolean;
    tone?: 'default' | 'on-brand';
  }>();

  const text = computed(() => (hidden ? '••• •••' : formatAmount(value)));
</script>

<template>
  <span class="money" :class="[`money--${size}`, `money--${tone}`]">
    <span class="money__value">{{ text }}</span>
    <span v-if="currency" class="money__currency">KGS</span>
  </span>
</template>

<style scoped>
  .money {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3em;
    font-variant-numeric: var(--ds-font-numeric);
    color: var(--ds-text-primary);
    white-space: nowrap;
  }

  .money--on-brand {
    color: var(--ds-text-on-brand);
  }

  .money__value {
    font-weight: var(--ds-type-body-lg-weight);
  }

  .money__currency {
    font-size: 0.5em;
    font-weight: var(--ds-type-caption-weight);
    opacity: 0.7;
  }

  .money--sm {
    font-size: var(--ds-type-label-size);
  }

  .money--md {
    font-size: var(--ds-type-body-lg-size);
  }

  .money--lg {
    font-size: var(--ds-type-title-size);
  }

  .money--display {
    font-size: var(--ds-type-display-size);
    line-height: var(--ds-type-display-line);
  }

  .money--display .money__value {
    font-weight: var(--ds-type-display-weight);
  }

  .money--display .money__currency {
    font-size: 0.42em;
  }
</style>
```

### UiCategoryAvatar

Сейчас продублирован в 3 файлах (`TransactionListItem`, `ReportListHeader`, `CategoriesForm`).

| Prop   | Тип                     | По умолчанию | Описание                   |
|--------|-------------------------|--------------|----------------------------|
| `icon` | `string`                | —            | ключ иконки или URL        |
| `size` | `'sm' \| 'md'`          | `'md'`       | 40 / 48                    |
| `tone` | `'category' \| 'brand'` | `'category'` | цвет категории или зелёный |

```vue

<script setup lang="ts">
  import { computed } from 'vue';
  import { getCategoryIconUrl } from '@/core/utils';

  const { icon, size = 'md', tone = 'category' } = defineProps<{
    icon: string;
    size?: 'sm' | 'md';
    tone?: 'category' | 'brand';
  }>();

  const key = computed(() => (icon?.startsWith('http') ? 'other' : icon?.replace('.png', '') || 'other'));
  const style = computed(() => ({
    '--avatar-bg': tone === 'brand' ? 'var(--ds-bg-selected)' : `var(--ds-cat-${key.value}-bg, var(--ds-cat-other-bg))`,
    '--avatar-fg': tone === 'brand' ? 'var(--ds-icon-brand)' : `var(--ds-cat-${key.value}-fg, var(--ds-cat-other-fg))`,
    '--avatar-mask': `url(${getCategoryIconUrl(icon)})`,
  }));
</script>

<template>
  <span class="avatar" :class="`avatar--${size}`" :style="style" aria-hidden="true"><span class="avatar__icon" /></span>
</template>

<style scoped>
  .avatar {
    display: inline-grid;
    place-items: center;
    flex: none;
    border-radius: var(--ds-radius-sm);
    background: var(--avatar-bg);
  }

  .avatar--sm {
    width: var(--ds-avatar-sm);
    height: var(--ds-avatar-sm);
  }

  .avatar--md {
    width: var(--ds-avatar-md);
    height: var(--ds-avatar-md);
  }

  .avatar__icon {
    width: 55%;
    height: 55%;
    background: var(--avatar-fg);
    mask: var(--avatar-mask) center / contain no-repeat;
    -webkit-mask: var(--avatar-mask) center / contain no-repeat;
  }
</style>
```

### UiTransactionRow (сейчас `TransactionListItem` + обёртка в `SlideListItem`)

| Prop          | Тип                    | По умолчанию | Описание                                                        |
|---------------|------------------------|--------------|-----------------------------------------------------------------|
| `transaction` | `Transaction`          | —            | данные                                                          |
| `variant`     | `'card' \| 'flat'`     | `'card'`     | карточка (главная, «Все») или строка внутри аккордеона (отчёты) |
| `meta`        | `'category' \| 'date'` | `'category'` | что во второй строке                                            |
| `swipeable`   | `boolean`              | `false`      | Edit / Remove по свайпу                                         |
| `hidden`      | `boolean`              | `false`      | скрыть сумму                                                    |

| Состояние | Вид                                                                           |
|-----------|-------------------------------------------------------------------------------|
| Default   | `--ds-bg-surface`, обводка `--ds-border-default`, радиус `md`                 |
| Pressed   | фон `--ds-bg-subtle`, `fast`                                                  |
| Swiped    | слева Edit (`--ds-bg-selected` / `--ds-text-brand`), справа Remove (`danger`) |
| Loading   | skeleton: аватар + 2 полосы + сумма (`ion-skeleton-text`)                     |

Валюта в строке не показывается — она уже есть в hero и заголовке секции.

### UiDateDivider

Одинаковый на главной и в модалке. Текст: «Сегодня», «Вчера», дальше «Пт, 25 сентября». Справа — сумма за день
(`UiMoney size="sm" :currency="false"`). Стиль: overline, `--ds-text-secondary`, sticky в длинном списке.

### UiAmountHero (объединяет `TotalAmount` и `ReportTotalAmount`)

| Prop     | Тип                 | Описание                                             |
|----------|---------------------|------------------------------------------------------|
| `label`  | `string`            | «Расходы за месяц»                                   |
| `amount` | `number`            | сумма                                                |
| `period` | `string`            | «Сентябрь 2026» — это кнопка, открывает выбор месяца |
| `delta`  | `number \| null`    | % к прошлому периоду: «+12% к августу»               |
| `hidden` | `boolean` (v-model) | глаз — режим приватности (был в v1)                  |

Фон `--ds-bg-brand-gradient`, радиус `lg`, `--ds-shadow-hero`. Состояния: loading (skeleton в сумме), hidden.

### UiCategoryPicker (сейчас `CategoriesForm`)

Сетка 3 колонки, gap 8. Плитка: аватар категории + подпись `label`.

| Состояние | Вид                                                                                         |
|-----------|---------------------------------------------------------------------------------------------|
| Default   | фон `--ds-bg-surface`, обводка `--ds-border-default`, иконка в цвете категории              |
| Selected  | фон `--ds-bg-selected`, обводка 2px `--ds-green-600`, галочка в углу, `aria-checked="true"` |
| Focus     | outline 2px `--ds-border-focus`                                                             |

Доступность: контейнер `role="radiogroup" aria-label="Категория"`, плитка — `<button role="radio">`, стрелки меняют
выбор. Первыми показывать 6 самых частых категорий пользователя.

### UiTextField / UiAmountInput

- `UiTextField`: pill, высота `--ds-control-height`, фон `--ds-bg-subtle`, label сверху (связан через `id`),
  подсказка/ошибка под полем (`--ds-text-danger`). Используется и в Add, и в Update.
- `UiAmountInput`: `inputmode="numeric"`, автофокус при входе на экран, плейсхолдер `0`, суффикс «KGS», ошибка «Введите
  сумму» инлайн вместо toast.

### UiButton

| Вариант     | Использование                                                                        |
|-------------|--------------------------------------------------------------------------------------|
| `primary`   | одна на экран: «Добавить расход», «Сохранить». Градиент, pill, `--ds-control-height` |
| `secondary` | обводка `--ds-border-strong`, прозрачный фон: «Все», «Отмена»                        |
| `ghost`     | текст `--ds-text-brand`: «Закрыть» в шапке модалки                                   |
| `danger`    | подтверждение удаления                                                               |

Состояния: disabled — `opacity: .45`, градиент заменяется на `--ds-neutral-200`; loading — спиннер + текст остаётся
(«Сохраняем…»). Текст без UPPERCASE.

### UiSegment (фильтры периода)

Вместо 4 чипов в 2 строки — `ion-segment` в одну строку: «Месяц · Прошлый · Год · Прошлый год», либо горизонтально
скроллящиеся чипы. Выбранный — `--ds-bg-surface` + тень `sm` на подложке `--ds-bg-subtle`.

### UiCategoryBreakdown (сейчас `ReportListHeader`)

Строка: аватар `sm`, название, доля `%`, сумма и горизонтальная полоса доли (цвет `--ds-green-600`, трек
`--ds-bg-subtle`, высота 6, радиус pill). Сортировка по убыванию суммы. По тапу раскрываются транзакции
(`UiTransactionRow variant="flat" meta="date"`).

### UiEmptyState

Иконка в круге `--ds-bg-selected`, заголовок `title`, текст `body` `--ds-text-secondary`, primary-кнопка. Пример:
«Расходов пока нет» / «Добавьте первую покупку — она появится здесь» / «Добавить расход».

### Tab bar

Три таба остаются, но «Добавить» — центральная круглая кнопка 56px с градиентом (не таб с back-кнопкой). Подписи —
`caption` 12px, без UPPERCASE. Активный таб — пилюля `--ds-bg-selected`. Экран добавления открывается как modal/sheet
поверх текущего таба и после сохранения закрывается, возвращая пользователя туда, откуда он пришёл.

## 5. Паттерны

- **Добавление расхода:** сумма (автофокус) → категория → описание (опционально, с подсказками из прошлых названий) →
  «Добавить расход». Кнопка неактивна, пока нет суммы и категории; ошибки инлайн. После сохранения — haptic
  (`@capacitor/haptics`) и toast «Расход добавлен».
- **Удаление:** свайп → Remove → строка исчезает, toast «Удалено · Отменить» (5 с) вместо alert.
- **Редактирование:** та же форма, что добавление, в bottom sheet (`breakpoints=[0, 0.9]`), заголовок «Изменить расход»,
  кнопка «Сохранить».
- **Загрузка:** skeleton-строки при первой загрузке, `ion-progress-bar` только при обновлении.
- **Toast:** сверху, 2 с, success/danger через `useToast` — оставить как есть, тексты по-человечески («Не удалось
  сохранить. Проверьте интернет и попробуйте снова»).

## 6. Доработки по продукту (приоритеты)

**P0 — починить консистентность (1–2 дня)**

1. Подключить `tokens.css`, убрать литералы из `.vue`, починить tertiary и Roboto.
2. Перевести Reports на v2: hero-итог, сегмент периода, сортировка по сумме, полосы доли.
3. Модалку Update переделать на форму добавления.
4. Модалку «Все транзакции» — на карточные строки и общий `UiDateDivider`.
5. Плитки категорий: `role="radio"`, выраженное выбранное состояние, цвета категорий.

**P1 — улучшить ежедневное использование**

6. Переключатель месяца в hero (сейчас чип «September 2026» выглядит кнопкой, но не нажимается).
7. Сравнение с прошлым месяцем в hero.
8. Режим приватности (глаз из v1).
9. Центральная кнопка «Добавить» в таб-баре, экран добавления как sheet.
10. Undo вместо alert при удалении; skeleton-загрузка; empty state.
11. Сумма за день в разделителях дат; поиск в «Все транзакции».

**P2 — развитие**

12. Лимиты по категориям (бюджет месяца + прогресс-бар в отчётах).
13. Тёмная тема (черновик токенов уже в `tokens.css`).
14. Подсказки названий по истории («Kulikov», «Globus»).
15. Локализация RU/KY/EN — сейчас интерфейс на английском, даты через dayjs уже поддерживают локали.

## 7. Миграция

1. `tokens.css` подключён в `variables.css`, старые переменные (`--ion-color-bg-light-grey` и др.) оставлены алиасами —
   ничего не ломается.
2. Создать `src/core/components/ui/` с `UiMoney`, `UiCategoryAvatar` — заменить дубли.
3. По одному экрану: Transactions → Add → Reports → модалки. После каждого — `pnpm typecheck && pnpm lint`.
4. Когда в `.vue` не останется ссылок на старые алиасы — удалить их из `variables.css`.
5. Добавить ESLint/stylelint-правило на hex в `<style>` компонентов (например, `stylelint-declaration-strict-value` для
   `color`, `background`, `border-radius`, `font-size`).
