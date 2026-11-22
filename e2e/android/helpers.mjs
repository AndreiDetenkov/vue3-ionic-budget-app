const XML_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeXmlEntities(value) {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, entity) => {
    if (entity.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return XML_ENTITIES[entity] ?? `&${entity};`;
  });
}

export function parseBounds(boundsStr) {
  const match = /^\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]$/.exec(boundsStr ?? '');
  if (!match) {
    return null;
  }
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    cx: Math.round((left + right) / 2),
    cy: Math.round((top + bottom) / 2),
  };
}

function parseAttributes(attrText) {
  const attrs = {};
  const attrRegex = /([a-zA-Z0-9_:-]+)="([^"]*)"/g;
  let match;
  while ((match = attrRegex.exec(attrText)) !== null) {
    attrs[match[1]] = decodeXmlEntities(match[2]);
  }
  return attrs;
}

export function parseUiHierarchy(xml) {
  if (typeof xml !== 'string' || xml.trim().length === 0) {
    return [];
  }

  const nodes = [];
  const stack = [];
  const tagRegex = /<(\/?)node\b((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let match;

  while ((match = tagRegex.exec(xml)) !== null) {
    const isClosing = match[1] === '/';
    const attrText = match[2];
    const isSelfClosing = match[3] === '/';

    if (isClosing) {
      stack.pop();
      continue;
    }

    const attrs = parseAttributes(attrText);
    const parentIndex = stack.length > 0 ? stack[stack.length - 1] : -1;
    const nodeIndex = nodes.length;

    nodes.push({
      text: attrs.text ?? '',
      contentDesc: attrs['content-desc'] ?? '',
      className: attrs.class ?? '',
      resourceId: attrs['resource-id'] ?? '',
      packageName: attrs.package ?? '',
      enabled: attrs.enabled !== 'false',
      clickable: attrs.clickable === 'true',
      bounds: parseBounds(attrs.bounds),
      parentIndex,
    });

    if (!isSelfClosing) {
      stack.push(nodeIndex);
    }
  }

  return nodes;
}

export function findUiNode(nodes, predicate) {
  return nodes.find((node, index) => predicate(node, index, nodes)) ?? null;
}

export function isNodeEffectivelyEnabled(nodes, node) {
  let current = node;
  while (current) {
    if (!current.enabled) {
      return false;
    }
    current = current.parentIndex >= 0 ? (nodes[current.parentIndex] ?? null) : null;
  }
  return true;
}

export function cssPointToScreen(cssRect, viewport, webViewBounds) {
  if (!viewport || viewport.width <= 0 || viewport.height <= 0) {
    throw new Error('Invalid WebView viewport dimensions');
  }
  if (!webViewBounds || webViewBounds.width <= 0 || webViewBounds.height <= 0) {
    throw new Error('Invalid WebView screen bounds');
  }

  const scaleX = webViewBounds.width / viewport.width;
  const scaleY = webViewBounds.height / viewport.height;
  const left = Math.round(webViewBounds.left + cssRect.left * scaleX);
  const top = Math.round(webViewBounds.top + cssRect.top * scaleY);
  const right = Math.round(webViewBounds.left + cssRect.right * scaleX);
  const bottom = Math.round(webViewBounds.top + cssRect.bottom * scaleY);

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    cx: Math.round((left + right) / 2),
    cy: Math.round((top + bottom) / 2),
  };
}

export function formatAmount(amount) {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function resolveClockContext(now = new Date(), tzOffsetMinutes) {
  const date = now instanceof Date ? now : now.date;
  const offset = tzOffsetMinutes ?? (now instanceof Date ? -now.getTimezoneOffset() : now.tzOffsetMinutes);
  const shifted = new Date(date.getTime() + offset * 60_000);
  return {
    date,
    offsetMinutes: offset,
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    toUtcMs: (y, m, d, h = 0, min = 0, s = 0, ms = 0) => Date.UTC(y, m, d, h, min, s, ms) - offset * 60_000,
  };
}

function getPeriodRange(period, clock) {
  const { year, month, toUtcMs } = clock;

  switch (period) {
    case 'currentMonth':
      return {
        from: toUtcMs(year, month, 1, 0, 0, 0, 0),
        to: toUtcMs(year, month + 1, 0, 23, 59, 59, 999),
      };
    case 'lastMonth':
      return {
        from: toUtcMs(year, month - 1, 1, 0, 0, 0, 0),
        to: toUtcMs(year, month, 0, 23, 59, 59, 999),
      };
    case 'currentYear':
      return {
        from: toUtcMs(year, 0, 1, 0, 0, 0, 0),
        to: toUtcMs(year, 11, 31, 23, 59, 59, 999),
      };
    case 'lastYear':
      return {
        from: toUtcMs(year - 1, 0, 1, 0, 0, 0, 0),
        to: toUtcMs(year - 1, 11, 31, 23, 59, 59, 999),
      };
    default:
      throw new Error(`Unknown report period: ${period}`);
  }
}

export function computeExpectedReports(transactions, nowDate = new Date(), categories = [], tzOffsetMinutes) {
  const clock = resolveClockContext(nowDate, tzOffsetMinutes);
  const categoryById = new Map(categories.map((cat) => [cat.id, cat]));
  const active = transactions
    .filter((tx) => !tx.deletedAt)
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const periods = ['currentMonth', 'lastMonth', 'currentYear', 'lastYear'];
  const result = {};

  for (const period of periods) {
    const { from, to } = getPeriodRange(period, clock);
    const matching = active.filter((tx) => {
      const ts = Date.parse(tx.createdAt);
      return !Number.isNaN(ts) && ts >= from && ts <= to;
    });

    const groups = new Map();
    let totalNumeric = 0;

    for (const tx of matching) {
      const category = tx.category ??
        categoryById.get(tx.categoryId) ?? { id: tx.categoryId, title: 'Other', icon: 'other' };
      totalNumeric += tx.value;

      let group = groups.get(category.id);
      if (!group) {
        group = {
          categoryId: category.id,
          name: category.title,
          icon: category.icon ?? '',
          value: 0,
          formattedValue: '0',
          transactions: [],
        };
        groups.set(category.id, group);
      }

      group.value += tx.value;
      group.formattedValue = formatAmount(group.value);
      group.transactions.push(tx);
    }

    result[period] = {
      totalNumeric,
      totalAmount: formatAmount(totalNumeric),
      reports: Array.from(groups.values()),
    };
  }

  return result;
}

export function auditLogcat(logcatText, packageName = 'com.budget.app') {
  const lines = String(logcatText ?? '').split(/\r?\n/);
  const fatalCrashes = [];
  const fileProviderErrors = [];
  const jsErrors = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (/AndroidRuntime(?:\(\s*\d+\))?:\s*FATAL EXCEPTION/i.test(line)) {
      const block = [line];
      let j = i + 1;
      while (j < lines.length && /AndroidRuntime(?:\(\s*\d+\))?:/i.test(lines[j])) {
        block.push(lines[j]);
        j += 1;
      }
      const blockText = block.join('\n');
      const processMatch = /Process:\s*([^\s,]+)/.exec(blockText);
      if (!processMatch || processMatch[1] === packageName || blockText.includes(packageName)) {
        fatalCrashes.push(blockText);
      }
      i = j - 1;
      continue;
    }

    if (
      /Failed to find configured root|FileUriExposedException|FileProvider.*(?:Exception|Error|Failed|unable|cannot|denied)|(?:Exception|Error|Failed).*FileProvider/i.test(
        line,
      )
    ) {
      fileProviderErrors.push(line);
    }

    if (/(?:Capacitor\/Console|chromium)/i.test(line)) {
      const isUncaught = /\bUncaught\b|\bUnhandled\s+(?:Promise\s+)?rejection\b/i.test(line);
      const isCapacitorError = /(?:\bE\s+|E\/)Capacitor\/Console(?:\(\s*\d+\))?\s*:/i.test(line);
      if (isUncaught || isCapacitorError) {
        jsErrors.push(line);
      }
    }
  }

  return { fatalCrashes, fileProviderErrors, jsErrors };
}
