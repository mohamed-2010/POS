# 📡 API Reference

## API Architecture

```mermaid
graph TB
    subgraph "Client Apps"
        ADMIN[Admin App]
        CLIENT[Client App]
        MOBILE[Mobile App]
    end
    
    subgraph "Supabase"
        subgraph "REST API"
            POSTGREST[PostgREST]
        end
        
        subgraph "Realtime"
            WS[WebSocket]
        end
        
        subgraph "Auth"
            AUTH_API[Auth API]
        end
        
        subgraph "Edge Functions"
            FUNC[Custom Functions]
        end
        
        subgraph "Storage"
            STORAGE_API[Storage API]
        end
    end
    
    ADMIN --> POSTGREST
    ADMIN --> AUTH_API
    ADMIN --> FUNC
    
    CLIENT --> POSTGREST
    CLIENT --> WS
    CLIENT --> AUTH_API
    CLIENT --> STORAGE_API
    
    MOBILE --> POSTGREST
    MOBILE --> WS
    MOBILE --> AUTH_API
```

---

## Authentication APIs

### Sign Up
```mermaid
sequenceDiagram
    participant APP as Application
    participant AUTH as Supabase Auth
    participant DB as Database
    
    APP->>AUTH: POST /auth/v1/signup
    Note right of APP: {email, password, metadata}
    
    AUTH->>AUTH: Validate credentials
    AUTH->>DB: Create user record
    AUTH->>AUTH: Send verification email
    
    AUTH-->>APP: 200 OK
    Note left of AUTH: {user, session}
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "data": {
    "name": "محمد أحمد",
    "phone": "01234567890"
  }
}
```

### Sign In
```mermaid
sequenceDiagram
    participant APP as Application
    participant AUTH as Supabase Auth
    
    APP->>AUTH: POST /auth/v1/token?grant_type=password
    Note right of APP: {email, password}
    
    AUTH->>AUTH: Validate credentials
    AUTH->>AUTH: Generate tokens
    
    AUTH-->>APP: 200 OK
    Note left of AUTH: {access_token, refresh_token, user}
```

### Refresh Token
```mermaid
sequenceDiagram
    participant APP as Application
    participant AUTH as Supabase Auth
    
    APP->>AUTH: POST /auth/v1/token?grant_type=refresh_token
    Note right of APP: {refresh_token}
    
    AUTH->>AUTH: Validate refresh token
    AUTH->>AUTH: Generate new tokens
    
    AUTH-->>APP: 200 OK
    Note left of AUTH: {access_token, refresh_token}
```

---

## Admin APIs

### Clients

#### List Clients
```
GET /rest/v1/clients
?select=*,subscriptions(*),branches(count)
&order=created_at.desc
&limit=20
&offset=0
```

#### Get Client Details
```
GET /rest/v1/clients
?id=eq.{client_id}
&select=*,
  subscriptions(*,plans(*)),
  branches(*),
  devices(*),
  client_users(*)
```

#### Create Client
```mermaid
sequenceDiagram
    participant ADMIN as Admin
    participant API as API
    participant DB as Database
    participant AUTH as Auth
    
    ADMIN->>API: POST /rest/v1/clients
    API->>DB: Insert client
    
    API->>AUTH: Create owner user
    AUTH-->>API: User created
    
    API->>DB: Create default branch
    API->>DB: Link owner to client
    
    API-->>ADMIN: 201 Created
```

**Request:**
```json
{
  "name_ar": "محلات أحمد",
  "email": "ahmed@example.com",
  "phone": "01234567890",
  "branches_mode": "shared",
  "sync_mode": "auto"
}
```

#### Update Client Status
```
PATCH /rest/v1/clients?id=eq.{client_id}
```
```json
{
  "status": "suspended"
}
```

---

### Plans

#### List Plans
```
GET /rest/v1/plans
?select=*,plan_features(features(*))
&is_active=eq.true
&order=display_order
```

#### Create Plan
```
POST /rest/v1/plans
```
```json
{
  "name_ar": "الباقة الأساسية",
  "name_en": "Basic Plan",
  "price_monthly": 199,
  "price_yearly": 1999,
  "max_devices": 1,
  "max_branches": 1,
  "max_users": 5,
  "trial_days": 14
}
```

#### Update Plan Features
```mermaid
sequenceDiagram
    participant ADMIN as Admin
    participant API as API
    participant DB as Database
    
    ADMIN->>API: DELETE /rest/v1/plan_features?plan_id=eq.{id}
    API->>DB: Remove old features
    
    ADMIN->>API: POST /rest/v1/plan_features
    Note right of ADMIN: Array of features
    API->>DB: Insert new features
    
    API-->>ADMIN: 201 Created
```

---

### Subscriptions

#### Create Subscription
```
POST /rest/v1/subscriptions
```
```json
{
  "client_id": "uuid",
  "plan_id": "uuid",
  "status": "trial",
  "trial_start_date": "2025-12-01",
  "trial_end_date": "2025-12-15",
  "billing_cycle": "monthly"
}
```

#### Activate Subscription
```mermaid
sequenceDiagram
    participant ADMIN as Admin
    participant FUNC as Edge Function
    participant DB as Database
    participant NOTIF as Notifications
    
    ADMIN->>FUNC: POST /functions/v1/activate-subscription
    Note right of ADMIN: {subscription_id, payment_info}
    
    FUNC->>DB: Update subscription status
    FUNC->>DB: Record payment
    FUNC->>NOTIF: Send confirmation
    
    FUNC-->>ADMIN: 200 OK
```

---

### Devices

#### List Pending Devices
```
GET /rest/v1/devices
?status=eq.pending
&select=*,clients(name_ar),branches(name_ar)
&order=created_at.desc
```

#### Approve Device
```
PATCH /rest/v1/devices?id=eq.{device_id}
```
```json
{
  "status": "approved",
  "change_approved_by": "admin_user_id",
  "change_approved_at": "2025-12-01T10:00:00Z"
}
```

---

## Client APIs

### Products

#### List Products (with sync)
```
GET /rest/v1/products
?client_id=eq.{client_id}
&or=(branch_id.is.null,branch_id.eq.{branch_id})
&is_deleted=eq.false
&server_updated_at=gt.{last_sync_timestamp}
&select=*,categories(name_ar),inventory!inner(quantity)
```

#### Upsert Product (sync)
```mermaid
sequenceDiagram
    participant APP as Client App
    participant API as API
    participant DB as Database
    
    APP->>API: POST /rest/v1/products
    Note right of APP: {upsert: true, on_conflict: sync_id}
    
    API->>DB: Check existing by sync_id
    
    alt New record
        DB->>DB: Insert
    else Existing record
        DB->>DB: Compare timestamps
        alt Local newer
            DB->>DB: Update
        else Server newer
            Note over DB: Keep server version
        end
    end
    
    API-->>APP: 200/201
```

**Request:**
```json
{
  "sync_id": "uuid",
  "client_id": "uuid",
  "branch_id": "uuid",
  "name_ar": "منتج جديد",
  "barcode": "123456789",
  "sell_price": 100,
  "sync_status": "synced",
  "local_updated_at": "2025-12-01T10:00:00Z"
}
```

---

### Invoices

#### Create Invoice (with items)
```mermaid
sequenceDiagram
    participant APP as Client App
    participant FUNC as Edge Function
    participant DB as Database
    
    APP->>FUNC: POST /functions/v1/create-invoice
    Note right of APP: {invoice, items[]}
    
    FUNC->>DB: Begin transaction
    FUNC->>DB: Insert invoice
    FUNC->>DB: Insert invoice_items
    FUNC->>DB: Update inventory
    FUNC->>DB: Commit transaction
    
    FUNC-->>APP: 201 Created
    Note left of FUNC: {invoice_id, invoice_number}
```

**Request:**
```json
{
  "invoice": {
    "sync_id": "uuid",
    "client_id": "uuid",
    "branch_id": "uuid",
    "customer_id": "uuid",
    "subtotal": 500,
    "discount_amount": 50,
    "tax_amount": 45,
    "total": 495,
    "paid_amount": 500,
    "payment_method": "cash"
  },
  "items": [
    {
      "product_id": "uuid",
      "product_name": "منتج 1",
      "quantity": 2,
      "unit_price": 100,
      "total": 200
    }
  ]
}
```

#### Get Invoices (paginated)
```
GET /rest/v1/invoices
?client_id=eq.{client_id}
&branch_id=eq.{branch_id}
&invoice_date=gte.{start_date}
&invoice_date=lte.{end_date}
&select=*,customers(name),invoice_items(*)
&order=invoice_date.desc
&limit=50
&offset=0
```

---

### Sync APIs

#### Push Changes (Batch)
```mermaid
sequenceDiagram
    participant APP as Client App
    participant FUNC as Edge Function
    participant DB as Database
    
    APP->>FUNC: POST /functions/v1/sync-push
    Note right of APP: {changes: [{table, operation, data}]}
    
    loop Each change
        FUNC->>DB: Apply change
        FUNC->>FUNC: Check conflicts
    end
    
    FUNC-->>APP: 200 OK
    Note left of FUNC: {results: [{sync_id, status, server_updated_at}]}
```

**Request:**
```json
{
  "device_id": "uuid",
  "changes": [
    {
      "table": "products",
      "operation": "update",
      "sync_id": "uuid",
      "data": {
        "name_ar": "اسم جديد",
        "local_updated_at": "2025-12-01T10:00:00Z"
      }
    },
    {
      "table": "invoices",
      "operation": "create",
      "sync_id": "uuid",
      "data": { ... }
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "sync_id": "uuid",
      "status": "success",
      "server_updated_at": "2025-12-01T10:00:01Z"
    },
    {
      "sync_id": "uuid",
      "status": "conflict",
      "server_data": { ... }
    }
  ]
}
```

#### Pull Changes
```
GET /rest/v1/rpc/sync_pull
```
```json
{
  "client_id": "uuid",
  "branch_id": "uuid",
  "last_sync_at": "2025-12-01T09:00:00Z",
  "tables": ["products", "categories", "customers"]
}
```

**Response:**
```json
{
  "products": [
    { "sync_id": "...", "name_ar": "...", ... }
  ],
  "categories": [...],
  "customers": [...],
  "sync_timestamp": "2025-12-01T10:00:00Z"
}
```

---

## Realtime Subscriptions

### Subscribe to Changes
```mermaid
sequenceDiagram
    participant APP as Client App
    participant WS as WebSocket
    participant DB as Database
    
    APP->>WS: Subscribe to products
    Note right of APP: channel: products:{client_id}
    
    WS-->>APP: Subscription confirmed
    
    Note over DB: Another device updates product
    
    DB->>WS: Broadcast change
    WS->>APP: New change event
    Note left of WS: {type: UPDATE, record: {...}}
    
    APP->>APP: Apply change locally
```

**JavaScript Example:**
```javascript
const channel = supabase
  .channel('products-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'products',
      filter: `client_id=eq.${clientId}`
    },
    (payload) => {
      handleProductChange(payload)
    }
  )
  .subscribe()
```

---

## Edge Functions

### Check Subscription
```
POST /functions/v1/check-subscription
```
```json
{
  "client_id": "uuid",
  "device_fingerprint": "..."
}
```

**Response:**
```json
{
  "valid": true,
  "subscription": {
    "plan_name": "Pro",
    "status": "active",
    "end_date": "2026-01-01",
    "features": ["pos", "inventory", "whatsapp"],
    "limits": {
      "max_devices": 3,
      "current_devices": 2
    }
  }
}
```

### Send Notification
```
POST /functions/v1/send-notification
```
```json
{
  "client_id": "uuid",
  "channels": ["email", "whatsapp"],
  "template": "subscription_expiring",
  "data": {
    "days_remaining": 7
  }
}
```

---

## Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "SUBSCRIPTION_EXPIRED",
    "message": "Your subscription has expired",
    "details": {
      "expired_at": "2025-11-30T23:59:59Z"
    }
  }
}
```

### Error Codes
```mermaid
graph LR
    subgraph "Auth Errors (4xx)"
        E401[401 Unauthorized]
        E403[403 Forbidden]
    end
    
    subgraph "Business Errors"
        SUB_EXP[SUBSCRIPTION_EXPIRED]
        DEV_LIMIT[DEVICE_LIMIT_EXCEEDED]
        FEAT_LOCK[FEATURE_LOCKED]
        SYNC_CONF[SYNC_CONFLICT]
    end
    
    subgraph "Server Errors (5xx)"
        E500[500 Internal Error]
        E503[503 Service Unavailable]
    end
```

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing token |
| `FORBIDDEN` | 403 | No permission |
| `NOT_FOUND` | 404 | Resource not found |
| `SUBSCRIPTION_EXPIRED` | 403 | Subscription ended |
| `DEVICE_LIMIT_EXCEEDED` | 403 | Too many devices |
| `FEATURE_LOCKED` | 403 | Feature not in plan |
| `SYNC_CONFLICT` | 409 | Data conflict |
| `VALIDATION_ERROR` | 422 | Invalid data |
