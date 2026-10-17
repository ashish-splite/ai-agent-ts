#!/usr/bin/env node
import { cp, lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
const args = process.argv.slice(2);

async function scaffold() {
  if (args.length === 1 && ["--help", "-h"].includes(args[0])) {
    console.log("Usage: ts-init <directory>\n\nCreates a Bun + TypeScript application. Requires Bun to run the generated app.");
    return;
  }
  if (args.length === 1 && ["--version", "-v"].includes(args[0])) {
    console.log(manifest.version);
    return;
  }
  if (args.length !== 1 || args[0].startsWith("-")) {
    throw new Error("Usage: ts-init <directory>");
  }

  const target = resolve(args[0]);
  const existing = await lstat(target).catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return undefined;
  });
  if (existing && (!existing.isDirectory() || (await readdir(target)).length > 0)) {
    throw new Error("Destination must be an empty directory or a new path.");
  }

  const name = basename(target).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 214) || "typescript-app";
  const appManifest = {
    name,
    version: "0.1.0",
    private: true,
    type: "module",
    engines: { bun: ">=1.3.0" },
    scripts: {
      dev: manifest.scripts.dev,
      start: manifest.scripts.start,
      typecheck: manifest.scripts.typecheck,
    },
    dependencies: manifest.dependencies,
    devDependencies: manifest.devDependencies,
  };

  await mkdir(target, { recursive: true });
  for (const entry of ["src", "tsconfig.json", "Dockerfile", "config.sample.yaml"]) {
    await cp(join(packageRoot, entry), join(target, entry), {
      recursive: true,
      filter: async (source) => !(await lstat(source)).isDirectory() || (await readdir(source)).length > 0,
    });
  }
  await cp(join(packageRoot, "config.sample.yaml"), join(target, "config.yaml"));
  await cp(join(packageRoot, "templates/gitignore"), join(target, ".gitignore"));
  await cp(join(packageRoot, "templates/dockerignore"), join(target, ".dockerignore"));
  await cp(join(packageRoot, "templates/README.md"), join(target, "README.md"));
  await writeFile(join(target, "package.json"), `${JSON.stringify(appManifest, null, 2)}\n`);
  console.log(`Created ${name} in ${target}\n\nNext steps:\n  cd ${JSON.stringify(target)}\n  bun install\n  bun run dev`);
}

try {
  await scaffold();
} catch (error) {
  console.error(`[ts-init] ${error instanceof Error ? error.message : "Scaffolding failed"}`);
  process.exitCode = 1;
}