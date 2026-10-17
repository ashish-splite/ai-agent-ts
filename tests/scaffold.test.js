import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cli = fileURLToPath(new URL("../bin/ts-init.js", import.meta.url));

test("scaffolds a generic application with sample configuration and infrastructure clients", async () => {
  const root = await mkdtemp(join(tmpdir(), "ts-init-test-"));
  try {
    const target = join(root, "my-service");
    execFileSync(process.execPath, [cli, target]);
    const manifest = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
    assert.equal(manifest.name, "my-service");
    assert.equal(manifest.private, true);
    assert.equal(manifest.bin, undefined);
    assert.equal(manifest.scripts.prepublishOnly, undefined);
    assert.ok(manifest.dependencies.postgres);
    assert.ok(manifest.dependencies.ioredis);
    assert.ok(manifest.dependencies.openai);
    assert.equal(await readFile(join(target, "config.yaml"), "utf8"), await readFile(join(target, "config.sample.yaml"), "utf8"));
    assert.match(await readFile(join(target, ".gitignore"), "utf8"), /config\.yaml/);
    for (const entry of ["redis/redis-connection.ts", "postgres/postgres-connection.ts", "openai/openai-agent.ts"]) {
      assert.ok(await readFile(join(target, "src/infra", entry), "utf8"));
    }
    assert.deepEqual(await readdir(join(target, "src/modules")), ["health"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refuses a non-empty destination without overwriting files", async () => {
  const target = await mkdtemp(join(tmpdir(), "ts-init-existing-"));
  try {
    await writeFile(join(target, "keep.txt"), "keep");
    const result = spawnSync(process.execPath, [cli, target], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /empty directory/);
    assert.equal(await readFile(join(target, "keep.txt"), "utf8"), "keep");
    assert.deepEqual(await readdir(target), ["keep.txt"]);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("offers help and rejects a missing destination", () => {
  assert.match(execFileSync(process.execPath, [cli, "--help"], { encoding: "utf8" }), /Usage: ts-init/);
  assert.equal(spawnSync(process.execPath, [cli]).status, 1);
});