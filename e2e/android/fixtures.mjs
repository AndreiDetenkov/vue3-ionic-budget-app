import { resolveClockContext } from './helpers.mjs';

export const VALID_BACKUP_FILE = 'e2e-ok.json';
export const INVALID_BACKUP_FILE = 'e2e-bad.json';
export const OVERSIZED_BACKUP_FILE = 'e2e-big.json';

export const INVALID_BACKUP_CONTENT = '{"version": 1, broken json';

const DEFAULT_SEED_EPOCH = '1970-01-01T00:00:00.000Z';

export const E2E_DEFAULT_CATEGORIES = [
  { id: '00d3eae0-19bf-456c-bddd-5fff0808fb92', title: 'Beauty', icon: 'beauty' },
  { id: 'ad2ad977-e4d6-48e8-aa79-bb6731bdfb2a', title: 'Clothes', icon: 'clothes' },
  { id: '387cb641-52b2-4d5e-bd3d-ec815783b52b', title: 'Education', icon: 'education' },
  { id: '47e0bee5-f0f6-434c-9a0d-1abe86a88f12', title: 'Entertainment', icon: 'entertainment' },
  { id: '3c3d9f8c-af23-49ed-946c-0d72a2191008', title: 'Food', icon: 'food' },
  { id: '5cb289ab-2f7b-43bf-be3e-a4b577688333', title: 'Healthcare', icon: 'health' },
  { id: 'f4ac3532-3870-4f85-a9d8-4dc1e24a4d97', title: 'Housing', icon: 'housing' },
  { id: '809a30d0-9fed-46a6-8ec7-a33124c38408', title: 'Other', icon: 'other' },
  { id: '949f5cae-b3c3-4c81-838b-13e05e4e12a4', title: 'Pets', icon: 'pets' },
  { id: '4c8c402c-0f70-4f76-8d71-2c20766e07fa', title: 'Recreation', icon: 'recreation' },
  { id: 'ad2e98ae-ec47-4786-b08e-9212baac0b3b', title: 'Shopping', icon: 'shopping' },
  { id: 'dfc7eaa0-5d0c-44b9-b6c8-156ebb85d28f', title: 'Sport', icon: 'sport' },
  { id: '2fe6596b-6292-4d8c-826d-5f4d3d99f543', title: 'Transportation', icon: 'transportation' },
  { id: 'c8443dec-7b23-412f-8fa4-04d447d18931', title: 'Utilities', icon: 'utilities' },
];

export const CATEGORY_ID_FOOD = '3c3d9f8c-af23-49ed-946c-0d72a2191008';
const CATEGORY_ID_HOUSING = 'f4ac3532-3870-4f85-a9d8-4dc1e24a4d97';
const CATEGORY_ID_TRANSPORTATION = '2fe6596b-6292-4d8c-826d-5f4d3d99f543';

export function buildValidBackupFixture({
  now = new Date(),
  tzOffsetMinutes,
  existingTxToOverwrite,
  existingTxToKeepOlder,
} = {}) {
  const clock = resolveClockContext(now, tzOffsetMinutes);
  const startOfTodayMs = clock.toUtcMs(clock.year, clock.month, clock.day, 0, 5, 0);
  const todayTxDate = new Date(Math.max(startOfTodayMs, clock.date.getTime() - 60_000));
  const lastMonthDate = new Date(clock.toUtcMs(clock.year, clock.month - 1, 15, 12, 0, 0));
  const lastYearDate = new Date(clock.toUtcMs(clock.year - 1, 5, 15, 12, 0, 0));

  const transactions = [
    {
      id: 'e2e-tx-imported-today',
      name: 'E2E Imported Today',
      value: 3500,
      createdAt: todayTxDate.toISOString(),
      updatedAt: todayTxDate.toISOString(),
      deletedAt: null,
      categoryId: CATEGORY_ID_FOOD,
    },
    {
      id: 'e2e-tx-last-month',
      name: 'E2E Last Month Rent',
      value: 12000,
      createdAt: lastMonthDate.toISOString(),
      updatedAt: lastMonthDate.toISOString(),
      deletedAt: null,
      categoryId: CATEGORY_ID_HOUSING,
    },
    {
      id: 'e2e-tx-last-year',
      name: 'E2E Last Year Flight',
      value: 45000,
      createdAt: lastYearDate.toISOString(),
      updatedAt: lastYearDate.toISOString(),
      deletedAt: null,
      categoryId: CATEGORY_ID_TRANSPORTATION,
    },
  ];

  if (existingTxToOverwrite) {
    const newerUpdatedAt = new Date(Date.parse(existingTxToOverwrite.updatedAt) + 60_000).toISOString();
    transactions.push({
      id: existingTxToOverwrite.id,
      name: 'E2E Persist LWW Updated',
      value: 1800,
      createdAt: existingTxToOverwrite.createdAt,
      updatedAt: newerUpdatedAt,
      deletedAt: null,
      categoryId: existingTxToOverwrite.categoryId,
    });
  }

  if (existingTxToKeepOlder) {
    const olderUpdatedAt = new Date(Date.parse(existingTxToKeepOlder.updatedAt) - 60_000).toISOString();
    transactions.push({
      id: existingTxToKeepOlder.id,
      name: 'E2E Stale Ignored',
      value: 99999,
      createdAt: existingTxToKeepOlder.createdAt,
      updatedAt: olderUpdatedAt,
      deletedAt: null,
      categoryId: existingTxToKeepOlder.categoryId,
    });
  }

  return {
    version: 1,
    updatedAt: now.toISOString(),
    categories: E2E_DEFAULT_CATEGORIES.map((category) => ({
      ...category,
      updatedAt: DEFAULT_SEED_EPOCH,
      deletedAt: null,
    })),
    transactions,
  };
}
