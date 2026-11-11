import { createMockServer } from './mock-server.ts';
import { SEED_ACCOUNTS, SEED_PASSWORD } from './seed.ts';

/**
 * CLI entry: `npm run mock` / `node server/mockServer.ts`.
 *
 * Node 24 runs TypeScript directly (type stripping), so this file needs no
 * loader, no ts-node and no build step. Only erasable TypeScript syntax is used
 * — no enums, namespaces or parameter properties.
 *
 * The server listens on :9000 by default. `MOCK_SERVER_PORT`, `MOCK_DB_PATH` and
 * `MOCK_DATA_DIR` override that (see `server/README.md`).
 */

function printBanner(url: string): void {
  console.log('');
  console.log('  Kuttab mock backend');
  console.log(`  listening   ${url}`);
  console.log(`  health      ${url}/health`);
  console.log(`  functions   POST ${url}/v1/functions/<name>`);
  console.log(`  events      GET  ${url}/v1/events?since=0`);
  console.log(`  stream      GET  ${url}/v1/events/stream?token=<session>`);
  console.log('');
  console.log(`  password for every seeded account: ${SEED_PASSWORD}`);

  for (const account of SEED_ACCOUNTS) {
    console.log(`    ${account.role.padEnd(10)} ${account.email}`);
  }

  console.log('');
}

async function main(): Promise<void> {
  const running = await createMockServer().listen();

  printBanner(running.url);

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;

    console.log(`\n[mock-server] ${signal} — shutting down`);
    await running.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');

if (
  entry.endsWith('/server/mockServer.ts') ||
  entry.endsWith('/mockServer.ts')
) {
  void main().catch((error: unknown) => {
    console.error('[mock-server] failed to start:', error);
    process.exit(1);
  });
}
