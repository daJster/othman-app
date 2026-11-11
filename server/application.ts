import type { DatabaseSync } from 'node:sqlite';
import { loadConfig, ensureDataDirs, type ServerConfig } from './config.ts';
import { openDatabase } from './db/database.ts';
import { EventBus } from './events/event-bus.ts';
import { createFunctionRegistry } from './functions/registry.ts';
import type { FunctionRegistry } from './functions/types.ts';
import { ROUTES, type Route } from './routes.ts';
import { seedIfEmpty } from './seed.ts';
import { createDocumentStore, type DocumentStore } from './stores/documents.ts';

/**
 * Composition root.
 *
 * Everything that a handler needs is created once here and passed through the
 * context. No handler imports a global database or opens a file itself, which is
 * what keeps them runnable under three different providers and in tests.
 */

export type MockApplication = {
  config: ServerConfig;
  db: DatabaseSync;
  documents: DocumentStore;
  events: EventBus;
  registry: FunctionRegistry;
  routes: readonly Route[];
};

export function createApplication(
  overrides: Partial<ServerConfig> = {},
): MockApplication {
  const config = loadConfig(overrides);
  ensureDataDirs(config);

  const db = openDatabase(config.dbPath);
  const documents = createDocumentStore(config.dataDir);
  const events = new EventBus(db);

  seedIfEmpty({ db, documents });

  return {
    config,
    db,
    documents,
    events,
    registry: createFunctionRegistry(),
    routes: ROUTES,
  };
}
