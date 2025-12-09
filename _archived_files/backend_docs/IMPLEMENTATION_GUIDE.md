# 🚀 Backend Implementation - Complete Setup Guide

## ✅ Completed Phase 1

The following components have been successfully implemented:

### 1. Project Structure ✅

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts              ✅ Environment validation
│   │   ├── database.ts         ✅ MySQL connection pool
│   │   ├── jwt.ts              ✅ JWT configuration
│   │   └── logger.ts           ✅ Pino logger
│   │
│   ├── middlewares/
│   │   ├── auth.ts             ✅ JWT authentication
│   │   ├── rbac.ts             ✅ Role-based access
│   │   ├── clientValidation.ts ✅ Client/branch validation
│   │   └── errorHandler.ts     ✅ Global error handler
│   │
│   ├── services/
│   │   └── AlertService.ts     ✅ Email alerts
│   │
│   ├── routes/
│   │   ├── auth.ts             ✅ Login, refresh, logout
│   │   └── license.ts          ✅ License management
│   │
│   ├── database/
│   │   ├── migrations/
│   │   │   └── 001_initial_schema.sql ✅ Complete schema
│   │   └── migrator.ts         ✅ Migration runner
│   │
│   └── server.ts               ✅ Fastify server
│
├── package.json                ✅
├── tsconfig.json               ✅
├── .env.example                ✅
└── README.md                   ✅
```

### 2. Database Schema ✅

Complete MySQL schema with sync metadata:

- ✅ `clients` - Multi-tenant support
- ✅ `branches` - Multi-branch per client
- ✅ `users` - User accounts with roles
- ✅ `refresh_tokens` - JWT refresh tokens
- ✅ `roles` - Role-based permissions
- ✅ `licenses` - License management with grace period
- ✅ `product_categories` - Product categorization
- ✅ `products` - Product inventory
- ✅ `sync_queue` - Failed sync operations queue
- ✅ All tables include: `server_updated_at`, `sync_version`, `is_deleted`

### 3. Authentication System ✅

- ✅ `/api/auth/login` - Username/password authentication
- ✅ `/api/auth/refresh` - JWT token refresh
- ✅ `/api/auth/logout` - Revoke refresh token
- ✅ bcrypt password hashing
- ✅ JWT with access (15min) and refresh (7days) tokens
- ✅ Role-based permissions from database

### 4. License System ✅

- ✅ `/api/license/activate` - Activate license on device
- ✅ `/api/license/verify` - Verify license validity
- ✅ `/api/license/deactivate` - Deactivate license
- ✅ `/api/license/generate` - Generate new license (admin only)
- ✅ Offline grace period (7 days configurable)
- ✅ Device binding support
- ✅ Expiration date checking
- ✅ Email alerts for license events

---

## 📋 Setup Instructions

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=pos_user
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=pos_db

# JWT (IMPORTANT: Change this!)
JWT_SECRET=your_very_secure_jwt_secret_minimum_32_characters_long

# Server
PORT=3000
NODE_ENV=development

# Email (Optional but recommended)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
ADMIN_EMAIL=admin@yourcompany.com
```

### Step 3: Setup MySQL Database

```sql
CREATE DATABASE pos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pos_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON pos_db.* TO 'pos_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 4: Run Migrations

```bash
npm run migrate
```

Expected output:

```
✅ MySQL connection established successfully
🔄 Running migration: 001_initial_schema
✅ Migration 001_initial_schema completed
✅ All migrations completed successfully
```

### Step 5: Start Development Server

```bash
npm run dev
```

Server should start on `http://localhost:3000`

### Step 6: Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2025-12-07T...",
  "uptime": 1.234
}
```

---

## 🧪 Testing API Endpoints

### 1. Create Test User (Manual SQL)

```sql
-- Insert test client
INSERT INTO clients (id, name, email, subscription_status)
VALUES ('test-client-id', 'Test Company', 'test@example.com', 'active');

-- Insert test branch
INSERT INTO branches (id, client_id, name, is_main)
VALUES ('test-branch-id', 'test-client-id', 'Main Branch', TRUE);

-- Insert test user (password: password123)
INSERT INTO users (id, client_id, branch_id, username, password_hash, full_name, role, is_active)
VALUES (
  'test-user-id',
  'test-client-id',
  'test-branch-id',
  'testuser',
  '$2b$10$YourHashedPasswordHere',
  'Test User',
  'admin',
  TRUE
);
```

Generate password hash:

```bash
node -e "console.log(require('bcrypt').hashSync('password123', 10))"
```

### 2. Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 3. Test License Activation

```bash
curl -X POST http://localhost:3000/api/license/activate \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "XXXX-XXXX-XXXX-XXXX-XXXX",
    "deviceId": "device-123",
    "clientId": "test-client-id"
  }'
```

---

## 🔄 Next Implementation Steps

### Phase 2: Sync System (In Progress)

#### Step 1: Sync Service

Create `src/services/SyncService.ts`:

- Batch processing (50 records max)
- Conflict detection using `server_updated_at` vs `local_updated_at`
- Last Write Wins strategy
- Transaction support for atomic updates

#### Step 2: Sync Routes

Create `src/routes/sync.ts`:

- `POST /api/sync/batch-push` - Push changes from client
- `GET /api/sync/pull-changes?since={timestamp}&entity={type}`
- `POST /api/sync/resolve-conflict` - Manual conflict resolution

#### Step 3: WebSocket Server

Create `src/websocket/syncServer.ts`:

- Real-time broadcast to devices in same room
- Room format: `client_id:branch_id`
- Super admin room: `client_id:*`
- Heartbeat ping/pong every 30s

#### Step 4: Entity Routes (30+ files needed)

Create CRUD routes for:

- Products, Invoices, InvoiceItems
- Customers, Suppliers, Employees
- Shifts, CashMovements, PaymentMethods
- Categories, Units, PriceTypes
- And 20+ more entities...

### Phase 3: Client-Side Integration

#### Step 1: HTTP Client

Create `src/infrastructure/http/`:

- `FastifyClient.ts` - Axios wrapper
- `WebSocketClient.ts` - WS connection manager
- API wrappers for each entity

#### Step 2: Sync Engine

Create `src/infrastructure/sync/`:

- `SyncEngine.ts` - Main orchestrator
- `SyncQueue.ts` - IndexedDB queue
- `ChangeTracker.ts` - Track local changes
- `ConflictResolver.ts` - Handle conflicts
- `OnlineStatusMonitor.ts` - Network monitoring

#### Step 3: Integration

- Update `IndexedDBRepository` to trigger sync
- Add Sync UI in Settings page
- Add sync status indicator in header

---

## 📊 Database Performance Tips

### Indexes

The schema includes optimized indexes:

- Client/branch filtering
- server_updated_at for incremental sync
- Barcode/SKU for product lookup

### Connection Pooling

Current settings (adjust based on load):

```typescript
connectionLimit: 10; // Max 10 concurrent connections
```

For high load:

```typescript
connectionLimit: 20;
queueLimit: 50;
```

### Query Optimization

Use prepared statements (already implemented):

```typescript
await query("SELECT * FROM products WHERE client_id = ?", [clientId]);
```

---

## 🔒 Security Checklist

- [x] JWT secret is 32+ characters
- [x] Passwords hashed with bcrypt
- [x] CORS configured
- [x] Rate limiting enabled (100 req/min)
- [x] SQL injection prevention (parameterized queries)
- [x] Input validation with Zod
- [x] Error stack hidden in production
- [ ] HTTPS in production (via Nginx)
- [ ] Database credentials secured
- [ ] Environment variables not committed

---

## 🚀 Production Deployment

### VPS Setup (Ubuntu 22.04)

1. **Install Dependencies**

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MySQL 8
sudo apt install -y mysql-server

# Nginx
sudo apt install -y nginx

# PM2
sudo npm install -g pm2
```

2. **Clone & Build**

```bash
git clone your-repo
cd backend
npm install
npm run build
```

3. **Environment**

```bash
cp .env.example .env
nano .env  # Update production values
```

4. **Run Migrations**

```bash
npm run migrate
```

5. **Start with PM2**

```bash
pm2 start dist/server.js --name pos-backend -i max
pm2 startup
pm2 save
```

6. **Nginx Configuration**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

7. **SSL with Let's Encrypt**

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 📞 Support & Issues

For any issues or questions:

1. Check logs: `logs/app-YYYY-MM-DD.log`
2. Check MySQL connectivity: `npm run migrate`
3. Verify environment: `.env` file properly configured
4. Review error emails (if configured)

---

## 📈 Monitoring

- **Logs**: Daily rotation in `logs/` directory
- **Health Check**: `GET /health`
- **Email Alerts**: Critical errors sent to `ADMIN_EMAIL`
- **PM2 Monitoring**: `pm2 monit`

---

**Status**: Phase 1 Complete ✅
**Next**: Sync System Implementation & WebSocket Server
