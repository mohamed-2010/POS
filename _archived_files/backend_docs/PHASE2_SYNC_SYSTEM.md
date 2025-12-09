# Phase 2 Implementation - Sync System ✅

## ما تم إنجازه

### 1. SyncService (backend/src/services/SyncService.ts) ✅

**الميزات:**

- ✅ Batch processing بحد أقصى 50 سجل في المرة
- ✅ Conflict detection باستخدام timestamps (server_updated_at vs local_updated_at)
- ✅ Last Write Wins strategy - التحديث الأحدث يفوز
- ✅ MySQL streaming للجداول الكبيرة (invoices, invoice_items, products)
- ✅ Transaction support لضمان atomicity
- ✅ Soft delete support عبر is_deleted flag
- ✅ Sync version tracking لكل سجل

**الوظائف الرئيسية:**

```typescript
processBatch(); // دفع batch من التغييرات من client للسيرفر
pullChanges(); // سحب التغييرات من السيرفر منذ timestamp معين
resolveConflict(); // حل conflict بقبول نسخة معينة (server أو client)
getSyncStats(); // إحصائيات الـ sync (عدد السجلات، آخر sync، إلخ)
```

**الجداول المدعومة (30 جدول):**
products, product_categories, customers, suppliers, invoices, invoice_items, employees, shifts, cash_movements, payment_methods, deposit_sources, deposits, expense_categories, expense_items, warehouses, product_stock, purchases, purchase_items, sales_returns, purchase_returns, employee_advances, employee_deductions, whatsapp_accounts, whatsapp_messages, whatsapp_campaigns, restaurant_tables, halls, promotions, printers, payment_apps, settings

### 2. Sync Routes (backend/src/routes/sync.ts) ✅

**Endpoints:**

#### POST /api/sync/batch-push

دفع batch من التغييرات من client للسيرفر

```json
{
  "device_id": "laptop-123",
  "records": [
    {
      "table_name": "products",
      "record_id": "uuid-123",
      "data": { "name": "Product A", "price": 100 },
      "local_updated_at": "2025-12-07T10:30:00Z",
      "is_deleted": false
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "synced_count": 45,
  "conflicts": [
    {
      "table_name": "products",
      "record_id": "uuid-456",
      "local_data": {...},
      "server_data": {...},
      "local_updated_at": "2025-12-07T10:00:00Z",
      "server_updated_at": "2025-12-07T10:30:00Z"
    }
  ],
  "errors": []
}
```

#### GET /api/sync/pull-changes?since={timestamp}&tables={csv}

سحب التغييرات من السيرفر

```
GET /api/sync/pull-changes?since=2025-12-07T00:00:00Z&tables=products,invoices
```

**Response:**

```json
{
  "changes": [
    {
      "table_name": "products",
      "record_id": "uuid-789",
      "data": {...},
      "server_updated_at": "2025-12-07T11:00:00Z",
      "is_deleted": false
    }
  ],
  "has_more": false,
  "next_cursor": null
}
```

#### POST /api/sync/resolve-conflict

حل conflict بين نسخة client وserver

```json
{
  "table_name": "products",
  "record_id": "uuid-456",
  "resolution": "accept_client",
  "client_data": {...}
}
```

#### GET /api/sync/stats

إحصائيات الـ sync

```json
{
  "pending_queue_count": 12,
  "last_sync_at": "2025-12-07T12:00:00Z",
  "tables_stats": [
    { "table_name": "products", "record_count": 1250 },
    { "table_name": "invoices", "record_count": 8900 }
  ]
}
```

### 3. WebSocket Sync Server (backend/src/websocket/syncServer.ts) ✅

**الميزات:**

- ✅ Real-time synchronization عبر WebSocket
- ✅ Room-based architecture (client_id:branch_id)
- ✅ Super admin يشترك في client_id:\* لرؤية كل فروع العميل
- ✅ Heartbeat ping/pong كل 30 ثانية
- ✅ Auto-disconnect بعد 10 ثواني من عدم الرد
- ✅ Queue monitoring كل 5 ثواني لبث التغييرات
- ✅ Auto-cleanup للسجلات القديمة (>7 أيام) من sync_queue

**Connection:**

```javascript
const ws = new WebSocket(
  "ws://localhost:3000/ws?token=JWT_TOKEN&device_id=laptop-123"
);

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "sync") {
    // تحديث محلي بناءً على التغيير
    console.log(
      "New sync:",
      message.table_name,
      message.operation,
      message.data
    );
  }
};
```

**Messages:**

```typescript
// Ping/Pong
{ type: 'ping' }
{ type: 'pong' }

// Subscribe/Unsubscribe
{ type: 'subscribe', room: '1:2' }    // العميل 1، الفرع 2
{ type: 'unsubscribe', room: '1:2' }

// Sync message (من السيرفر فقط)
{
  type: 'sync',
  table_name: 'products',
  record_id: 'uuid-123',
  operation: 'update',
  data: {...},
  room: '1:2'
}
```

### 4. Type Declarations (backend/src/types/fastify.d.ts) ✅

تم إنشاء type declarations للـ Fastify لحل مشاكل TypeScript:

```typescript
declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: JWTAccessPayload;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}
```

### 5. Auth Decorator ✅

تم إضافة authenticate decorator للـ Fastify:

```typescript
server.decorate("authenticate", authMiddleware);

// الاستخدام في routes
server.post(
  "/protected",
  {
    preHandler: [server.authenticate],
  },
  handler
);
```

## Architecture Flow

### 1. Online Sync Flow

```
[Client Device A]
    ↓ (تغيير محلي)
    ↓ POST /api/sync/batch-push
[Backend Server]
    ↓ (حفظ في DB + sync_queue)
    ↓ WebSocket broadcast
[Client Device B] ← (تحديث real-time)
```

### 2. Offline → Online Flow

```
[Client Offline]
    ↓ (تغييرات محلية في IndexedDB)
    ↓ (حفظ في local sync queue)
[Client Online]
    ↓ POST /api/sync/batch-push (كل التغييرات المتراكمة)
[Backend Server]
    ↓ Conflict detection
    ↓ Last Write Wins
    ↓ WebSocket broadcast لباقي الأجهزة
```

### 3. Conflict Resolution Flow

```
[Client] POST /batch-push → [Server] (detect conflict)
    ↓ (return conflicts array)
[Client] (عرض للمستخدم)
    ↓ (اختيار النسخة)
[Client] POST /resolve-conflict → [Server]
    ↓ (accept_server أو accept_client)
[Server] (update DB + broadcast)
```

## Performance Optimizations

### 1. Batch Processing

- حد أقصى 50 سجل في batch واحد
- Transactions لضمان atomicity
- معالجة متوازية للسجلات المستقلة

### 2. Streaming Queries

- استخدام MySQL streaming للجداول الكبيرة
- تجنب تحميل آلاف السجلات في memory مرة واحدة
- مناسب للـ invoices مع items كثيرة

### 3. Queue Monitoring

- فحص كل 5 ثواني
- حد أقصى 100 سجل في المرة
- Auto-cleanup للسجلات القديمة

### 4. WebSocket Rooms

- كل فرع له room خاص
- broadcast فقط للأجهزة المهتمة
- تقليل network traffic

## Database Schema

### sync_queue Table

```sql
CREATE TABLE sync_queue (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  branch_id INT NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id VARCHAR(255) NOT NULL,
  operation ENUM('create', 'update', 'delete') NOT NULL,
  source_device_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  INDEX idx_pending (client_id, branch_id, processed_at),
  INDEX idx_cleanup (processed_at)
);
```

### Sync Metadata (في كل جدول)

```sql
server_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
sync_version INT DEFAULT 1
is_deleted BOOLEAN DEFAULT FALSE
```

## Security

### 1. Authentication

- JWT token مطلوب لكل sync endpoint
- WebSocket يتحقق من JWT في query string
- Auto-disconnect للـ tokens المنتهية

### 2. Authorization

- client_id و branch_id يتم التحقق منهم من JWT
- كل device يرى فقط بيانات client_id و branch_id الخاصة به
- Super admin يرى كل بيانات الـ client

### 3. Rate Limiting

- Sync endpoints مستثناة من rate limiting
- باقي endpoints محدودة بـ 100 request/minute

## Testing

### Test Sync Endpoints

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' | jq -r '.accessToken')

# 2. Push batch
curl -X POST http://localhost:3000/api/sync/batch-push \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "test-device",
    "records": [{
      "table_name": "products",
      "record_id": "test-123",
      "data": {"name": "Test Product", "price": 99.99},
      "local_updated_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
      "is_deleted": false
    }]
  }'

# 3. Pull changes
curl "http://localhost:3000/api/sync/pull-changes?since=2025-01-01T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN"

# 4. Get stats
curl http://localhost:3000/api/sync/stats \
  -H "Authorization: Bearer $TOKEN"
```

### Test WebSocket

```javascript
const token = "YOUR_JWT_TOKEN";
const ws = new WebSocket(
  `ws://localhost:3000/ws?token=${token}&device_id=test-123`
);

ws.onopen = () => {
  console.log("Connected");
  ws.send(JSON.stringify({ type: "ping" }));
};

ws.onmessage = (event) => {
  console.log("Message:", JSON.parse(event.data));
};
```

## Next Steps (Phase 3 - Client Integration)

### 1. FastifyClient (src/infrastructure/http/FastifyClient.ts)

- Axios wrapper مع JWT auto-refresh
- Request queuing عند offline
- Retry logic مع exponential backoff

### 2. WebSocketClient (src/infrastructure/http/WebSocketClient.ts)

- Auto-reconnect عند انقطاع الاتصال
- Message buffering
- Connection state management

### 3. SyncEngine (src/infrastructure/sync/SyncEngine.ts)

- Main orchestrator
- Online/Offline detection
- Auto-sync triggers
- Conflict resolution UI

### 4. SyncQueue (src/infrastructure/sync/SyncQueue.ts)

- IndexedDB store للعمليات الفاشلة
- Retry logic
- Priority queue

### 5. IndexedDB Integration

- Hook add/update/delete operations
- Auto-trigger sync عند online
- Track local_updated_at

## Status Summary

✅ **Phase 1: Backend Foundation** - 100% Complete
✅ **Phase 2: Sync System** - 100% Complete
⏳ **Phase 3: Client Integration** - 0% Started
⏳ **Phase 4: Entity CRUD Routes** - 0% Started (30+ routes needed)

## Known Issues

1. ⚠️ TypeScript warning في WebSocket initialization (logger type mismatch) - لا يؤثر على التشغيل
2. ⚠️ Entity CRUD routes لم يتم إنشاءها بعد - ضرورية لإدارة البيانات

## Performance Metrics (Expected)

- **Batch Sync**: ~100ms لكل 50 سجل
- **WebSocket Latency**: <50ms
- **Pull Changes**: ~200ms لكل 100 سجل
- **Streaming**: يدعم ملايين السجلات دون memory issues

## Deployment Notes

عند deployment على VPS:

```bash
# WebSocket يحتاج Nginx config خاص
location /ws {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

**Last Updated:** December 7, 2025
**Phase:** 2 of 4
**Progress:** 60% Overall (Backend)
