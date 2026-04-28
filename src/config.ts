// MarkNext Configuration Loader
// Parses marknext.toml (TOML subset)

export interface MarkNextConfig {
  build?: {
    input?: string;
    output?: string;
    format?: 'html' | 'json';
  };
  extensions?: {
    enable?: string[];
    math?: {
      renderer?: string;
    };
  };
  hooks?: {
    pre?: string;
    post?: string;
  };
  shortcodes?: Record<string, { template: string }>;
  compatibility?: {
    mode?: 'strict' | 'warn' | 'legacy';
  };
}

function parseValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === '') return '';
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map(s => parseValue(s.trim()));
  }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const inner = trimmed.slice(1, -1);
    const obj: Record<string, unknown> = {};
    // Simple key = value parsing for inline tables
    const pairs = inner.split(',');
    for (const pair of pairs) {
      const eq = pair.indexOf('=');
      if (eq > 0) {
        const k = pair.slice(0, eq).trim();
        const v = pair.slice(eq + 1).trim();
        obj[k] = parseValue(v);
      }
    }
    return obj;
  }
  // Unquote string if quoted
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function parseConfig(toml: string): MarkNextConfig {
  const config: MarkNextConfig = {};
  let currentSection: string | null = null;
  let currentTable: Record<string, unknown> | null = null;

  for (const rawLine of toml.split('\n')) {
    const line = rawLine.split('#')[0]!.trim();
    if (!line) continue;

    // Section header: [section] or [section.sub]
    if (line.startsWith('[') && line.endsWith(']')) {
      const section = line.slice(1, -1);
      currentSection = section;

      if (section.includes('.')) {
        const parts = section.split('.');
        const parent = parts[0]!;
        const child = parts[1]!;
        const parentKey = parent as keyof MarkNextConfig;
        if (!config[parentKey]) {
          (config as Record<string, unknown>)[parent] = {};
        }
        const parentObj = config[parentKey] as Record<string, unknown>;
        if (!parentObj[child]) {
          parentObj[child] = {};
        }
        currentTable = parentObj[child] as Record<string, unknown>;
      } else {
        const sectionKey = section as keyof MarkNextConfig;
        if (!config[sectionKey]) {
          (config as Record<string, unknown>)[section] = {};
        }
        currentTable = config[sectionKey] as Record<string, unknown>;
      }
      continue;
    }

    // Key = value
    const eq = line.indexOf('=');
    if (eq > 0 && currentTable) {
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      currentTable[key] = parseValue(value);
    }
  }

  return config;
}

export async function loadConfig(path: string): Promise<MarkNextConfig> {
  const fs = await import('fs/promises');
  try {
    const content = await fs.readFile(path, 'utf-8');
    return parseConfig(content);
  } catch {
    return {};
  }
}
