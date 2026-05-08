# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SupportDesk** is a microservices-based customer support ticketing system. Four Node.js/Express backend services communicate over HTTP, backed by MongoDB Atlas (separate database per service). A React/Vite frontend is served by Nginx, which also acts as an API proxy to the backend services.

## Development Commands

### Docker Compose (recommended)

```bash
# Development (hot-reload via volume mounts, ports 3000-3004)
docker-compose -f docker-compose.dev.yml up --build

# Testing (ephemeral tmpfs DB, ports 4000-4004)
docker-compose -f docker-compose.test.yml up --build

# Production (port 80, restart:always, persistent DB volume)
docker-compose -f docker-compose.prod.yml up --build -d

# Tear down and remove volumes
docker-compose -f docker-compose.dev.yml down -v
```

### Local (without Docker)

Each service uses `nodemon` for dev; run in separate terminals:

```bash
cd ticket-service && npm install && npm run dev       # :3001
cd support-service && npm install && npm run dev      # :3002
cd notification-service && npm install && npm run dev # :3003
cd reporting-service && npm install && npm run dev    # :3004
cd frontend && npm install && npm run dev              # :3000
```

Requires MongoDB running locally on `localhost:27017`.

### Kubernetes

```bash
# Apply all manifests (namespace first)
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmaps.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployments.yaml
kubectl apply -f k8s/services.yaml

# Access
kubectl port-forward svc/frontend 3000:80 -n support-system
kubectl get pods -n support-system
```

Docker images are published under `malakmohannad32/` on Docker Hub.

## Architecture

### Service Map

| Service              | Port | MongoDB DB         | Description                        |
|----------------------|------|--------------------|------------------------------------|
| auth-service         | 3005 | authDB             | Login, signup, JWT issuance        |
| ticket-service       | 3001 | ticketsDB          | CRUD for tickets                   |
| support-service      | 3002 | supportDB          | Assignments, replies, resolution   |
| notification-service | 3003 | notificationsDB    | Logs notification events           |
| reporting-service    | 3004 | none (stateless)   | Aggregates data from ticket-service|
| frontend             | 3000/80 | —               | React SPA served via Nginx         |

### Inter-Service Communication

All services communicate via direct HTTP calls using `axios`. Service URLs are injected via environment variables (`TICKET_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`).

- **support-service** calls **ticket-service** to update ticket state (status, agent, replies) and calls **notification-service** for all events.
- **ticket-service** calls **notification-service** on ticket creation and updates.
- **reporting-service** calls **ticket-service** to fetch all tickets for aggregation — it has no own database.
- **frontend** never calls backend services directly. Nginx proxies `/api/tickets-svc/` → `:3001`, `/api/support-svc/` → `:3002`, `/api/notifications-svc/` → `:3003`, `/api/reports-svc/` → `:3004`.

### Frontend API Proxy

The Vite dev server does **not** configure a proxy — the Nginx proxy in `frontend/nginx.conf` is only active in the Docker/production build. For local frontend dev (outside Docker), you must either configure a Vite proxy or run all services locally and adjust the base URLs in `App.jsx`.

The three constants in `frontend/src/App.jsx` that control API routing:

```js
const TICKET_SERVICE = '/api/tickets-svc'
const SUPPORT_SERVICE = '/api/support-svc'
const REPORT_SERVICE  = '/api/reports-svc'
```

### Data Model Notes

- **ticket-service** is the source of truth for ticket state. The `Ticket` document embeds `replies[]` and tracks `agent`, `status` (`open` | `in_progress` | `resolved`).
- **support-service** also stores `Assignment` and `Reply` documents in its own DB, then mirrors reply data into ticket-service by fetching the ticket and re-PUTting the full `replies` array.
- **notification-service** is append-only — it logs every event action as a `Notification` document.

### Environment Variables

Each service reads from `process.env` with localhost fallbacks:

| Variable                  | Used by                          |
|---------------------------|----------------------------------|
| `MONGO_URI`               | ticket, support, notification    |
| `NOTIFICATION_SERVICE_URL`| ticket, support                  |
| `TICKET_SERVICE_URL`      | support, reporting               |
| `PORT`                    | all services                     |

In Docker Compose, these are set inline in the compose files. In Kubernetes, `PORT` and service URLs come from ConfigMaps (`k8s/configmaps.yaml`); `MONGO_URI` comes from Secrets (`k8s/secrets.yaml`).

## Key Files

- `frontend/nginx.conf` — API proxy rules; must be updated when adding new services
- `k8s/configmaps.yaml` — non-secret env vars for K8s deployments
- `k8s/secrets.yaml` — MongoDB Atlas URIs (base64-encoded)
- `docker-compose.dev.yml` — hardcodes MongoDB Atlas URIs for dev (includes credentials)
