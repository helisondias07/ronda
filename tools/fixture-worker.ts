import path from "node:path";
import { fileURLToPath } from "node:url";
import { runFixtureWorker } from "../src/lib/fixture-worker";

if (process.argv.length !== 2) {
  console.error("O worker não aceita argumentos ou URLs.");
  process.exitCode = 1;
} else {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  runFixtureWorker(root).then(({ reportPath }) => console.log(`Worker fixture OK: ${reportPath}`)).catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Falha no worker."); process.exitCode = 1; });
}
