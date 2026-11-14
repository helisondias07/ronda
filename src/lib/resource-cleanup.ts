import type { Server } from "node:http";
import type { Browser } from "playwright";

const serverClosures = new WeakMap<Server, Promise<void>>();
const browserClosures = new WeakMap<Browser, Promise<void>>();

export function closeServer(server?: Server): Promise<void> {
  if (!server) return Promise.resolve();
  const existing = serverClosures.get(server);
  if (existing) return existing;
  const closing = new Promise<void>((resolve, reject) => {
    if (!server.listening) return resolve();
    server.close((error) => {
      if (error && (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING") reject(error);
      else resolve();
    });
  });
  serverClosures.set(server, closing);
  return closing;
}

export function closeBrowser(browser?: Browser): Promise<void> {
  if (!browser) return Promise.resolve();
  const existing = browserClosures.get(browser);
  if (existing) return existing;
  const closing = browser.isConnected() ? browser.close() : Promise.resolve();
  browserClosures.set(browser, closing);
  return closing;
}
