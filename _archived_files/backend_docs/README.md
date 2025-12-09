# Backend Implementation Guide

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

**Required Configuration:**

- `DATABASE_*` - MySQL connection details
- `JWT_SECRET` - Secure random string (min 32 chars)
- `SMTP_*` - Email configuration for alerts (optional)

### 3. Setup MySQL Database

Create database and user:

```sql
CREATE DATABASE pos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'pos_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON pos_db.* TO 'pos_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Run Migrations

```bash
npm run migrate
```

### 5. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── env.ts       # Environment validation
│   │   ├── database.ts  # MySQL connection pool
│   │   ├── jwt.ts       # JWT configuration
│   │   └── logger.ts    # Pino logger setup
│   │
│   ├── middlewares/      # Fastify middlewares
│   │   ├── auth.ts      # JWT authentication
│   │   ├── rbac.ts      # Role-based access control
│   │   ├── clientValidation.ts
│   │   └── errorHandler.ts
│   │
│   ├── services/         # Business logic services
│   │   └── AlertService.ts
│   │
│   ├── database/
│   │   ├── migrations/   # SQL migration files
│   │   └── migrator.ts   # Migration runner
│   │
│   └── server.ts         # Main application entry
│
├── .env.example          # Environment template
├── package.json
└── tsconfig.json
```

## Current Implementation Status

### ✅ Completed

- [x] Project structure setup
- [x] Environment configuration with validation
- [x] MySQL connection pool with streaming
- [x] JWT authentication system
- [x] Middleware layer (auth, RBAC, error handling)
- [x] Logger with daily rotation (pino)
- [x] Email alert service
- [x] Database migration system
- [x] Initial schema (clients, branches, users, licenses, products, sync_queue)
- [x] Fastify server setup with plugins

### 🔄 Next Steps

1. **Auth Routes** - Login, refresh token, logout endpoints
2. **License Routes** - Activate, verify, deactivate
3. **Sync Routes** - Batch push/pull endpoints
4. **Entity Routes** - CRUD for products, invoices, customers, etc.
5. **WebSocket Server** - Real-time sync implementation
6. **Sync Service** - Conflict resolution logic
7. **Client-side Sync Engine** - Electron app integration

## API Endpoints (Planned)

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and revoke token

### License

- `POST /api/license/activate` - Activate license
- `POST /api/license/verify` - Verify license status
- `POST /api/license/deactivate` - Deactivate license

### Sync

- `POST /api/sync/batch-push` - Push changes (max 50 records)
- `GET /api/sync/pull-changes` - Pull changes since timestamp
- `POST /api/sync/resolve-conflict` - Manual conflict resolution

### Products

- `GET /api/products` - List products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Soft delete product

## Testing

### Health Check

```bash
curl http://localhost:3000/health
```

### Database Connection

```bash
npm run migrate
```

## Production Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
NODE_ENV=production npm start
```

### Using PM2

```bash
pm2 start dist/server.js --name pos-backend -i max
pm2 startup
pm2 save
```

## Security Notes

1. **JWT_SECRET** - Must be at least 32 characters
2. **Database Password** - Use strong password
3. **SMTP Credentials** - Keep secure, use app passwords
4. **CORS** - Configure allowed origins in production
5. **Rate Limiting** - Enabled by default (100 req/min)

## Monitoring

- Logs are stored in `logs/` directory
- Critical errors trigger email alerts to `ADMIN_EMAIL`
- Health endpoint: `GET /health`

## Next Implementation Phase

The next phase will implement:

1. Complete Auth system with bcrypt password hashing
2. License verification with offline grace period
3. WebSocket server for real-time sync
4. Batch sync endpoints with conflict resolution
5. Entity CRUD routes for all 30+ tables
