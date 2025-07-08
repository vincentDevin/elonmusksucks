# elonmusksucks.net 🐍

A satirical, community-driven prediction market where users bet fake currency on what Elon Musk will do next.

Built as an NPM workspaces monorepo with:

* **Frontend:** Vite + React + TypeScript + TailwindCSS
* **Backend:** Express + TypeScript + Prisma ORM
* **Database:** PostgreSQL
* **Shared Types:** `@ems/types` package (auto-generated from Prisma schema)
* **AI/ML:** GPT-powered “Elon AI” tweet generator (planned)

---

## 📂 Repository Layout

```
elonmusksucks/
├── apps/
│   ├── client/     # Vite + React frontend
│   └── server/     # Express + TypeScript backend
├── packages/
│   └── types/      # Shared TS types & Prisma client
├── prisma/         # Prisma schema & migrations
├── .env            # ← single env for whole monorepo
├── .env.test       # ← test environment variables
├── package.json    # root—workspaces & top-level scripts
├── tsconfig.json   # root—shared compilerOptions & path mappings
└── README.md       # ← you are here
```

---

## ⚙️ Prerequisites

* **Node.js** ≥ 24.x & **npm** ≥ 8.x (workspaces support)
* **PostgreSQL** installed & running locally
* **dotenv-cli** (for loading .env files)

---

## 🔧 Quick Start

1. **Clone & cd**

   ```bash
   git clone https://github.com/vincentDevin/elonmusksucks.git
   cd elonmusksucks
   ```

2. **Environment**
   Copy and populate your env files at the repo root:

   ```bash
   cp .env.example .env
   cp .env.test.example .env.test
   ```

   Edit **.env** with your dev credentials and **.env.test** with your test database URL.

3. **Install & Bootstrap**
   All in one:

   ```bash
   npm run setup
   ```

   This will:

   * Install dependencies in all workspaces
   * Apply & reset Prisma migrations
   * Generate Prisma Client into `packages/types`
   * Build shared types
   * Seed dev data

4. **Run Locally**

   ```bash
   npm run dev
   ```

   * **Frontend:** [http://localhost:3000](http://localhost:3000)
   * **Backend:**  [http://localhost:5000](http://localhost:5000)

   Both servers restart on file changes.

---

## 🧪 Testing

### Unit Tests

Run all Jest tests across the monorepo:

```bash
npm test
```

Run **only backend** tests:

```bash
npm run test:server
```

* **Unit** tests live under `apps/server/tests/unit/` and cover business logic in services and controllers.

### Integration Tests

Integration tests spin up the test database defined in `.env.test` and exercise HTTP endpoints.

```bash
npm run test:server
```

Ensure **.env.test** contains:

```dotenv
DATABASE_URL="postgresql://<user>:<pass>@localhost:5432/ems_test_db?schema=public"
```

---

## 📦 Available Scripts

### At the **root**:

| Command               | What it does                                |
| --------------------- | ------------------------------------------- |
| `npm run dev`         | Starts client & server concurrently         |
| `npm run setup`       | Installs, migrates, generates types & seeds |
| `npm run build`       | Builds shared types, then client & server   |
| `npm run lint`        | Runs ESLint across all code                 |
| `npm run format`      | Runs Prettier across all code               |
| `npm test`            | Runs all Jest tests                         |
| `npm run test:server` | Runs server Jest tests                      |

### In **apps/client**:

```bash
npm run dev     # Vite dev server
npm run build   # Output to client/dist
npm run preview # Preview the production build
```

### In **apps/server**:

```bash
npm run dev              # nodemon + ts-node
npm run build            # tsc → dist/
npm run start            # node dist/index.js
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate:dev  # Reset & migrate DB
npm run seed:dev         # Seed dev data
```

---

## 🐞 Troubleshooting

* **Env vars not loading?**
  Ensure **.env** and **.env.test** are at the monorepo root.

* **Database errors?**
  Verify Postgres is running and `ems_test_db` exists for tests:

  ```bash
  psql -h localhost -U <user> -d ems_test_db
  ```

  Then re-run migrations:

  ```bash
  npm run prisma:migrate:dev
  ```

* **Node version warnings?**
  Use Node ≥24. You can pin via an `.nvmrc` containing `24.x` or add:

  ```json
  "engines": {"node": ">=24.0.0"},
  "engineStrict": true
  ```

---

## 🚀 Roadmap & Contributing

See our project board for upcoming features and “good first issues.” We welcome PRs, bug reports, and all the meme-driven chaos you can bring!

---

## 📜 License

MIT — see [LICENSE](./LICENSE).
Fork it, have fun, don’t sue us if Elon buys the site.
