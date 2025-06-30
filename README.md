# elonmusksucks.net 🐍

A satirical, community-driven prediction market where users bet fake currency on what Elon Musk will do next.

Built as an NPM workspaces monorepo with:

- **Frontend:** Vite + React + TypeScript + TailwindCSS  
- **Backend:** Express + TypeScript + Prisma ORM  
- **Database:** PostgreSQL  
- **Shared Types:** `@ems/types` package (auto-generated from Prisma schema)  
- **AI/ML:** GPT-powered “Elon AI” tweet generator (planned)  

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
├── package.json    # root—workspaces & top-level scripts
├── tsconfig.json   # root—shared compilerOptions & path mappings
└── README.md       # ← you are here
```

---

## ⚙️ Prerequisites

- **Node.js** ≥ 18.x & **npm** ≥ 8.x (workspaces support)  
- **PostgreSQL** installed & running locally  
- (Optional) Docker, Redis, Mailhog, etc.

---

## 🔧 Quick Start

1. **Clone & cd**  
   ```bash
   git clone https://github.com/vincentDevin/elonmusksucks.git
   cd elonmusksucks
   ```

2. **Environment**  
   Copy and populate your env file at the repo root:
   ```bash
   cp .env.example .env
   ```
   Edit **.env** with your credentials. At minimum you’ll need:
   ```dotenv
   # ─── DATABASE ───────────────────────
   DATABASE_URL="postgresql://<user>:<pass>@localhost:5432/<db>?schema=public"

   # ─── APP CONFIG ────────────────────
   CLIENT_URL="http://localhost:3000"
   PORT=5000

   # ─── AUTH / JWT SECRETS ────────────
   ACCESS_TOKEN_SECRET=<random-string>
   REFRESH_TOKEN_SECRET=<another-random-string>

   # ─── EMAIL / SENDGRID ──────────────
   SENDGRID_API_KEY=SG.xxxxxxxx
   EMAIL_FROM="no-reply@elonmusksucks.net"

   # ─── DEV FLAGS ─────────────────────
   SKIP_EMAIL_FLOW=true
   ```

3. **Install & Bootstrap**  
   All in one:
   ```bash
   npm run setup
   ```
   This will:
   - Install dependencies in all workspaces  
   - Apply & reset Prisma migrations  
   - Generate Prisma Client into `packages/types`  
   - Build shared types  
   - Seed dev data  

4. **Run Locally**  
   ```bash
   npm run dev
   ```
   - **Frontend:** http://localhost:3000  
   - **Backend:**  http://localhost:5000  

   Both servers restart on file changes.

---

## 📦 Available Scripts

### At the **root**:

| Command                   | What it does                                   |
|---------------------------|------------------------------------------------|
| `npm run dev`             | Starts client & server concurrently            |
| `npm run setup`           | Installs, migrates, generates types & seeds    |
| `npm run build`           | Builds shared types, then client & server      |
| `npm run lint`            | Runs ESLint across all `apps/`                 |
| `npm run format`          | Runs Prettier across all `apps/`               |

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

- **Env vars not loading?**  
  - Ensure your **.env** is at the monorepo root.  
  - Check `dotenv.config({ path: '../../.env' })` in `apps/server/src/index.ts`.

- **Database errors?**  
  - Verify Postgres is running: `psql -h localhost -U <user> -d <db>`.  
  - Try dropping & re-migrating:  
    ```bash
    npm run prisma:migrate:dev
    ```

- **CORS issues?**  
  - Make sure `CLIENT_URL` matches your Vite dev server in `.env`.

---

## 🚀 Roadmap & Contributing

See the bottom of this README (or [our project board](#)) for upcoming features and where to find “good first issues.” We welcome PRs, bug reports, and all the meme-driven chaos you can bring!  

---

## 📜 License

MIT — see [LICENSE](./LICENSE).  
Fork it, have fun, don’t sue us if Elon buys the site.
