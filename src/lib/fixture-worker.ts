import { spawn, type ChildProcess } from "node:child_process";
import { cp, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseReport } from "./viewer-parse";
import { isPassing } from "./report";

/** Processo auxiliar experimental: não é uma barreira de rede ou sandbox do SO. */
export function fixtureWorkerEnv(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { NODE_ENV: "production" };
  for (const key of ["SystemRoot", "WINDIR", "PATH", "Path", "USERPROFILE", "LOCALAPPDATA", "HOME", "TMP", "TEMP", "TMPDIR"]) {
    if (source[key] !== undefined) env[key] = source[key];
  }
  return env;
}

export function killWorkerProcessTree(
  child: Pick<ChildProcess, "pid" | "kill">,
  platform: NodeJS.Platform = process.platform,
  runTaskkill: (pid: number) => Promise<void> = defaultWindowsTaskkill,
): Promise<void> {
  const pid = child.pid;
  if (platform === "win32" && typeof pid === "number" && pid > 0) {
    return runTaskkill(pid).catch(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        /* process already exited */
      }
    });
  }
  if (typeof pid === "number" && pid > 0 && platform !== "win32") {
    try {
      process.kill(-pid, "SIGKILL");
      return Promise.resolve();
    } catch {
      /* not a process group leader; fall back to child.kill */
    }
  }
  try {
    child.kill("SIGKILL");
  } catch {
    /* process already exited */
  }
  return Promise.resolve();
}

function defaultWindowsTaskkill(pid: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.on("error", reject);
    killer.on("close", () => resolve());
  });
}

export async function runFixtureWorker(root: string, timeoutMs = 45_000): Promise<{ workDir: string; reportPath: string }> {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) throw new Error("Prazo inválido para o worker.");
  const workDir = await mkdtemp(path.join(os.tmpdir(), "ronda-fixture-worker-"));
  let treeKill: Promise<void> | undefined;
  try {
    for (const entry of ["src", "fixture", "package.json", "tsconfig.json"]) {
      await cp(path.join(root, entry), path.join(workDir, entry), { recursive: true, errorOnExist: true, force: false });
    }
    await symlink(path.join(root, "node_modules"), path.join(workDir, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ["--import", "tsx", "src/cli/run.ts"], {
        cwd: workDir,
        env: fixtureWorkerEnv(process.env),
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        detached: process.platform !== "win32",
      });
      let settled = false;
      let timedOut = false;
      let bytes = 0;
      let tooMuch = false;
      const limit = 64 * 1024;
      const terminate = () => {
        if (!treeKill) treeKill = killWorkerProcessTree(child);
      };
      const timer = setTimeout(() => {
        timedOut = true;
        terminate();
      }, timeoutMs);
      const drain = (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > limit && !tooMuch) {
          tooMuch = true;
          terminate();
        }
      };
      child.stdout.on("data", drain);
      child.stderr.on("data", drain);
      child.on("error", () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          terminate();
          reject(new Error("Não foi possível iniciar o worker do fixture."));
        }
      });
      child.on("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const finalize = async () => {
          if (treeKill) await treeKill;
          if (timedOut) throw new Error("Worker excedeu o prazo; árvore de processos encerrada.");
          if (tooMuch) throw new Error("Worker excedeu o limite de saída.");
          if (code !== 0) throw new Error(`Worker do fixture terminou com código ${code}.`);
        };
        finalize().then(resolve, reject);
      });
    });
    const reportPath = path.join(workDir, "ronda-out", "report.json");
    const parsed = parseReport(await readFile(reportPath, "utf8"));
    if (
      !parsed.ok ||
      parsed.report.target !== "fixture" ||
      parsed.report.steps.map((step) => step.id).join(",") !== "home,categoria,produto,carrinho,checkout" ||
      !isPassing(parsed.report)
    ) {
      throw new Error("Relatório do worker inválido ou incompleto.");
    }
    return { workDir, reportPath };
  } catch (error) {
    if (treeKill) {
      try { await treeKill; } catch { /* ignore */ }
    }
    try {
      await rm(workDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch {
      /* preserve the worker error */
    }
    throw error;
  }
}
