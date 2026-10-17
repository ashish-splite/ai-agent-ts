# TypeScript Application

A Bun + TypeScript HTTP starter. Redis, Postgres, and OpenAI are optional and disabled by default. No business-specific services or routes are included.

## Run

Requires Bun 1.3 or newer.

```sh
bun install
bun run dev
```

The server listens on port 3000 by default, with a health endpoint at `GET /health`.

Edit `config.yaml` to enable infrastructure clients. `config.sample.yaml` is the reference configuration. Never commit credentials or your local `config.yaml`.

```sh
bun run typecheck
bun run start
bun run src/main.ts --app http --config /path/to/config.yaml
```

## Structure

- `src/apps/`: entrypoints, dependency wiring, HTTP controllers, and middleware.
- `src/config/`: YAML loading and schema validation.
- `src/infra/`: Redis, Postgres, and OpenAI clients, plus a generic agent tool registry.
- `src/modules/`: application services and contracts; only infrastructure health checks are provided.
- `src/shared/`: shared errors.

Add domain-specific modules and routes as your project grows. Register agent tools in the HTTP container when needed. Configuration sections are passed to their respective clients.

## Docker

Run `bun install` first to generate `bun.lock`, which the Dockerfile uses for reproducible installs.

```sh
docker build -t typescript-app .
docker run --rm -p 3000:3000 --mount type=bind,src="$(pwd)/config.yaml",dst=/app/config.yaml,readonly typescript-app
```

Inside Docker, use reachable service hostnames instead of `localhost` for external databases.