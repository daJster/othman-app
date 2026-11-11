import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApplication, type MockApplication } from './application.ts';
import type { ServerConfig } from './config.ts';
import { createRequestListener } from './http/request-handler.ts';

/**
 * Bootable mock server.
 *
 * `createMockServer` is exported for tests and for embedding; `mockServer.ts`
 * is the CLI entry that calls `listen()`. The split is deliberate: a Jest test
 * can bind port 0, exercise real HTTP, and close without touching the
 * developer's data directory.
 */

export type RunningMockServer = {
  app: MockApplication;
  server: Server;
  port: number;
  url: string;
  close: () => Promise<void>;
};

export type MockServer = {
  app: MockApplication;
  server: Server;
  listen: () => Promise<RunningMockServer>;
  close: () => Promise<void>;
};

export function createMockServer(
  overrides: Partial<ServerConfig> = {},
): MockServer {
  const app = createApplication(overrides);
  const server = createServer(createRequestListener(app));

  const close = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!server.listening) {
        app.db.close();
        resolve();
        return;
      }

      server.closeAllConnections();
      server.close((error) => {
        app.db.close();

        if (error) reject(error);
        else resolve();
      });
    });

  return {
    app,
    server,
    listen: () =>
      new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(app.config.port, app.config.host, () => {
          server.off('error', reject);

          const address = server.address() as AddressInfo;
          const host =
            app.config.host === '0.0.0.0' ? 'localhost' : app.config.host;

          resolve({
            app,
            server,
            port: address.port,
            url: `http://${host}:${address.port}`,
            close,
          });
        });
      }),
    close,
  };
}
