# Repository Guidelines

## Project Structure & Module Organization
The repository is an npm workspace with app-focused packages under `apps/` and shared code in `packages/`. `apps/client` is the React front end, `apps/public-site` powers static marketing pages, and `apps/server`, `apps/pong-server`, and `apps/achievement-server` expose the API and background workers. Shared TypeScript contracts live in `packages/types` (build artifacts go to `packages/types/dist`). Database schemas and seeds are under `prisma/`, while reusable scripts sit in `scripts/` and documentation in `docs/`.

## Build, Test, and Development Commands
Run `npm run setup` after cloning to install dependencies, generate Prisma types, and seed a dev database. `npm run dev` starts the full stack (client, public site, servers, and workers); use `npm run dev --workspace=apps/client` when iterating on a single app. `npm run build` generates shared types, then builds the client and API bundles. `npm run cleanup` frees ports if concurrent dev sessions fail. Keep linting and formatting clean with `npm run lint` and `npm run format`.

## Coding Style & Naming Conventions
The codebase is TypeScript-first with Prettier formatting (2-space indent, single quotes) and ESLint enforcing React and import rules. Prefer `camelCase` for variables/functions, `PascalCase` for React components, and `kebab-case` for file names in `apps/client/src`. Co-locate component styles and tests beside the implementation when practical.

## Testing Guidelines
Jest drives unit and integration coverage. `npm test` runs the full suite; narrow to backend assertions with `npm run test:server`. Client-side utilities live in `apps/client/src/utils/formatting.test.ts`, while API tests are split into `apps/server/tests/unit` and `apps/server/tests/integration`. Name new specs `*.test.ts` and isolate external calls with test doubles or Testcontainers. Keep deterministic seeds by resetting Prisma with `npm run prisma:migrate:dev` before database-sensitive tests.

## Commit & Pull Request Guidelines
Recent history favors concise, explanatory commit subjects written in sentence case (e.g., “Fixed lobby connection and clean up issues”). Group related changes per commit and reference issue IDs where available. Pull requests should summarize behavior changes, list relevant commands run, and attach screenshots or logs for UI or Ops-facing alterations. Note any schema updates and link to the migration or seed command used.

## Environment & Data Setup
Copy environment templates (`cp .env.example .env`) before running services. Regenerate Prisma client code with `npm run prisma:generate` after schema edits, and rebuild shared types using `cd packages/types && npm run build`. Redis dependencies are provisioned via `fly-redis`; keep connection strings in `.env`. Use `npm run seed:dev` to load baseline data and `npm run cleanup` before switching between local/remote Redis targets.
