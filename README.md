# elonmusksucks.net 🐍

A satirical, community-driven prediction market where users bet MuskBucks (fake currency) on what Elon Musk will do next.

**Tech stack:**  
- **Frontend:** Vite + React + TypeScript + TailwindCSS  
- **Backend:** Express + TypeScript + Prisma ORM  
- **Database:** PostgreSQL  
- **WebSockets:** Socket.IO (live updates for bets, predictions, etc.)  
- **Background Jobs:** Redis (payouts, leaderboards)  
- **User Uploads:** Tigris (profile images)  
- **Shared Types:** `@ems/types` (auto-generated from Prisma schema)  
- **AI/ML:** GPT-powered “Elon AI” tweet generator (planned)

---

## 📂 Monorepo Layout

```
elonmusksucks/
├── apps/
│   ├── client/     # Vite + React frontend
│   └── server/     # Express + TS backend, Socket.IO, Redis
├── packages/
│   └── types/      # Shared TS types & Prisma client
├── prisma/         # Prisma schema & migrations
├── .env            # ← all env vars, root of repo
├── .env.test       # ← test env vars
├── package.json    # root—workspaces & scripts
├── tsconfig.json   # root—shared config & paths
└── README.md       # ← you are here
```

---

## ⚙️ Prerequisites

- **Node.js** ≥ 24.x & **npm** ≥ 8.x (for workspaces)
- **PostgreSQL** (running locally)
- **Redis** (running locally for jobs & events)
- **dotenv-cli** (`npm i -g dotenv-cli`)

---

## 🔧 Quick Start

1. **Clone & cd**

   ```bash
   git clone https://github.com/vincentDevin/elonmusksucks.git
   cd elonmusksucks
   ```

2. **Environment**  
   Copy example files and fill in your values:

   ```bash
   cp .env.example .env
   cp .env.test.example .env.test
   ```

   Edit `.env` and `.env.test` as needed.

3. **Install & Bootstrap**

   ```bash
   npm run setup
   ```

   This will:
   - Install dependencies in all workspaces
   - Apply/reset Prisma migrations
   - Generate Prisma client/types in `packages/types`
   - Build types, seed dev data

4. **Run Locally**

   ```bash
   npm run dev
   ```

   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Backend:**  [http://localhost:5000](http://localhost:5000)

   *Note: You must have PostgreSQL and Redis running locally, and access to Tigris for file uploads.*

---

## 🧪 Testing

Run all Jest tests in the monorepo:

```bash
npm test
```

Run backend-only tests:

```bash
npm run test:server
```

- Unit tests live in `apps/server/tests/unit/`
- Integration tests require `.env.test` and spin up a separate DB

---

## 💥 Real-time/Refactor Notes

- **Websockets:** Live predictions, bets, and parlays update instantly across all clients via Socket.IO
- **Redis:** Used for offloading long-running payouts, leaderboard processing, and event fanout
- **Tigris:** Used for scalable profile image uploads
- **All bets and state changes are now event-driven** (no more manual refresh hell)
- **No more cache hell:** The client always uses up-to-date event data, not stale local state

**IMPORTANT:**  
A full end-to-end sanity check of the recent refactor is still pending. If you hit a bug or edge case, please open an issue!

---

## 📦 Scripts

| Command               | Description                                 |
| --------------------- | ------------------------------------------- |
| `npm run dev`         | Starts client & server concurrently         |
| `npm run setup`       | Installs deps, migrates DB, seeds, builds   |
| `npm run build`       | Builds types, client, and server            |
| `npm run lint`        | Lints all code                              |
| `npm run format`      | Prettier across all code                    |
| `npm test`            | All Jest tests                              |
| `npm run test:server` | Server-only Jest tests                      |

See each workspace for more:

- **apps/client:**  
  - `npm run dev`, `npm run build`, `npm run preview`

- **apps/server:**  
  - `npm run dev`, `npm run build`, `npm run start`, `npm run prisma:generate`, `npm run prisma:migrate:dev`, `npm run seed:dev`

---

## 🐞 Troubleshooting

- **Env vars not loading?**  
  Make sure `.env` and `.env.test` are at the repo root.

- **Database errors?**  
  Check that Postgres is running and your DB is created.

- **Redis not connecting?**  
  Make sure Redis is running locally (`redis-server`), or update your connection string in `.env`.

- **Tigris upload errors?**  
  Verify Tigris credentials in your `.env` are correct.

- **Node version?**  
  Use Node ≥24. You can enforce this with `.nvmrc` or in `package.json`.

---

## 🚀 Roadmap & Contributing

See our [project board](https://github.com/vincentDevin/elonmusksucks/projects/1) for features & issues. PRs, memes, and bug reports welcome.

---

## 📜 License

MIT — see [LICENSE](./LICENSE).  
No liability if Elon tries to buy, short, or DDoS the site.
