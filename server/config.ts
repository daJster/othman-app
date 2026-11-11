import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Server configuration.
 *
 * Every path is overridable so tests can run against `:memory:` SQLite and a
 * throwaway document directory without touching a developer's seeded data.
 */

export type ServerConfig = {
  host: string;
  port: number;
  /** `:memory:` in tests; a file under `server/data` by default. */
  dbPath: string;
  /** Directory for the JSON (document) store. */
  dataDir: string;
  /** Session lifetime. */
  tokenTtlMs: number;
  /** `*` by default: the dev client and the browser are different origins. */
  corsOrigin: string;
  /** Request logging; tests turn it off. */
  logRequests: boolean;
  /** Artificial latency so loading states are exercised in the UI. */
  latencyMs: number;
};

const REPO_ROOT = process.cwd();
const DEFAULT_DATA_DIR = join(REPO_ROOT, 'server', 'data');

export function loadConfig(
  overrides: Partial<ServerConfig> = {},
): ServerConfig {
  return {
    host: overrides.host ?? nonEmpty(process.env.MOCK_SERVER_HOST) ?? '0.0.0.0',
    port: overrides.port ?? numberFromEnv('MOCK_SERVER_PORT', 9000),
    dbPath:
      overrides.dbPath ??
      nonEmpty(process.env.MOCK_DB_PATH) ??
      join(DEFAULT_DATA_DIR, 'kuttab.sqlite'),
    dataDir:
      overrides.dataDir ??
      nonEmpty(process.env.MOCK_DATA_DIR) ??
      join(DEFAULT_DATA_DIR, 'documents'),
    tokenTtlMs:
      overrides.tokenTtlMs ??
      numberFromEnv('MOCK_TOKEN_TTL_MS', 7 * 86_400_000),
    corsOrigin:
      overrides.corsOrigin ?? nonEmpty(process.env.MOCK_CORS_ORIGIN) ?? '*',
    logRequests: overrides.logRequests ?? process.env.MOCK_LOG !== '0',
    latencyMs: overrides.latencyMs ?? numberFromEnv('MOCK_LATENCY_MS', 0),
  };
}

/** Treats `VAR=` (as written in `.env.example`) the same as an unset var. */
function nonEmpty(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === '' ? undefined : value;
}

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Creates the parent directories a file-backed config needs. */
export function ensureDataDirs(config: ServerConfig): void {
  if (config.dbPath !== ':memory:') {
    mkdirSync(dirname(resolve(config.dbPath)), { recursive: true });
  }

  mkdirSync(resolve(config.dataDir), { recursive: true });
}

/** Where the app's existing mock fixtures live. Used only to seed. */
export function fixturePath(...segments: string[]): string {
  return join(REPO_ROOT, 'src', ...segments);
}
