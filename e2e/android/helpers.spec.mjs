import { describe, expect, it } from 'vitest';
import { DEFAULT_CATEGORIES, parseBackupSnapshot } from '@/core/storage';
import {
  auditLogcat,
  computeExpectedReports,
  cssPointToScreen,
  findUiNode,
  isNodeEffectivelyEnabled,
  parseUiHierarchy,
} from './helpers.mjs';
import { buildValidBackupFixture, E2E_DEFAULT_CATEGORIES } from './fixtures.mjs';

describe('android e2e helpers', () => {
  describe('parseUiHierarchy and isNodeEffectivelyEnabled', () => {
    const sampleXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<hierarchy rotation="0">
  <node index="0" text="" class="android.widget.FrameLayout" package="com.google.android.documentsui" enabled="true" clickable="false" bounds="[0,0][1080,2424]">
    <node index="0" text="" class="android.widget.LinearLayout" package="com.google.android.documentsui" enabled="true" clickable="true" bounds="[40,300][520,520]">
      <node index="0" text="e2e-ok.json" resource-id="android:id/title" class="android.widget.TextView" package="com.google.android.documentsui" enabled="true" clickable="false" bounds="[80,340][480,410]" />
    </node>
    <node index="1" text="" class="android.widget.LinearLayout" package="com.google.android.documentsui" enabled="false" clickable="false" bounds="[560,300][1040,520]">
      <node index="0" text="locked &amp; greyed &quot;backup&quot;.json" resource-id="android:id/title" class="android.widget.TextView" package="com.google.android.documentsui" enabled="true" clickable="false" bounds="[600,340][1000,410]" />
    </node>
  </node>
</hierarchy>`;

    it('parses bounds, parent indices, XML entities, and ancestor enabled state', () => {
      const nodes = parseUiHierarchy(sampleXml);

      const enabledNode = findUiNode(nodes, (n) => n.text === 'e2e-ok.json');
      expect(enabledNode).not.toBeNull();
      expect(enabledNode?.bounds).toEqual({
        left: 80,
        top: 340,
        right: 480,
        bottom: 410,
        width: 400,
        height: 70,
        cx: 280,
        cy: 375,
      });
      expect(isNodeEffectivelyEnabled(nodes, enabledNode)).toBe(true);

      const greyedNode = findUiNode(nodes, (n) => n.text === 'locked & greyed "backup".json');
      expect(greyedNode).not.toBeNull();
      expect(isNodeEffectivelyEnabled(nodes, greyedNode)).toBe(false);
    });
  });

  describe('cssPointToScreen', () => {
    it('maps CSS viewport coordinates into scaled WebView screen pixels with status bar offset', () => {
      const screenBounds = cssPointToScreen(
        { left: 20, top: 100, right: 320, bottom: 160 },
        { width: 400, height: 800 },
        { left: 0, top: 120, right: 1200, bottom: 2520, width: 1200, height: 2400 },
      );

      expect(screenBounds).toEqual({
        left: 60,
        top: 420,
        right: 960,
        bottom: 600,
        width: 900,
        height: 180,
        cx: 510,
        cy: 510,
      });
    });
  });

  describe('computeExpectedReports', () => {
    it('groups active transactions by category across all 4 periods including January year wrap', () => {
      const categories = E2E_DEFAULT_CATEGORIES;
      const janNow = new Date(2026, 0, 15, 12, 0, 0);
      const txs = [
        {
          id: 'tx-jan-2026',
          name: 'Jan Lunch',
          value: 1500,
          createdAt: new Date(2026, 0, 10, 12, 0, 0).toISOString(),
          categoryId: '3c3d9f8c-af23-49ed-946c-0d72a2191008',
        },
        {
          id: 'tx-dec-2025',
          name: 'Dec Rent',
          value: 12000,
          createdAt: new Date(2025, 11, 15, 12, 0, 0).toISOString(),
          categoryId: 'f4ac3532-3870-4f85-a9d8-4dc1e24a4d97',
        },
        {
          id: 'tx-jun-2025',
          name: 'Jun Flight',
          value: 45000,
          createdAt: new Date(2025, 5, 15, 12, 0, 0).toISOString(),
          categoryId: '2fe6596b-6292-4d8c-826d-5f4d3d99f543',
        },
        {
          id: 'tx-deleted',
          name: 'Deleted',
          value: 9999,
          createdAt: new Date(2026, 0, 12, 12, 0, 0).toISOString(),
          deletedAt: new Date(2026, 0, 12, 13, 0, 0).toISOString(),
          categoryId: '3c3d9f8c-af23-49ed-946c-0d72a2191008',
        },
      ];

      const reports = computeExpectedReports(txs, janNow, categories);

      expect(reports.currentMonth.totalAmount).toBe('1 500');
      expect(reports.currentMonth.reports).toHaveLength(1);
      expect(reports.lastMonth.totalAmount).toBe('12 000');
      expect(reports.lastMonth.reports.map((r) => r.name)).toEqual(['Housing']);
      expect(reports.currentYear.totalAmount).toBe('1 500');
      expect(reports.lastYear.totalAmount).toBe('57 000');
      expect(reports.lastYear.reports).toHaveLength(2);
    });

    it('uses explicit device timezone offset across UTC month/year boundaries', () => {
      // 2026-11-30T20:00:00Z is 2026-12-01T02:00:00 in +06:00 (December, not November)
      const instant = new Date('2026-11-30T20:00:00.000Z');
      const fixture = buildValidBackupFixture({ now: instant, tzOffsetMinutes: 360 });
      const reports = computeExpectedReports(fixture.transactions, instant, E2E_DEFAULT_CATEGORIES, 360);

      expect(reports.currentMonth.totalAmount).toBe('3 500');
      expect(reports.lastMonth.totalAmount).toBe('12 000');
      expect(reports.currentYear.totalAmount).toBe('15 500');
      expect(reports.lastYear.totalAmount).toBe('45 000');
    });
  });

  describe('auditLogcat', () => {
    it('passes on clean logcat and flags app crashes, FileProvider errors, and uncaught JS errors in both -v threadtime and -v time formats', () => {
      const cleanLog = `
11-22 20:00:00.000  1000  1000 I Capacitor/Console: File: https://localhost/assets/index.js - Line 1 - Msg: ready
11-22 20:00:01.000  9999  9999 E AndroidRuntime: FATAL EXCEPTION: main
11-22 20:00:01.000  9999  9999 E AndroidRuntime: Process: com.other.unrelated, PID: 9999
11-22 20:00:02.000 E/AndroidRuntime( 9999): FATAL EXCEPTION: main
11-22 20:00:02.000 E/AndroidRuntime( 9999): Process: com.other.unrelated, PID: 9999
`;
      expect(auditLogcat(cleanLog)).toEqual({
        fatalCrashes: [],
        fileProviderErrors: [],
        jsErrors: [],
      });

      const threadtimeDirtyLog = `
11-22 20:01:00.000  5000  5000 E AndroidRuntime: FATAL EXCEPTION: main
11-22 20:01:00.000  5000  5000 E AndroidRuntime: Process: com.budget.app, PID: 5000
11-22 20:01:01.000  5000  5000 E FileProvider: Failed to find configured root that contains /data/user/0/com.budget.app/cache/b.json
11-22 20:01:02.000  5000  5000 I chromium: [INFO:CONSOLE(12)] "Uncaught TypeError: Cannot read properties of null"
11-22 20:01:03.000  5000  5000 E Capacitor/Console: Unhandled rejection
`;
      const threadtimeResult = auditLogcat(threadtimeDirtyLog);
      expect(threadtimeResult.fatalCrashes).toHaveLength(1);
      expect(threadtimeResult.fileProviderErrors).toHaveLength(1);
      expect(threadtimeResult.jsErrors).toHaveLength(2);

      const timeFormatDirtyLog = `
11-22 20:02:00.000 E/AndroidRuntime( 5000): FATAL EXCEPTION: main
11-22 20:02:00.000 E/AndroidRuntime( 5000): Process: com.budget.app, PID: 5000
11-22 20:02:01.000 E/Capacitor/Console( 5000): File: https://localhost/ - Line 1 - Msg: ReferenceError
`;
      const timeResult = auditLogcat(timeFormatDirtyLog);
      expect(timeResult.fatalCrashes).toHaveLength(1);
      expect(timeResult.jsErrors).toHaveLength(1);
    });

    it('ignores paired expected Capacitor bridge rejections while still flagging unpaired or unexpected plugin echoes', () => {
      const expectedOnlyLog = `
11-22 21:31:51.346 10536 10594 D Capacitor: Sending plugin error: {"save":false,"callbackId":"46134912","pluginId":"Keyboard","methodName":"getResizeMode","success":false,"error":{"message":"not implemented","code":"UNIMPLEMENTED"}}
11-22 21:31:51.372 10536 10536 E Capacitor/Console: File:  - Line 330 - Msg: [object Object]
11-22 21:32:09.071 10679 10679 D Capacitor: Sending plugin error: {"save":false,"callbackId":"38788733","pluginId":"Share","methodName":"share","success":false,"error":{"message":"Share canceled"}}
11-22 21:32:09.082 10679 10679 E Capacitor/Console: File:  - Line 330 - Msg: [object Object]
`;
      expect(auditLogcat(expectedOnlyLog).jsErrors).toEqual([]);

      const unexpectedLog = `
11-22 21:32:10.000 10679 10679 D Capacitor: Sending plugin error: {"save":false,"callbackId":"999","pluginId":"Filesystem","methodName":"writeFile","success":false,"error":{"message":"Permission denied"}}
11-22 21:32:10.010 10679 10679 E Capacitor/Console: File:  - Line 330 - Msg: [object Object]
11-22 21:32:11.000 10679 10679 E Capacitor/Console: File:  - Line 330 - Msg: [object Object]
`;
      expect(auditLogcat(unexpectedLog).jsErrors).toHaveLength(2);
    });
  });

  describe('fixtures', () => {
    it('matches DEFAULT_CATEGORIES and produces a backup accepted by parseBackupSnapshot', () => {
      expect(E2E_DEFAULT_CATEGORIES).toEqual(DEFAULT_CATEGORIES);

      const snapshot = buildValidBackupFixture({
        now: new Date('2026-11-22T14:00:00.000Z'),
        existingTxToOverwrite: {
          id: 'tx-persist',
          name: 'E2E Persist',
          value: 1000,
          createdAt: '2026-11-22T12:00:00.000Z',
          updatedAt: '2026-11-22T12:00:00.000Z',
          deletedAt: null,
          categoryId: '3c3d9f8c-af23-49ed-946c-0d72a2191008',
        },
        existingTxToKeepOlder: {
          id: 'tx-deleted',
          name: 'E2E Dinner',
          value: 2500,
          createdAt: '2026-11-22T12:05:00.000Z',
          updatedAt: '2026-11-22T12:06:00.000Z',
          deletedAt: '2026-11-22T12:06:00.000Z',
          categoryId: '2fe6596b-6292-4d8c-826d-5f4d3d99f543',
        },
      });

      const parsed = parseBackupSnapshot(JSON.stringify(snapshot));
      expect(parsed.transactions).toHaveLength(5);
      expect(parsed.categories).toHaveLength(14);
    });
  });
});
