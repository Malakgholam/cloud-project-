# SupportDesk — Customer Support Ticketing System

A production-ready microservices-based Customer Support Ticketing System built with Node.js, Express, MongoDB, React, Docker, and Kubernetes.

---

## 📁 Project Structure

```
cloud/
├── ticket-service/          # CRUD operations for tickets
│   ├── index.js
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── support-service/         # Assign agents, replies, resolve tickets
│   ├── index.js
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── notification-service/    # Logs notifications for ticket events
│   ├── index.js
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── reporting-service/       # Generates analytics reports
│   ├── index.js
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── frontend/                # React (Vite) UI
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── nginx.conf
│   ├── package.json
│   ├── Dockerfile
│   └── .dockerignore
├── k8s/                     # Kubernetes manifests
│   ├── mongodb.yaml
│   ├── ticket-service.yaml
│   ├── support-service.yaml
│   ├── notification-service.yaml
│   ├── reporting-service.yaml
│   └── frontend.yaml
├── docker-compose.dev.yml   # Development environment
├── docker-compose.test.yml  # Testing environment
├── docker-compose.prod.yml  # Production environment
├── .gitignore
└── README.md
```

---

## 🧩 Architecture

| Service              | Port | Description                              |
|----------------------|------|------------------------------------------|
| Ticket Service       | 3001 | Create, update, retrieve tickets         |
| Support Service      | 3002 | Assign agents, add replies, resolve      |
| Notification Service | 3003 | Log notifications on ticket events       |
| Reporting Service    | 3004 | Generate analytics & reports             |
| Frontend             | 3000 | React UI (served via Nginx in Docker)    |
| MongoDB              | 27017| Shared database with separate databases  |

### Communication Flow

```
Frontend → Ticket Service   (Create/View tickets)
Frontend → Support Service  (Assign/Reply/Resolve)
Frontend → Reporting Service (Get reports)

Support Service → Ticket Service        (Update ticket data)
Support Service → Notification Service  (Trigger notifications)
Ticket Service  → Notification Service  (Trigger notifications)
Reporting Service → Ticket Service      (Fetch ticket data for reports)
```

---

## 🚀 Getting Started

### Prerequisites

- **Docker** & **Docker Compose** installed
- **Node.js 18+** (for local development without Docker)
- **kubectl** & **Minikube/Kind** (for Kubernetes deployment)

---

### Option 1: Run with Docker Compose (Recommended)

#### Development Environment
```bash
docker-compose -f docker-compose.dev.yml up --build
```
- Frontend: http://localhost:3000
- Ticket API: http://localhost:3001/tickets
- Support API: http://localhost:3002/support
- Notifications API: http://localhost:3003/notifications
- Reports API: http://localhost:3004/reports/summary
- Hot-reload enabled via volume mounts

#### Testing Environment
```bash
docker-compose -f docker-compose.test.yml up --build
```
- Uses ephemeral DB (tmpfs — data is lost on stop)
- Frontend: http://localhost:4000
- APIs on ports 4001-4004

#### Production Environment
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```
- Frontend: http://localhost (port 80)
- Logging set to `error` level only
- Persistent MongoDB volume
- `restart: always` for all services

#### Stop & Clean Up
```bash
docker-compose -f docker-compose.dev.yml down -v
```

---

### Option 2: Run Locally Without Docker

1. **Start MongoDB** (must be running on `localhost:27017`)

2. **Start each service** (in separate terminals):
```bash
cd ticket-service && npm install && npm run dev
cd support-service && npm install && npm run dev
cd notification-service && npm install && npm run dev
cd reporting-service && npm install && npm run dev
```

3. **Start the frontend**:
```bash
cd frontend && npm install && npm run dev
```

4. Open http://localhost:3000

---

### Option 3: Deploy to Kubernetes

1. **Build and tag Docker images**:
```bash
docker build -t supportdesk/ticket-service:latest ./ticket-service
docker build -t supportdesk/support-service:latest ./support-service
docker build -t supportdesk/notification-service:latest ./notification-service
docker build -t supportdesk/reporting-service:latest ./reporting-service
docker build -t supportdesk/frontend:latest ./frontend
```

2. **If using Minikube**, load images into Minikube:
```bash
minikube image load supportdesk/ticket-service:latest
minikube image load supportdesk/support-service:latest
minikube image load supportdesk/notification-service:latest
minikube image load supportdesk/reporting-service:latest
minikube image load supportdesk/frontend:latest
```

3. **Apply Kubernetes manifests**:
```bash
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/ticket-service.yaml
kubectl apply -f k8s/support-service.yaml
kubectl apply -f k8s/notification-service.yaml
kubectl apply -f k8s/reporting-service.yaml
kubectl apply -f k8s/frontend.yaml
```

4. **Access the Frontend**:
```bash
# If using Minikube:
minikube service frontend

# Or use port-forward:
kubectl port-forward svc/frontend 3000:80
```
Then open http://localhost:3000

5. **Check status**:
```bash
kubectl get pods
kubectl get services
```

---

## 🔌 API Endpoints

### Ticket Service (port 3001)
| Method | Endpoint         | Description       |
|--------|------------------|-------------------|
| GET    | /tickets         | Get all tickets   |
| GET    | /tickets/:id     | Get ticket by ID  |
| POST   | /tickets         | Create ticket     |
| PUT    | /tickets/:id     | Update ticket     |

### Support Service (port 3002)
| Method | Endpoint                    | Description            |
|--------|-----------------------------|------------------------|
| POST   | /support/assign             | Assign ticket to agent |
| POST   | /support/reply              | Add reply to ticket    |
| PUT    | /support/resolve/:ticketId  | Mark as resolved       |
| GET    | /support/assignment/:ticketId | Get assignment       |
| GET    | /support/replies/:ticketId  | Get replies            |

### Notification Service (port 3003)
| Method | Endpoint                   | Description                |
|--------|----------------------------|----------------------------|
| POST   | /notify                    | Receive notification event |
| GET    | /notifications             | Get all notifications      |
| GET    | /notifications/:ticketId   | Get by ticket ID           |

### Reporting Service (port 3004)
| Method | Endpoint            | Description                  |
|--------|---------------------|------------------------------|
| GET    | /reports/summary    | Full report with all metrics |
| GET    | /reports/by-status  | Open vs Closed breakdown     |
| GET    | /reports/by-agent   | Tickets per agent            |

---

## 🧪 Environment Differences

| Setting          | Development       | Testing           | Production       |
|------------------|-------------------|-------------------|------------------|
| NODE_ENV         | development       | testing           | production       |
| LOG_LEVEL        | debug             | warn              | error            |
| Volume Mounts    | ✅ (hot-reload)   | ❌                | ❌               |
| DB Persistence   | Volume            | tmpfs (ephemeral) | Volume           |
| Restart Policy   | unless-stopped    | (none)            | always           |
| Frontend Port    | 3000              | 4000              | 80               |

---

## 📝 License

MIT
