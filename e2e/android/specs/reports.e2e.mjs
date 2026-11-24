import assert from 'node:assert/strict';
import { buildValidBackupFixture } from '../lib/fixtures.mjs';
import { computeExpectedReports, formatAmount } from '../lib/helpers.mjs';

export const name = 'Category Report & Date Range filters + accordion drill-down';

export async function run(ctx) {
  const { device } = ctx;
  const deviceClock = device.getDeviceDate();
  const seedSnapshot = buildValidBackupFixture({
    now: deviceClock.date,
    tzOffsetMinutes: deviceClock.tzOffsetMinutes,
  });

  const cdp = await ctx.seedSnapshot(seedSnapshot);
  const storage = await cdp.readStorageState();
  const expected = computeExpectedReports(
    storage.snapshot.transactions,
    deviceClock.date,
    storage.snapshot.categories,
    deviceClock.tzOffsetMinutes,
  );

  await cdp.click('[data-testid="tab-reports"]');
  await cdp.waitForText('ion-title', 'Reports');

  const filters = [
    { label: 'Current month', key: 'currentMonth' },
    { label: 'Last month', key: 'lastMonth' },
    { label: 'Current year', key: 'currentYear' },
    { label: 'Last year', key: 'lastYear' },
  ];

  for (const filter of filters) {
    const expectedPeriod = expected[filter.key];
    await cdp.click(`[data-testid="report-filter-${filter.key}"]`);

    await cdp.waitFor(
      `(() => {
        const page = document.querySelector('ion-tabs ion-router-outlet > .ion-page:not(.ion-page-hidden)');
        if (!page || page.querySelector('ion-progress-bar')) return false;
        const amt = page.querySelector('[data-testid="reports-total-amount"]');
        return amt && (amt.textContent ?? '').trim() === ${JSON.stringify(expectedPeriod.totalAmount)};
      })()`,
      { timeoutMs: 10000, label: `Reports total for ${filter.label} === ${expectedPeriod.totalAmount}` },
    );

    const renderedGroups = await cdp.eval(`
      Array.from(document.querySelectorAll('ion-tabs ion-router-outlet > .ion-page:not(.ion-page-hidden) ion-accordion')).map((acc) => ({
        name: (acc.querySelector('ion-item[slot="header"] .title')?.textContent ?? '').trim(),
        amount: (acc.querySelector('ion-item[slot="header"] .amount')?.textContent ?? '').replace(/\\s+/g, ' ').trim(),
      }))
    `);
    assert.deepEqual(
      renderedGroups,
      expectedPeriod.reports.map((r) => ({ name: r.name, amount: `${r.formattedValue} KGS` })),
      `Mismatch in category breakdown for ${filter.label}`,
    );

    if (expectedPeriod.reports.length > 0) {
      const firstReport = expectedPeriod.reports[0];
      const escapedId = `report-accordion-${firstReport.name.toLowerCase()}`.replace(/(["\\])/g, '\\$1');
      const accordionSel = `[data-testid="${escapedId}"]`;
      const isExpanded = await cdp.eval(
        `Boolean(document.querySelector(${JSON.stringify(accordionSel)})?.classList.contains('accordion-expanded'))`,
      );
      if (!isExpanded) {
        await cdp.click(`${accordionSel} ion-item[slot="header"]`);
      }
      await cdp.waitFor(
        `Boolean(document.querySelector(${JSON.stringify(`${accordionSel}.accordion-expanded div[slot="content"]`)}))`,
        { label: `accordion expansion for ${filter.label}` },
      );
      const renderedItems = await cdp.eval(`
        Array.from(document.querySelectorAll(${JSON.stringify(`${accordionSel} div[slot="content"] ion-item`)})).map((item) => ({
          name: (item.querySelector('.title')?.textContent ?? '').trim(),
          amount: (item.querySelector('.amount')?.textContent ?? '').trim(),
        }))
      `);
      for (const tx of firstReport.transactions) {
        assert.ok(
          renderedItems.some((item) => item.name === tx.name && item.amount === formatAmount(tx.value)),
          `Expected expanded report for "${filter.label}" to include "${tx.name}" (${formatAmount(tx.value)})`,
        );
      }
    }
  }
}
