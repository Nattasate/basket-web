export type DownloadMap = Record<string, string>;

const KEY_ALIAS_SOURCES: Record<string, string[]> = {
  excel: ['xlsx', 'xls', 'excel_file', 'excelfile', 'excelfilename', 'excelpath', 'excel_url', 'excelurl'],
  csv: ['associationrules', 'association_rules', 'associationrulescsv', 'rulescsv', 'rules_csv', 'csvfile']
};

const VALUE_FIELD_CANDIDATES = [
  'filename',
  'file',
  'path',
  'filepath',
  'file_path',
  'fileName',
  'file_path',
  'filePath',
  'url',
  'href',
  'uri',
  'download',
  'download_url',
  'downloadUrl',
  'downloadPath',
  'download_path',
  'location',
  'value',
  'data',
  'result',
  'output',
  'link'
];

const FORMAT_FIELD_CANDIDATES = ['format', 'type', 'kind', 'id', 'name', 'label'];

const FALLBACK_ORDER: Array<keyof DownloadMap> = ['excel', 'csv'];

const buildAliasSet = (aliases: string[]): Set<string> => {
  const set = new Set<string>();
  for (const alias of aliases) {
    const lower = alias.toLowerCase();
    set.add(lower);
    set.add(lower.replace(/[^a-z0-9]+/g, ''));
  }
  return set;
};

const KEY_ALIAS_MAP: Record<string, Set<string>> = Object.entries(KEY_ALIAS_SOURCES).reduce(
  (acc, [canonical, aliases]) => {
    acc[canonical] = buildAliasSet([canonical, ...aliases]);
    return acc;
  },
  {} as Record<string, Set<string>>
);

const canonicalFromRaw = (raw: unknown): keyof DownloadMap | null => {
  if (typeof raw !== 'string') {
    return null;
  }

  const key = raw.trim();
  if (!key) {
    return null;
  }

  const lower = key.toLowerCase();
  const sanitized = lower.replace(/[^a-z0-9]+/g, '');

  for (const [canonical, aliasSet] of Object.entries(KEY_ALIAS_MAP)) {
    if (aliasSet.has(lower) || aliasSet.has(sanitized)) {
      return canonical as keyof DownloadMap;
    }
  }

  return null;
};

const extractString = (value: unknown, seen: Set<unknown> = new Set()): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  if (seen.has(value)) {
    return null;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = extractString(entry, seen);
      if (result) {
        return result;
      }
    }
    return null;
  }

  const record = value as Record<string, unknown>;

  for (const field of VALUE_FIELD_CANDIDATES) {
    if (field in record) {
      const result = extractString(record[field], seen);
      if (result) {
        return result;
      }
    }
  }

  for (const nested of Object.values(record)) {
    const result = extractString(nested, seen);
    if (result) {
      return result;
    }
  }

  return null;
};

const tryAssign = (
  merged: DownloadMap,
  canonical: keyof DownloadMap | null,
  rawValue: unknown
) => {
  if (!canonical) {
    return;
  }

  if (merged[canonical]) {
    return;
  }

  const value = extractString(rawValue);
  if (value) {
    merged[canonical] = value;
  }
};

const tryAssignFallback = (merged: DownloadMap, rawValue: unknown) => {
  const value = extractString(rawValue);
  if (!value) {
    return;
  }

  for (const fallback of FALLBACK_ORDER) {
    if (!merged[fallback]) {
      merged[fallback] = value;
      break;
    }
  }
};

export const normalizeDownloadMap = (...sources: unknown[]): DownloadMap => {
  const merged: DownloadMap = {};
  const visited = new Set<unknown>();

  const process = (source: unknown) => {
    if (source === null || source === undefined) {
      return;
    }

    if (typeof source === 'string') {
      tryAssignFallback(merged, source);
      return;
    }

    if (typeof source !== 'object') {
      return;
    }

    if (visited.has(source)) {
      return;
    }
    visited.add(source);

    if (Array.isArray(source)) {
      for (const entry of source) {
        process(entry);
      }
      return;
    }

    const record = source as Record<string, unknown>;

    for (const [rawKey, rawValue] of Object.entries(record)) {
      const canonical = canonicalFromRaw(rawKey);
      if (canonical) {
        tryAssign(merged, canonical, rawValue);
      }
    }

    const formatHint = (() => {
      for (const candidate of FORMAT_FIELD_CANDIDATES) {
        if (candidate in record) {
          const canonical = canonicalFromRaw(record[candidate]);
          if (canonical) {
            return canonical;
          }
        }
      }
      return null;
    })();

    if (formatHint) {
      const directValue = (() => {
        const direct = extractString(record[formatHint]);
        if (direct) {
          return direct;
        }
        for (const field of VALUE_FIELD_CANDIDATES) {
          if (field in record) {
            const candidate = extractString(record[field]);
            if (candidate) {
              return candidate;
            }
          }
        }
        return extractString(record);
      })();

      if (directValue && !merged[formatHint]) {
        merged[formatHint] = directValue;
      }
    }

    for (const value of Object.values(record)) {
      process(value);
    }
  };

  for (const source of sources) {
    process(source);
  }

  return merged;
};

