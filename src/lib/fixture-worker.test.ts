import { describe, expect, it, vi } from "vitest";
import { mkdir, mkdtemp, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fixtureWorkerEnv, killWorkerProcessTree, runFixtureWorker } from "./fixture-worker";

const workerDirs = async () => (await readdir(os.tmpdir())).filter((name) => name.startsWith("ronda-fixture-worker-")).sort();

describe("fixture worker experimental", () => {
  it("passes only environment names required for local execution", () => {
    expect(fixtureWorkerEnv({ NODE_ENV: "test", PATH: "fixture-path", API_TOKEN: "do-not-copy", SECRET: "do-not-copy" })).toEqual({
      NODE_ENV: "production",
      PATH: "fixture-path",
    });
  });

  it("kills full Windows process tree via taskkill /PID /T /F and falls back on failure", async () => {
    const taskkillCalls: number[] = [];
    const killSpy = vi.fn(() => true);
    await killWorkerProcessTree(
      { pid: 4321, kill: killSpy },
      "win32",
      async (pid) => {
        taskkillCalls.push(pid);
      },
    );
    expect(taskkillCalls).toEqual([4321]);
    expect(killSpy).not.toHaveBeenCalled();

    await killWorkerProcessTree(
      { pid: 9876, kill: killSpy },
      "win32",
      async () => {
        throw new Error("taskkill unavailable");
      },
    );
    expect(killSpy).toHaveBeenCalledWith("SIGKILL");
  });

  it("rejects invalid deadlines before starting a child", async () => {
    await expect(runFixtureWorker(process.cwd(), 0)).rejects.toThrow("Prazo inválido");
    await expect(runFixtureWorker(process.cwd(), 60_001)).rejects.toThrow("Prazo inválido");
  });

  it("interrupts a child that exceeds its deadline and cleans its directory", async () => {
    const before = await workerDirs();
    await expect(runFixtureWorker(process.cwd(), 1)).rejects.toThrow("Worker excedeu o prazo");
    expect(await workerDirs()).toEqual(before);
  }, 15_000);

  it("removes its work directory when fixture preparation fails", async () => {
    const before = await workerDirs();
    await expect(runFixtureWorker(path.join(os.tmpdir(), "ronda-fixture-missing-root"))).rejects.toThrow();
    expect(await workerDirs()).toEqual(before);
  });

  it("removes its work directory when a successful child writes an invalid report", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "ronda-invalid-report-root-"));
    const before = await workerDirs();
    try {
      await mkdir(path.join(root, "src", "cli"), { recursive: true });
      await mkdir(path.join(root, "fixture"));
      await writeFile(
        path.join(root, "src", "cli", "run.ts"),
        'import { mkdirSync, writeFileSync } from "node:fs"; mkdirSync("ronda-out", { recursive: true }); writeFileSync("ronda-out/report.json", "{}");',
      );
      await writeFile(path.join(root, "package.json"), "{}");
      await writeFile(path.join(root, "tsconfig.json"), "{}");
      await symlink(path.join(process.cwd(), "node_modules"), path.join(root, "node_modules"), process.platform === "win32" ? "junction" : "dir");
      await expect(runFixtureWorker(root)).rejects.toThrow("Relatório do worker inválido");
      expect(await workerDirs()).toEqual(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 15_000);
});
