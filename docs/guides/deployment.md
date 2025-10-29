# Fly.io Deployment Guide

## Local Docker Build & Deploy Process

Since we're building on macOS and deploying to Fly.io (linux/amd64), we use Docker Buildx to cross-compile.

### Prerequisites

- Docker Desktop running
- Authenticated with Fly.io: `fly auth login`
- Authenticated with Fly registry: `fly auth docker`

---

## Server (ems-api)

### Build
```bash
docker buildx build --platform linux/amd64 \
  -t registry.fly.io/ems-api:latest \
  -f apps/server/Dockerfile . \
  --load
```

### Push
```bash
docker push registry.fly.io/ems-api:latest
```

### Deploy
```bash
fly deploy --app ems-api --image registry.fly.io/ems-api:latest
```

### One-liner (Build + Push + Deploy)
```bash
docker buildx build --platform linux/amd64 -t registry.fly.io/ems-api:latest -f apps/server/Dockerfile . --load && \
docker push registry.fly.io/ems-api:latest && \
fly deploy --app ems-api --image registry.fly.io/ems-api:latest
```

---

## Client (ems-client)

### Build
```bash
docker buildx build --platform linux/amd64 \
  -t registry.fly.io/ems-client:latest \
  -f apps/client/Dockerfile . \
  --load
```

### Push
```bash
docker push registry.fly.io/ems-client:latest
```

### Deploy
```bash
fly deploy --app ems-client --image registry.fly.io/ems-client:latest
```

### One-liner (Build + Push + Deploy)
```bash
docker buildx build --platform linux/amd64 -t registry.fly.io/ems-client:latest -f apps/client/Dockerfile . --load && \
docker push registry.fly.io/ems-client:latest && \
fly deploy --app ems-client --image registry.fly.io/ems-client:latest
```

---

## Public Site (ems-public)

### Build
```bash
docker buildx build --platform linux/amd64 \
  -t registry.fly.io/ems-public:latest \
  -f apps/public-site/Dockerfile . \
  --load
```

### Push
```bash
docker push registry.fly.io/ems-public:latest
```

### Deploy
```bash
fly deploy --app ems-public --image registry.fly.io/ems-public:latest
```

### One-liner (Build + Push + Deploy)
```bash
docker buildx build --platform linux/amd64 -t registry.fly.io/ems-public:latest -f apps/public-site/Dockerfile . --load && \
docker push registry.fly.io/ems-public:latest && \
fly deploy --app ems-public --image registry.fly.io/ems-public:latest
```

---

## Pong Server (ems-pong)

### Build
```bash
docker buildx build --platform linux/amd64 \
  -t registry.fly.io/ems-pong:latest \
  -f apps/pong-server/Dockerfile . \
  --load
```

### Push
```bash
docker push registry.fly.io/ems-pong:latest
```

### Deploy
```bash
fly deploy --app ems-pong --image registry.fly.io/ems-pong:latest
```

### One-liner (Build + Push + Deploy)
```bash
docker buildx build --platform linux/amd64 -t registry.fly.io/ems-pong:latest -f apps/pong-server/Dockerfile . --load && \
docker push registry.fly.io/ems-pong:latest && \
fly deploy --app ems-pong --image registry.fly.io/ems-pong:latest
```

---

## Troubleshooting

### Docker daemon not running
```bash
# Start Docker Desktop application
open -a Docker
```

### Not authenticated with Fly registry
```bash
fly auth docker
```

### Check deployment status
```bash
fly status --app <app-name>
```

### View logs
```bash
fly logs --app <app-name>
```

### SSH into running instance
```bash
fly ssh console --app <app-name>
```

---

## Notes

- **Always use `--platform linux/amd64`** - Fly.io runs on linux/amd64, not macOS ARM
- **`--load`** flag loads the image into local Docker (required before push)
- **Build from project root** - All Dockerfiles expect to be run from monorepo root
- **Remote builds not supported** - Our setup requires local Docker builds with buildx

---

## WebSocket & Socket.IO Configuration

### Critical: Sticky Sessions

**The ems-api server uses Socket.IO for real-time events and MUST have sticky sessions enabled.**

Without sticky sessions on multi-instance deployments:
- Clients connect to different server instances on each request
- Duplicate socket connections and room joins
- Events fire multiple times
- Connection state inconsistency

**Sticky Session Configuration** (already in `apps/server/fly.toml`):
```toml
[http_service]
  # ... other config ...

  # CRITICAL: Connection-based sticky sessions for WebSocket
  [http_service.concurrency]
    type = "connections"
    hard_limit = 1000
    soft_limit = 800
```

### How It Works

1. **First Request**: Client connects to any available ems-api instance
2. **Session Affinity**: Fly.io load balancer routes all subsequent requests from that client to the same instance
3. **WebSocket Upgrade**: Connection upgrades to WebSocket on the same instance
4. **Persistence**: All Socket.IO events stay on the same server instance

### Scaling Considerations

When scaling ems-api to multiple instances:
- **Redis Adapter**: Already configured for cross-instance event broadcasting
- **Sticky Sessions**: Ensures client stays on same instance
- **Connection Tracking**: Server deduplicates connections per user
- **Graceful Shutdown**: Connections migrate on instance restart

### Monitoring WebSocket Connections

Check active connections on a running instance:
```bash
fly ssh console --app ems-api
# Inside the container
curl http://localhost:5000/health
```

View real-time logs for connection debugging:
```bash
fly logs --app ems-api | grep socket
```

### Troubleshooting

**Issue**: Duplicate events or connections
- **Check**: Sticky sessions enabled in fly.toml
- **Check**: Multiple browser tabs/windows (expected behavior)
- **Check**: Server logs for "duplicate-connection" events

**Issue**: Connections failing to establish
- **Check**: CORS origins configured correctly
- **Check**: JWT token valid and passed in socket.auth
- **Check**: Network allows WebSocket (wss://) connections

**Issue**: Frequent disconnects/reconnects
- **Check**: Network stability
- **Check**: Heartbeat configuration (15s ping, 10s timeout)
- **Check**: Client reconnection config (max 10 attempts with backoff)
