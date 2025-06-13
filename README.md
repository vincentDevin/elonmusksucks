# elonmusksucks.net 🐍

A satirical, community-driven prediction market where users bet fake currency on what Elon Musk will do next.

Built with a modern monorepo stack using Vite + React (client), Express + Prisma (server), and PostgreSQL (database). Features real-time interactions, public leaderboards, and a GPT-powered "Elon AI" that competes in the chaos by auto-generating parody tweets.

---

## 📦 Tech Stack

- **Frontend:** Vite + React + TypeScript + TailwindCSS
- **Backend:** Express + TypeScript + Prisma ORM
- **Database:** PostgreSQL
- **Realtime:** WebSockets (planned)
- **AI/ML:** GPT-based "Elon AI" tweet generator (planned)
- **Infrastructure:** NPM Workspaces monorepo + Prisma ORM

---

## 🧱 Folder Structure

```
elonmusksucks/
├── apps/
│   ├── client/         # Vite + React frontend
│   └── server/         # Express + Prisma backend
├── prisma/             # Prisma schema and migration files
├── node_modules/       # Monorepo dependencies
├── .vscode/            # VS Code workspace settings
├── .gitignore
├── eslint.config.js    # Flat ESLint config for all packages
├── tsconfig.json       # Shared TypeScript config
├── .prettierrc         # Prettier config
└── README.md
```

---

## 🔧 Scripts

From the **project root**:

```bash
npm run dev         # Starts both frontend and backend dev servers
npm run lint        # Runs ESLint across all apps
npm run format      # Formats codebase with Prettier
```


From within `apps/client` or `apps/server`:

```bash
npm run dev         # Run frontend or backend separately
```

## 🚀 Local Development Setup

### 🛠 Prerequisites

- **Node.js** ≥ 18.x & **npm** ≥ 8.x (with workspace support)  
- **PostgreSQL** installed & running locally (e.g., via Homebrew or Postgres.app)  
- (Optional) Any other services you use (Redis, Mailhog, etc.)

### 1. Clone & cd in

```bash
git clone https://github.com/vincentDevin/elonmusksucks.git
cd elonmusksucks
```

### 2. Environment Variables

1. Copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your local Postgres credentials:

   ```dotenv
   # ─── DATABASE ──────────────────────────────
   PGHOST=localhost
   PGPORT=5432
   PGUSER=<your_db_user>
   PGPASSWORD=<your_db_pass>
   PGDATABASE=<your_db_name>

   # Prisma connection string (auto-built, but overrideable):
   DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}?schema=public"

   # ─── APP / AUTH ────────────────────────────
   CLIENT_URL="http://localhost:3000"
   ACCESS_TOKEN_SECRET=local-dev-key
   REFRESH_TOKEN_SECRET=local-dev-key-refresh
   EMAIL_FROM="no-reply@example.com"

   # ─── DEV-ONLY FLAGS ────────────────────────
   SKIP_EMAIL_FLOW=true   # bypasses email verification & resets
   ```

### 3. Install Dependencies

From the **project root**:

```bash
npm install
```

This uses workspaces to install both client and server dependencies.

### 4. Database Setup & Migrations

1. (If needed) Create your database:

   ```bash
   createdb <your_db_name>
   ```

2. Apply migrations and generate Prisma client:

   ```bash
   cd apps/server
   npx prisma migrate reset --force --skip-generate
   npx prisma generate
   ```

### 5. (Optional) Seed Dev Data

To seed a pre-verified developer user (e.g. `dev@local` / `password123`):

```bash
npx ts-node --transpile-only prisma/seed.ts
```

### 6. Start Development Servers

Back at the repo root:

```bash
cd ../..
npm run dev
```

- **Client**: http://localhost:5173  
- **API**:    http://localhost:3000  

### 🐞 Troubleshooting

- **CORS Errors**  
  Ensure `FRONTEND_URL` in your `.env` matches your client port (e.g., `http://localhost:5173`).

- **Database Connection Issues**  
  Verify Postgres is running on the port in your `.env` and that your user/db exist.

- **Migration Failures**  
  Try dropping the DB manually (`dropdb <your_db_name>`) and rerun `npx prisma migrate reset`.

---

---

## 🚧 Features Roadmap

### ✅ Infrastructure

- [x] **Monorepo Setup:** Structured with NPM workspaces for easy scaling and separation of concerns.
- [x] **PostgreSQL + Prisma:** Strongly typed DB models and migrations, ready for production.
- [x] **ESLint + Prettier + Flat Config:** Unified linting and auto-formatting across packages.

### 🎰 Prediction Market Core

- [ ] **Create Predictions:** Users can post predictions about Elon-related events (e.g. "Will Elon tweet about aliens this week?").
- [ ] **Bet MuskBucks™:** Use site currency to wager on prediction outcomes (Over/Under, Yes/No).
- [ ] **Dynamic Odds:** Odds are automatically adjusted based on user voting and activity.
- [ ] **Payout System:** Winning users are awarded more MuskBucks and rise on the leaderboard.

### 📈 Real-Time Features

- [ ] **Live Leaderboard:** Displays the top predictors by MuskBucks net worth.
- [ ] **WebSocket Integration:** Real-time updates for predictions, AI tweets, and leaderboard changes.
- [ ] **Real-Time Feed:** See predictions come in live — both user-generated and AI-generated.

### 🤖 Elon AI

- [ ] **Tweet Oracle:** GPT-powered Elon AI trained on Elon's real tweets, generates parody posts at realistic intervals.
- [ ] **Parlay Mode:** Users can wager on whether the Elon AI or Real Elon will tweet something first.
- [ ] **AI vs Human Prediction Outcomes:** Compete with AI-generated predictions.

### 🧑‍🚀 User Features

- [ ] **Authentication:** Register/log in to place predictions and track bets.
- [ ] **Profile & Avatar System:** See your stats, prediction history, and favorite AI tweets.
- [ ] **Bet History & Stats:** View your predictions, win rate, losses, MuskBucks balance.

### 🛠 Admin Tools

- [ ] **Admin Dashboard:** Moderate predictions, users, and review flagged content.
- [ ] **Report System:** Let users flag offensive predictions or misbehavior.
- [ ] **Feature Flags & Tuning:** Toggle features like parlay mode or AI difficulty level.

---

## 🤖 Want to Help?

This project is satire. No real currency is involved, no real stock predictions are offered, and **no actual Elons were harmed** in the making of this code.

If you're interested in building chaotic fun on the internet, fork the repo and open a PR. Meme energy welcome.

---

## 📜 License

**MIT License** — Do what you want, just don’t sue us if Elon buys the site out of spite.

# Security Policy

This project is for entertainment and parody purposes only.

## Reporting Issues
Please email [admin@elonmusksucks.net] with details of any vulnerabilities.

**Note:** No real transactions or personal data should ever be submitted to this platform.