# 📦 ArchGen Microservices Suite

## 📖 Overview

This repository contains **four independent backend services** and a **frontend UI** that together implement the ArchGen platform.

- **api-gateway** – FastAPI reverse‑proxy that exposes a single entry point (`http://localhost:8080`).
- **auth-service** – Handles user registration, login, JWT issuance, and token validation.
- **project-service** – CRUD operations for project entities.
- **architecture-service** – Complex architecture‑related agents, Terraform helpers, etc.
- **archgen-frontend** – Next.js UI that consumes the gateway APIs.

All services are Docker‑ready and can be started individually or together using Docker Compose. The backend services share a single MongoDB instance and a common JWT secret.

---

## 🏛️ Architecture Diagram

```mermaid
graph TB
    classDef frontend fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff;
    classDef gateway fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff;
    classDef service fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff;
    classDef database fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff;

    subgraph Client Layer
        UI[Next.js Frontend UI<br/>Port 3000]:::frontend
    end

    subgraph API Gateway Layer
        GW[FastAPI API Gateway<br/>Port 8080]:::gateway
    end

    subgraph Microservices Layer
        AS[Auth Service<br/>Port 8001]:::service
        PS[Project Service<br/>Port 8002]:::service
        ARS[Architecture Service<br/>Port 8003]:::service
    end

    subgraph Data Layer
        DB[(MongoDB<br/>Port 27017)]:::database
    end

    UI -->|REST / JSON| GW
    GW -->|Route /auth| AS
    GW -->|Route /projects| PS
    GW -->|Route /architecture| ARS
    
    AS -->|Read / Write| DB
    PS -->|Read / Write| DB
    ARS -->|Read / Write| DB
```

*(GitHub natively renders the Mermaid diagram above. You do not need to manually generate an image file unless deploying documentation elsewhere.)*

---

## 🛠️ Prerequisites

| Tool | Minimum version |
|------|-----------------|
| Docker Engine | 24.0+ |
| Docker Compose (v2) | bundled with Docker |
| Node.js | 18 LTS (for the frontend) |
| Python | 3.12 |
| (Optional) Azure CLI | 2.60+ |

Make sure `docker` and `docker compose` are in your **PATH**.

---

## 🚀 Starting Services Locally

You can run each service **independently** (useful for debugging) or **all together** via Docker‑Compose.

### 1️⃣ Build Docker images (once)
```bash
# From the root of Migrated-Services
cd C:\Users\Admin\Desktop\Mono-Micro\Migrated-Services
docker compose build
```

### 2️⃣ Run services individually
#### a) MongoDB (required for all back‑ends)
```bash
docker run -d \
  --name mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=archgen_db \
  mongo:6.0
```
#### b) API Gateway
```bash
cd api-gateway
docker build -t api-gateway .
# The .env file already contains URLs pointing to the other services
docker run -d \
  --name api-gateway \
  -p 8080:8080 \
  --env-file .env \
  api-gateway
```
#### c) Auth Service
```bash
cd ..\auth-service
docker build -t auth-service .
docker run -d \
  --name auth-service \
  -p 8001:8001 \
  --env-file .env \
  auth-service
```
#### d) Project Service
```bash
cd ..\project-service
docker build -t project-service .
docker run -d \
  --name project-service \
  -p 8002:8002 \
  --env-file .env \
  project-service
```
#### e) Architecture Service
```bash
cd ..\architecture-service
docker build -t architecture-service .
docker run -d \
  --name architecture-service \
  -p 8003:8003 \
  --env-file .env \
  architecture-service
```
#### f) Frontend (Next.js)
```bash
cd ..\archgen-frontend
# Install dependencies (only needed the first time)
npm ci
# Build the Docker image
docker build -t archgen-frontend .
# Run container
docker run -d \
  --name archgen-frontend \
  -p 3000:3000 \
  --env-file .env \
  archgen-frontend
```

> **Tip:** All containers share a Docker network created automatically by Docker‑Compose. When running manually, you may need to add `--network <network-name>` so they can resolve each other by hostname (e.g., `mongo`).

---

## 📦 Run All Services with Docker‑Compose (recommended)
```bash
cd C:\Users\Admin\Desktop\Mono-Micro\Migrated-Services
# Build and start everything in the background
docker compose up --build -d
```
The stack includes:
- `mongo` – MongoDB on port **27017**
- `api-gateway` – Port **8080**
- `auth-service` – Port **8001** (internal only, not exposed externally)
- `project-service` – Port **8002** (internal only)
- `architecture-service` – Port **8003** (internal only)
- `archgen-frontend` – Port **3000** (UI)

### Stopping the stack
```bash
docker compose down   # stops containers
docker compose down -v   # also removes the persistent MongoDB volume
```

---

## 🧪 Testing the Services
### 1️⃣ Health checks
```bash
# API Gateway health (Swagger UI also available at http://localhost:8080/docs)
c -zv localhost 8080 && echo "Gateway OK"
# MongoDB
nc -zv localhost 27017 && echo "Mongo OK"
```
### 2️⃣ Auth Service (via Gateway)
```bash
# Register a test user
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"Pass123!","email":"test@example.com"}'

# Login and capture tokens
TOKEN=$(curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"Pass123!"}' | jq -r '.access_token')

# Access a protected endpoint (e.g., /auth/me)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/auth/me
```
### 3️⃣ Project Service (via Gateway)
```bash
# Assuming you have a valid JWT token stored in $TOKEN
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/projects
```
### 4️⃣ Architecture Service (via Gateway)
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/architecture/status
```
### 5️⃣ Frontend UI
Open a browser and navigate to **http://localhost:3000**. The UI will automatically call the gateway APIs using the `NEXT_PUBLIC_API_URL` environment variable.

---

## 📂 Folder Structure (root of Migrated-Services)
```
Migrated-Services/
├─ api-gateway/
│   ├─ Dockerfile
│   ├─ .env
│   └─ src …
├─ auth-service/
│   ├─ Dockerfile
│   ├─ .env
│   └─ src …
├─ project-service/
│   ├─ Dockerfile
│   ├─ .env
│   └─ src …
├─ architecture-service/
│   ├─ Dockerfile
│   ├─ .env
│   └─ src …
├─ archgen-frontend/
│   ├─ Dockerfile
│   ├─ .env
│   └─ (Next.js app)
├─ docker-compose.yml
├─ README.md   ← **this file**
└─ arch-diagram.png   ← generated from the Mermaid diagram (optional)
```

---

## 🔐 Environment Variables (summary)
| Service | Variable | Example | Description |
|---------|----------|---------|-------------|
| api‑gateway | `GATEWAY_PORT` | `8080` | Port the gateway listens on |
| | `PRODUCTION_ORIGIN` | `https://api.example.com` | Used for CORS & token validation |
| | `AUTH_SERVICE_URL` | `http://auth-service:8001` | Internal URL (Docker network) |
| | `PROJECT_SERVICE_URL` | `http://project-service:8002` | |
| | `ARCHITECTURE_SERVICE_URL` | `http://architecture-service:8003` | |
| | `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Dev CORS origins |
| auth‑service / project‑service / architecture‑service | `MONGO_URI` | `mongodb://mongo:27017` | MongoDB connection string |
| | `DATABASE_NAME` | `archgen_db` | Database name |
| | `JWT_SECRET_KEY` | `super_secret_key_change_me` | Symmetric key for signing JWTs |
| | `JWT_ALGORITHM` | `HS256` | Algorithm used for JWTs |
| | `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime |
| | `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| archgen‑frontend | `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Base URL the UI uses to call the gateway |

---

## ☁️ Deploying to Azure (Container Apps) – High‑level steps
1. **Create an Azure Container Registry** and push each Docker image (`docker push <acr>.azurecr.io/<service>:latest`).
2. **Create a Container Apps environment** (`az containerapp env create`).
3. **Deploy each service** with `az containerapp create`, supplying the environment variables from the corresponding `.env` (set them as *Application Settings* in the portal). Use the internal Azure DNS name (`mongo`, `auth-service`, etc.) for inter‑service URLs.
4. **Deploy the Next.js frontend** to an Azure Web App for Containers or Azure Static Web Apps (set `NEXT_PUBLIC_API_URL` to the public URL of the gateway). 
5. **Enable CORS** on the gateway to allow the frontend domain.

Full Azure scripts are available in the original monolith under the `infra/` folder; you can adapt them to the new container‑app resources.

---

## 🧹 Clean‑up
```bash
# Stop Docker‑Compose stack
docker compose down -v   # also removes MongoDB volume

# Remove images (optional)
docker image prune -a -f
```

---

**Happy hacking!**
Feel free to open issues or pull requests on the individual GitHub repositories.
