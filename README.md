# @ashish3020/ts-init

Your reusable TypeScript application boilerplate, running on Bun with Elysia HTTP, validated YAML configuration, and optional Redis, Postgres, and OpenAI clients. Business-specific users, chat, appointment, and mail implementations are not included.

This is a project initializer, not a runtime library: the command copies an editable application into a new directory. The application does not depend on this package or receive its updates automatically.

## Create a Project

After the package is published:

```sh
npx @ashish3020/ts-init@latest my-service
# Or:
bunx @ashish3020/ts-init@latest my-service

cd my-service
bun install
bun run dev
```

Node.js 22+ runs the initializer through npm/npx; Bun 1.3+ runs the generated application. The Node minimum matches the OpenAI SDK dependency. The destination must be new or empty. The new app's package name comes from its directory, with `private: true` to prevent accidental publishing.

## Starter Layout

```text
src/
  main.ts
  apps/http/
    app.ts
    container.ts
    elysia/
      controllers/health.controller.ts
      middleware/
  config/
    app-config.ts
    schema.ts
  infra/
    openai/
    postgres/
    redis/
  modules/health/
  shared/errors.ts
config.sample.yaml
```

All infrastructure connections are opt-in through `config.yaml`; a fresh project starts without external services or credentials. The CLI creates `config.yaml` from the sample and ignores it in Git and Docker. It never copies the initializer repository's local configuration. OpenAI retains the generic agent and tool registry, without domain tools.

## Publish to npm

1. Install Node.js 22+, npm, and Bun 1.3+. From this repository, install and verify:

   ```sh
   bun install
   bun run typecheck
   npm test
   ```

2. Confirm that `@ashish3020/ts-init` is available or already owned by you:

   ```sh
   npm view @ashish3020/ts-init name version
   ```

   A registry 404 usually means the name is not published. Authentication or network failures are not an availability check. If you choose another name, update `package.json` and these commands before publishing.

3. Log in to the public npm registry and complete its browser authentication and any required 2FA:

   ```sh
   npm login --registry=https://registry.npmjs.org
   npm whoami --registry=https://registry.npmjs.org
   ```

   The username should be `ashish3020`. Configure npm's required publishing authentication in your account. Do not put tokens in source files.

4. Inspect exactly what will ship:

   ```sh
   npm pack --dry-run
   npm pack
   ```

   The allowlist includes only the CLI, templates, starter source, sample config, TypeScript config, Dockerfile, and npm's standard metadata/readme files. Your actual `config.yaml`, dependencies directory, tests, and Postman collections must not appear. Decide on your intended license and add a license file before public release.

5. Test the actual tarball locally before publishing:

   ```sh
   npm exec --yes --package=./ashish3020-ts-init-1.0.0.tgz -- ts-init /tmp/ts-init-smoke
   cd /tmp/ts-init-smoke
   bun install
   bun run typecheck
   bun run dev
   ```

   Use a fresh destination if that directory already exists. Stop the dev server with Ctrl+C and return to this repository before the next step.

6. Publish publicly under your npm scope:

   ```sh
   npm publish --access public --registry=https://registry.npmjs.org
   ```

   The prepublish check runs TypeScript validation and CLI tests. Complete any npm authentication prompts yourself. The full scoped package name needs the leading `@`; `ashish3020/ts-init` without it is not the npm scoped name.

7. Verify the release:

   ```sh
   npm view @ashish3020/ts-init version
   npx @ashish3020/ts-init@latest my-next-service
   ```

8. For later releases, update the version and publish again:

   ```sh
   npm version patch --no-git-tag-version
   npm publish --access public --registry=https://registry.npmjs.org
   ```

   npm versions are immutable. Use `minor` for added features and `major` for breaking changes. Re-run the tarball inspection and smoke test for every release.

## Develop This Starter

```sh
cp config.sample.yaml config.yaml
bun install
bun run dev
```

Do not overwrite an existing local config. See `templates/README.md` for generated-app configuration, layout, and Docker instructions. Changes to starter source apply only to newly generated projects.