# 🎯 POS System Architecture - Fastify Backend + Electron Client

## 📊 Project Overview

This POS system has been transformed from a standalone Electron app to a **Client-Server Architecture** with:

- **Backend**: Fastify + MySQL (Self-hosted on VPS)
- **Client**: Electron Desktop App + IndexedDB
- **Sync**: Real-time WebSocket + Offline Queue
- **Auth**: JWT-based with offline grace period

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VPS Server (Backend)                     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Fastify Backend (Node.js + TypeScript)            │     │
│  │  - REST API (CRUD for 30+ entities)                │     │
│  │  - WebSocket Server (Real-time sync)               │     │
│  │  - JWT Authentication                               │     │
│  │  - License Management                               │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  MySQL 8.0                                          │     │
│  │  - Multi-tenant database                            │     │
│  │  - Sync metadata (server_updated_at, sync_version) │     │
│  │  - Connection pool (10 connections)                 │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS + WSS
                            │
┌─────────────────────────────────────────────────────────────┐
│              Electron Desktop Client (Multiple)              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  React + TypeScript Frontend                       │     │
│  │  - POS Interface                                    │     │
│  │  - Inventory Management                             │     │
│  │  - Reports & Analytics                              │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Sync Engine                                        │     │
│  │  - Real-time sync via WebSocket                     │     │
│  │  - Offline queue (auto-retry)                       │     │
│  │  - Conflict resolution (Last Write Wins)            │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  IndexedDB (Local Storage)                          │     │
│  │  - 30+ entity stores                                │     │
│  │  - Sync queue store                                 │     │
│  │  - Offline-first approach                           │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
masr-pos-pro-mai/
│
├── backend/                     # 🆕 NEW: Fastify Backend
│   ├── src/
│   │   ├── config/             # Configuration files
│   │   ├── middlewares/        # Auth, RBAC, Error handling
│   │   ├── routes/             # API endpoints
│   │   ├── services/           # Business logic
│   │   ├── database/           # Migrations & DB utilities
│   │   ├── websocket/          # WebSocket server (TODO)
│   │   └── server.ts           # Main entry point
│   ├── package.json
│   ├── .env.example
│   ├── README.md
│   ├── IMPLEMENTATION_GUIDE.md
│   └── STATUS.md               # Current implementation status
│
├── src/                        # Electron Client (Existing)
│   ├── infrastructure/         # 🔄 TO BE UPDATED
│   │   ├── database/          # IndexedDB (existing)
│   │   ├── http/              # 🆕 HTTP client (to be created)
│   │   └── sync/              # 🆕 Sync engine (to be created)
│   ├── pages/                 # React pages
│   ├── components/            # React components
│   ├── contexts/              # 🔄 AuthContext (to be updated)
│   └── ...
│
├── electron/                   # Electron Main Process
│   ├── main.ts
│   ├── preload.ts
│   └── handlers/              # IPC handlers
│
├── docs/                       # Documentation
│   ├── 00-overview.md
│   ├── 01-architecture.md
│   ├── 02-database-schema.md
│   ├── 03-sync-strategy.md
│   └── ...
│
└── package.json               # Electron app package
```

---

## ✅ Implementation Status

### Backend (40% Complete)

#### ✅ Phase 1 - Complete

- [x] Fastify server setup with TypeScript
- [x] MySQL schema with sync metadata
- [x] Migration system
- [x] JWT authentication (login, refresh, logout)
- [x] License management (activate, verify, deactivate)
- [x] Environment configuration
- [x] Error handling with email alerts
- [x] Rate limiting
- [x] Logger with daily rotation

#### 🔄 Phase 2 - In Progress (0%)

- [ ] Sync Service (batch processing, conflict resolution)
- [ ] Sync Routes (push, pull, resolve)
- [ ] WebSocket Server (real-time sync)
- [ ] Entity CRUD Routes (30+ files)

### Client (0% Updated)

#### 🔄 Phase 3 - Not Started

- [ ] HTTP Client Layer (Axios wrapper)
- [ ] WebSocket Client (connection manager)
- [ ] Sync Engine (orchestrator)
- [ ] SyncQueue (IndexedDB store)
- [ ] ChangeTracker
- [ ] ConflictResolver
- [ ] OnlineStatusMonitor
- [ ] Update AuthContext (use backend API)
- [ ] Update IndexedDBRepository (trigger sync)
- [ ] Sync UI (status indicator, settings page)

#### 🔄 Phase 4 - Not Started

- [ ] Backup Service (export/import)
- [ ] Auto-backup for premium plans
- [ ] Enhanced monitoring

---

## 🚀 Getting Started

### Backend Setup

1. **Install Dependencies**

   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment**

   ```bash
   cp .env.example .env
   # Edit .env with your MySQL credentials
   ```

3. **Setup MySQL**

   ```sql
   CREATE DATABASE pos_db;
   CREATE USER 'pos_user'@'localhost' IDENTIFIED BY 'password';
   GRANT ALL PRIVILEGES ON pos_db.* TO 'pos_user'@'localhost';
   ```

4. **Run Migrations**

   ```bash
   npm run migrate
   ```

5. **Start Server**
   ```bash
   npm run dev
   ```

### Client Setup (Unchanged)

```bash
# Install dependencies
npm install

# Run Electron app
npm run electron:dev
```

---

## 🔄 Sync Strategy

### Online Mode

```
User Action → IndexedDB (save) → Backend API (push) → MySQL
                                       ↓
                              WebSocket Broadcast
                                       ↓
                            Other Devices (pull) → IndexedDB
```

### Offline Mode

```
User Action → IndexedDB (save) → SyncQueue (store)
                                       ↓
                              Connection Restored
                                       ↓
                              SyncQueue Process → Backend API
```

### Conflict Resolution

- **Strategy**: Last Write Wins
- **Comparison**: `local_updated_at` vs `server_updated_at`
- **Action**: Newer timestamp wins, notify user if needed

---

## 📊 Database Schema

### Sync Metadata (All Tables)

```sql
server_updated_at TIMESTAMP     -- Last server update
sync_version INT                -- Version number
is_deleted BOOLEAN              -- Soft delete flag
```

### Key Tables

- `clients` - Multi-tenant support
- `branches` - Multi-branch per client
- `users` - Authentication with bcrypt
- `licenses` - License management
- `products` - Product inventory
- `invoices` - Sales transactions
- `sync_queue` - Failed sync operations
- ...30+ more entities

---

## 🔐 Security Features

- ✅ JWT authentication (access + refresh tokens)
- ✅ bcrypt password hashing
- ✅ Role-based access control (RBAC)
- ✅ Rate limiting (100 req/min)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Input validation (Zod)
- ✅ CORS configuration
- ✅ Error stack hidden in production

---

## 📝 API Endpoints

### Authentication

- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### License

- `POST /api/license/activate` - Activate
- `POST /api/license/verify` - Verify
- `POST /api/license/deactivate` - Deactivate
- `POST /api/license/generate` - Generate (admin)

### Sync (To Be Implemented)

- `POST /api/sync/batch-push` - Push changes
- `GET /api/sync/pull-changes` - Pull changes
- `POST /api/sync/resolve-conflict` - Resolve

### Entities (To Be Implemented)

- `GET/POST/PUT/DELETE /api/products`
- `GET/POST/PUT/DELETE /api/invoices`
- `GET/POST/PUT/DELETE /api/customers`
- ...30+ more endpoints

---

## 🎯 Next Steps

1. **Complete Phase 2 (Backend Sync System)**

   - Implement SyncService with conflict resolution
   - Create sync routes (push/pull)
   - Build WebSocket server for real-time
   - Generate CRUD routes for all entities

2. **Start Phase 3 (Client Integration)**

   - Create HTTP client layer
   - Build Sync Engine
   - Update AuthContext to use backend
   - Hook IndexedDB to trigger sync

3. **Testing**

   - Integration tests for sync
   - Offline/online scenarios
   - Conflict resolution
   - Load testing (100+ devices)

4. **Deployment**
   - Setup VPS (Ubuntu 22.04)
   - Configure Nginx reverse proxy
   - Setup SSL with Let's Encrypt
   - PM2 process manager
   - MySQL backup automation

---

## 📚 Documentation

See `backend/` folder for detailed documentation:

- **README.md** - Quick setup guide
- **IMPLEMENTATION_GUIDE.md** - Complete implementation details
- **STATUS.md** - Current status and progress

See `docs/` folder for system documentation:

- **00-overview.md** - System overview
- **01-architecture.md** - Architecture details
- **02-database-schema.md** - Database schema
- **03-sync-strategy.md** - Sync strategy with diagrams

---

## 🤝 Contributing

This is Phase 1 of the implementation. The foundation is solid and ready for:

- Phase 2: Sync system
- Phase 3: Client integration
- Phase 4: Advanced features

---

**Status**: Backend Phase 1 Complete ✅ (40%)  
**Next**: Sync System & Real-time WebSocket  
**Last Updated**: December 7, 2025
