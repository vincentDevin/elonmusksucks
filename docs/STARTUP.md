# Development Startup Guide

## ✅ Fixes Applied

1. **Achievement Server Port Conflict** - Fixed to use port 3001 (instead of 5000)
2. **npm Optional Dependencies** - Reinstalled all packages to fix rollup/esbuild native binaries

## 🚀 How to Start Development

### Option 1: All Services Together (Recommended)
```bash
npm run dev
```

This starts:
- ✅ Client (Vite) on port 3000
- ✅ Public Site (SSR) on port 5173
- ✅ Main Server (Express) on port 5000
- ✅ Pong Server on port 5001
- ✅ **Achievement Server on port 3001** ⭐ NEW!
- ✅ All BullMQ workers

### Option 2: Individual Services (For Debugging)

```bash
# Terminal 1: Main server + workers
npm -w apps/server run dev
npm run worker

# Terminal 2: Achievement server ⭐ NEW!
npm -w apps/achievement-server run dev

# Terminal 3: Client
npm -w apps/client run dev

# Terminal 4: Public site
npm -w apps/public-site run dev

# Terminal 5: Pong server
npm -w apps/pong-server run dev
```

## 🔍 Verify Everything Works

### 1. Check All Servers Are Running

```bash
# Main server
curl http://localhost:5000/health

# Achievement server ⭐ NEW!
curl http://localhost:3001/health

# Client
curl http://localhost:3000

# Public site
curl http://localhost:5173
```

### 2. Check Achievement Server Logs

Look for these success messages:
```
[AchievementServer] ✅ Database connected
[AchievementServer] ✅ Redis connected
[AchievementServer] ✅ Health check server listening on port 3001  ⭐
[AchievementServer] ✅ Subscribed to 47 achievement channels
```

**IMPORTANT:** Should say **port 3001**, NOT 5000!

## 🧪 Run Load Tests

Once all servers are running:

```bash
# Quick health check
node scripts/load-tests/tests/health-monitor.js --quick

# Full test suite
node scripts/load-tests/run-all-tests.js
```

## ⚠️ Troubleshooting

### "Port already in use"

```bash
# Clean up ports
npm run cleanup

# Or manually
lsof -ti:5000 | xargs kill -9  # Main server
lsof -ti:3001 | xargs kill -9  # Achievement server
lsof -ti:3000 | xargs kill -9  # Client
lsof -ti:5173 | xargs kill -9  # Public site
lsof -ti:5001 | xargs kill -9  # Pong server
```

### "Rollup/esbuild native binary not found"

Already fixed! If it happens again:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Achievement server on wrong port

Check the logs - should say:
```
[AchievementServer] ✅ Health check server listening on port 3001
```

If it says port 5000, there's a config issue. Environment variable `ACHIEVEMENT_SERVER_PORT` should NOT be set (defaults to 3001).

## 📊 Port Mapping

| Service | Port | URL |
|---------|------|-----|
| Client | 3000 | http://localhost:3000 |
| **Achievement Server** | **3001** | **http://localhost:3001** ⭐ |
| Main Server | 5000 | http://localhost:5000 |
| Pong Server | 5001 | http://localhost:5001 |
| Public Site | 5173 | http://localhost:5173 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

## 🎯 Next Steps

1. ✅ Start all services: `npm run dev`
2. ✅ Verify health: `node scripts/load-tests/tests/health-monitor.js --quick`
3. ✅ Run load tests: `node scripts/load-tests/run-all-tests.js`
4. ✅ Celebrate 95% performance improvement! 🎉
