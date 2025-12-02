# 🗄️ Database Schema

## Entity Relationship Diagram

```mermaid
erDiagram
    %% Admin Tables
    FEATURES ||--o{ PLAN_FEATURES : "included in"
    PLANS ||--o{ PLAN_FEATURES : "has"
    PLANS ||--o{ SUBSCRIPTIONS : "used by"

    CLIENTS ||--o{ SUBSCRIPTIONS : "has"
    CLIENTS ||--o{ BRANCHES : "has"
    CLIENTS ||--o{ DEVICES : "has"
    CLIENTS ||--o{ PAYMENTS : "makes"
    CLIENTS ||--o{ CLIENT_COMMUNICATIONS : "receives"

    %% Client Data Tables
    BRANCHES ||--o{ CLIENT_USERS : "has"
    BRANCHES ||--o{ CATEGORIES : "has"
    BRANCHES ||--o{ PRODUCTS : "has"
    BRANCHES ||--o{ INVENTORY : "has"
    BRANCHES ||--o{ CUSTOMERS : "has"
    BRANCHES ||--o{ INVOICES : "has"
    BRANCHES ||--o{ SHIFTS : "has"
    BRANCHES ||--o{ EXPENSES : "has"

    CLIENT_USERS ||--o{ USER_BRANCH_ACCESS : "has access"
    BRANCHES ||--o{ USER_BRANCH_ACCESS : "accessible by"

    CATEGORIES ||--o{ PRODUCTS : "contains"
    PRODUCTS ||--o{ INVENTORY : "tracked in"
    PRODUCTS ||--o{ INVOICE_ITEMS : "sold in"

    CUSTOMERS ||--o{ INVOICES : "purchases"
    CLIENT_USERS ||--o{ INVOICES : "creates"
    INVOICES ||--o{ INVOICE_ITEMS : "contains"

    CLIENT_USERS ||--o{ SHIFTS : "works"

    %% Sync Tables
    CLIENTS ||--o{ SYNC_LOG : "has"
    CLIENTS ||--o{ SYNC_QUEUE : "has"

    FEATURES {
        uuid id PK
        string code UK
        string name_ar
        string name_en
        string category
        boolean is_active
    }

    PLANS {
        uuid id PK
        string name_ar
        string name_en
        decimal price_monthly
        decimal price_yearly
        int max_devices
        int max_branches
        int max_users
        int trial_days
        boolean is_active
    }

    PLAN_FEATURES {
        uuid id PK
        uuid plan_id FK
        uuid feature_id FK
        boolean is_enabled
        jsonb limits
    }

    CLIENTS {
        uuid id PK
        string name_ar
        string email UK
        string phone
        string branches_mode
        string sync_mode
        string status
    }

    SUBSCRIPTIONS {
        uuid id PK
        uuid client_id FK
        uuid plan_id FK
        string status
        date start_date
        date end_date
        string billing_cycle
        decimal amount
    }

    BRANCHES {
        uuid id PK
        uuid client_id FK
        string name_ar
        boolean is_main
        boolean is_active
    }

    CLIENT_USERS {
        uuid id PK
        uuid client_id FK
        string name
        string email
        string role
        string pin_code
    }

    PRODUCTS {
        uuid id PK
        uuid client_id FK
        uuid branch_id FK
        uuid category_id FK
        string name_ar
        string barcode
        decimal cost_price
        decimal sell_price
    }

    INVOICES {
        uuid id PK
        uuid client_id FK
        uuid branch_id FK
        uuid customer_id FK
        string invoice_number
        decimal total
        string payment_status
    }
```

---

## Admin Tables Schema

### features (الميزات)

```mermaid
classDiagram
    class features {
        +uuid id PK
        +varchar(50) code UK
        +varchar(100) name_ar
        +varchar(100) name_en
        +text description_ar
        +text description_en
        +varchar(50) category
        +boolean is_active
        +timestamptz created_at
        +timestamptz updated_at
    }
```

**القيم الافتراضية للميزات:**
| code | name_ar | category |
|------|---------|----------|
| pos | نقطة البيع | core |
| inventory | المخزون | core |
| customers | العملاء | core |
| employees | الموظفين | core |
| reports_basic | التقارير الأساسية | core |
| reports_advanced | التقارير المتقدمة | advanced |
| multi_branch | تعدد الفروع | advanced |
| whatsapp | تكامل واتساب | addon |
| promotions | العروض والخصومات | addon |
| installments | الأقساط | addon |

---

### plans (الباقات)

```mermaid
classDiagram
    class plans {
        +uuid id PK
        +varchar(100) name_ar
        +varchar(100) name_en
        +text description_ar
        +text description_en
        +decimal(10,2) price_monthly
        +decimal(10,2) price_yearly
        +int max_devices
        +int max_branches
        +int max_users
        +int max_products
        +int max_invoices_per_month
        +int trial_days
        +boolean is_active
        +int display_order
        +timestamptz created_at
        +timestamptz updated_at
    }
```

---

### clients (العملاء)

```mermaid
classDiagram
    class clients {
        +uuid id PK
        +varchar(200) name_ar
        +varchar(200) name_en
        +varchar(255) email UK
        +varchar(20) phone
        +text address
        +text logo_url
        +varchar(50) tax_number
        +varchar(50) commercial_register
        +varchar(20) branches_mode
        +varchar(20) sync_mode
        +varchar(20) status
        +text notes
        +timestamptz created_at
        +timestamptz updated_at
    }
```

**branches_mode values:**

- `independent` - كل فرع مستقل
- `shared` - فروع مرتبطة (منتجات مشتركة)

**sync_mode values:**

- `auto` - مزامنة تلقائية
- `manual` - مزامنة يدوية
- `semi-auto` - إشعار للمستخدم

**status values:**

- `pending` - في انتظار التفعيل
- `active` - نشط
- `suspended` - معلق
- `cancelled` - ملغي

---

### subscriptions (الاشتراكات)

```mermaid
classDiagram
    class subscriptions {
        +uuid id PK
        +uuid client_id FK
        +uuid plan_id FK
        +varchar(20) status
        +date trial_start_date
        +date trial_end_date
        +date start_date
        +date end_date
        +varchar(20) billing_cycle
        +decimal(10,2) amount
        +varchar(3) currency
        +int grace_period_days
        +date grace_end_date
        +boolean auto_renew
        +timestamptz created_at
        +timestamptz updated_at
    }
```

**status values:**

- `trial` - فترة تجريبية
- `active` - نشط
- `expired` - منتهي
- `cancelled` - ملغي
- `suspended` - معلق

---

### devices (الأجهزة)

```mermaid
classDiagram
    class devices {
        +uuid id PK
        +uuid client_id FK
        +uuid branch_id FK
        +varchar(500) device_fingerprint
        +varchar(100) device_name
        +varchar(20) device_type
        +varchar(50) os
        +varchar(20) status
        +text change_request_reason
        +timestamptz change_requested_at
        +uuid change_approved_by
        +timestamptz change_approved_at
        +timestamptz last_seen_at
        +timestamptz created_at
        +timestamptz updated_at
    }
```

**Device Approval Flow:**

```mermaid
stateDiagram-v2
    [*] --> pending: تسجيل جديد
    pending --> approved: موافقة Admin
    pending --> rejected: رفض Admin
    approved --> change_requested: طلب تغيير
    change_requested --> approved: موافقة
    change_requested --> rejected: رفض
    approved --> revoked: إلغاء
    rejected --> [*]
    revoked --> [*]
```

---

## Client Data Tables

### Syncable Entity Pattern

كل جدول بيانات العميل يتبع هذا النمط:

```mermaid
classDiagram
    class SyncableEntity {
        +uuid id PK
        +uuid client_id FK
        +uuid branch_id FK
        +uuid sync_id UK
        +varchar(20) sync_status
        +timestamptz local_updated_at
        +timestamptz server_updated_at
        +boolean is_deleted
        +timestamptz created_at
        +timestamptz updated_at
    }
```

**sync_status values:**

- `synced` - متزامن
- `pending` - في انتظار المزامنة
- `conflict` - يوجد تعارض

---

### products (المنتجات)

```mermaid
classDiagram
    class products {
        +uuid id PK
        +uuid client_id FK
        +uuid branch_id FK
        +uuid category_id FK
        +varchar(200) name_ar
        +varchar(200) name_en
        +varchar(50) barcode
        +varchar(50) sku
        +text description_ar
        +decimal(10,2) cost_price
        +decimal(10,2) sell_price
        +varchar(20) unit
        +text image_url
        +boolean track_inventory
        +int min_stock_level
        +boolean is_active
        ---Sync Fields---
        +uuid sync_id
        +varchar(20) sync_status
        +timestamptz local_updated_at
        +timestamptz server_updated_at
        +boolean is_deleted
    }
```

---

### invoices (الفواتير)

```mermaid
classDiagram
    class invoices {
        +uuid id PK
        +uuid client_id FK
        +uuid branch_id FK
        +varchar(50) invoice_number UK
        +varchar(20) invoice_type
        +uuid customer_id FK
        +uuid user_id FK
        +decimal(10,2) subtotal
        +decimal(10,2) discount_amount
        +decimal(10,2) tax_amount
        +decimal(10,2) total
        +decimal(10,2) paid_amount
        +decimal(10,2) change_amount
        +varchar(20) payment_method
        +varchar(20) payment_status
        +text notes
        +timestamptz invoice_date
        ---Sync Fields---
        +uuid sync_id
        +varchar(20) sync_status
        +timestamptz local_updated_at
        +timestamptz server_updated_at
    }

    class invoice_items {
        +uuid id PK
        +uuid invoice_id FK
        +uuid product_id FK
        +varchar(200) product_name
        +decimal(10,3) quantity
        +decimal(10,2) unit_price
        +decimal(10,2) discount
        +decimal(10,2) tax
        +decimal(10,2) total
        +uuid sync_id
    }

    invoices "1" --> "*" invoice_items
```

---

## Indexes Strategy

```sql
-- Performance Indexes
CREATE INDEX idx_products_client_branch ON products(client_id, branch_id);
CREATE INDEX idx_products_barcode ON products(client_id, barcode);
CREATE INDEX idx_products_category ON products(category_id);

CREATE INDEX idx_invoices_client_branch ON invoices(client_id, branch_id);
CREATE INDEX idx_invoices_date ON invoices(client_id, invoice_date);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);

CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_branch ON inventory(branch_id);

-- Sync Indexes
CREATE INDEX idx_products_sync ON products(client_id, sync_status, server_updated_at);
CREATE INDEX idx_invoices_sync ON invoices(client_id, sync_status, server_updated_at);
CREATE INDEX idx_sync_queue_status ON sync_queue(client_id, status, created_at);
```

---

## Row Level Security (RLS)

```mermaid
flowchart TD
    subgraph "Request"
        REQ[API Request]
        JWT[JWT Token]
    end

    subgraph "Supabase"
        AUTH{Auth Check}
        RLS{RLS Policy}
        DATA[(Data)]
    end

    subgraph "Policy Check"
        CLIENT[client_id = user.client_id]
        BRANCH[branch_id IN user.branches]
        ADMIN[is_admin = true]
    end

    REQ --> JWT
    JWT --> AUTH
    AUTH -->|Valid| RLS
    AUTH -->|Invalid| DENIED[Access Denied]

    RLS --> CLIENT
    RLS --> BRANCH
    RLS --> ADMIN

    CLIENT -->|Match| DATA
    BRANCH -->|Match| DATA
    ADMIN -->|Match| DATA
```

**Example RLS Policy:**

```sql
-- Clients can only see their own data
CREATE POLICY "clients_isolation" ON products
    FOR ALL
    USING (client_id = auth.jwt() ->> 'client_id');

-- Branch level access
CREATE POLICY "branch_access" ON products
    FOR ALL
    USING (
        branch_id IS NULL
        OR branch_id IN (
            SELECT branch_id
            FROM user_branch_access
            WHERE user_id = auth.uid()
        )
    );

-- Admin full access
CREATE POLICY "admin_full_access" ON products
    FOR ALL
    USING (
        (auth.jwt() ->> 'role') = 'super_admin'
    );
```
