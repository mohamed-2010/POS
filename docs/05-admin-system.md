# 👑 Admin System

## Admin Dashboard Overview

```mermaid
graph TB
    subgraph "Admin Dashboard"
        HOME[Dashboard Home]
        CLIENTS[Clients Management]
        PLANS[Plans Management]
        SUBS[Subscriptions]
        DEVICES[Devices]
        REPORTS[Reports]
        COMMS[Communications]
        SETTINGS[Settings]
    end
    
    HOME --> STATS[Statistics]
    HOME --> ALERTS[Alerts]
    HOME --> RECENT[Recent Activity]
    
    CLIENTS --> CLIENT_LIST[Client List]
    CLIENTS --> CLIENT_DETAIL[Client Detail]
    CLIENTS --> CLIENT_DATA[Client Data View]
    
    PLANS --> PLAN_LIST[Plans List]
    PLANS --> PLAN_CREATE[Create Plan]
    PLANS --> FEATURES[Features Config]
    
    SUBS --> SUB_LIST[Subscriptions List]
    SUBS --> PAYMENTS[Payments]
    SUBS --> INVOICES[Invoices]
    
    DEVICES --> DEV_PENDING[Pending Approval]
    DEVICES --> DEV_CHANGE[Change Requests]
    DEVICES --> DEV_ALL[All Devices]
    
    REPORTS --> REP_REVENUE[Revenue Reports]
    REPORTS --> REP_CLIENTS[Client Reports]
    REPORTS --> REP_USAGE[Usage Reports]
    
    COMMS --> NOTIF[Notifications]
    COMMS --> EMAIL[Email]
    COMMS --> SMS[SMS]
    COMMS --> WHATSAPP[WhatsApp]
```

---

## Dashboard Home

### Statistics Cards
```mermaid
graph LR
    subgraph "Quick Stats"
        A[Total Clients<br/>150]
        B[Active Subscriptions<br/>120]
        C[Pending Devices<br/>5]
        D[Expiring Soon<br/>8]
    end
    
    subgraph "Revenue"
        E[This Month<br/>50,000 EGP]
        F[Last Month<br/>45,000 EGP]
        G[Growth<br/>+11%]
    end
```

### Dashboard Layout
```mermaid
flowchart TB
    subgraph "Header"
        LOGO[Logo]
        SEARCH[Search]
        NOTIF_ICON[Notifications]
        PROFILE[Admin Profile]
    end
    
    subgraph "Sidebar"
        NAV[Navigation Menu]
    end
    
    subgraph "Main Content"
        STATS[Statistics Cards]
        CHARTS[Charts]
        TABLES[Recent Activity]
        ALERTS[Alerts Panel]
    end
    
    LOGO --- SEARCH --- NOTIF_ICON --- PROFILE
    NAV --- STATS
    STATS --- CHARTS
    CHARTS --- TABLES
    TABLES --- ALERTS
```

---

## Clients Management

### Client Lifecycle
```mermaid
stateDiagram-v2
    [*] --> Pending: New Registration
    Pending --> Active: Approved + Payment
    Pending --> Rejected: Rejected
    Active --> Suspended: Payment Issue
    Active --> Cancelled: User Request
    Suspended --> Active: Payment Received
    Suspended --> Cancelled: Extended Non-payment
    Cancelled --> [*]
    Rejected --> [*]
```

### Client Detail View
```mermaid
graph TB
    subgraph "Client Profile"
        INFO[Basic Info]
        CONTACT[Contact Details]
        DOCS[Documents]
    end
    
    subgraph "Subscription"
        PLAN[Current Plan]
        HISTORY[Payment History]
        USAGE[Usage Stats]
    end
    
    subgraph "Access"
        BRANCHES[Branches]
        USERS[Users]
        DEVICES[Devices]
    end
    
    subgraph "Data Access"
        PRODUCTS[Products]
        INVOICES[Invoices]
        REPORTS[Reports]
    end
    
    subgraph "Actions"
        EDIT[Edit Client]
        SUSPEND[Suspend]
        CONTACT_BTN[Contact]
        LOGIN_AS[Login As Client]
    end
```

### Client Data Access (Support Mode)
```mermaid
sequenceDiagram
    participant ADMIN as Admin
    participant DASHBOARD as Dashboard
    participant SERVER as Server
    participant CLIENT_DATA as Client Data
    
    ADMIN->>DASHBOARD: View client data
    DASHBOARD->>SERVER: Request with admin token
    SERVER->>SERVER: Verify admin role
    SERVER->>CLIENT_DATA: Query client data
    CLIENT_DATA-->>SERVER: Data
    SERVER-->>DASHBOARD: Display data
    
    Note over ADMIN,DASHBOARD: Read-only by default
    
    ADMIN->>DASHBOARD: Request edit mode
    DASHBOARD->>SERVER: Enable support mode
    SERVER->>SERVER: Log access
    SERVER-->>DASHBOARD: Edit enabled
```

---

## Plans Management

### Dynamic Plan Configuration
```mermaid
flowchart TD
    subgraph "Plan Builder"
        NAME[Plan Name]
        PRICING[Pricing<br/>Monthly/Yearly]
        LIMITS[Limits<br/>Devices/Branches/Users]
        TRIAL[Trial Period]
    end
    
    subgraph "Feature Selection"
        CORE[Core Features]
        ADVANCED[Advanced Features]
        ADDONS[Add-ons]
    end
    
    subgraph "Feature Limits"
        F_LIMITS[Per-feature limits]
    end
    
    NAME --> PRICING --> LIMITS --> TRIAL
    CORE --> F_LIMITS
    ADVANCED --> F_LIMITS
    ADDONS --> F_LIMITS
```

### Plan Comparison Matrix
```mermaid
graph TB
    subgraph "Plans Comparison"
        subgraph "Basic"
            B1[1 Device]
            B2[1 Branch]
            B3[5 Users]
            B4[Core Features]
        end
        
        subgraph "Pro"
            P1[3 Devices]
            P2[3 Branches]
            P3[15 Users]
            P4[Core + Advanced]
        end
        
        subgraph "Enterprise"
            E1[Unlimited Devices]
            E2[Unlimited Branches]
            E3[Unlimited Users]
            E4[All Features]
        end
    end
```

---

## Subscriptions Management

### Subscription Dashboard
```mermaid
flowchart LR
    subgraph "Filters"
        F1[Status]
        F2[Plan]
        F3[Expiry Date]
    end
    
    subgraph "Quick Actions"
        A1[Renew]
        A2[Upgrade]
        A3[Suspend]
        A4[Cancel]
    end
    
    subgraph "Batch Actions"
        BA1[Send Reminders]
        BA2[Export List]
    end
```

### Payment Processing
```mermaid
sequenceDiagram
    participant ADMIN as Admin
    participant SYSTEM as System
    participant GATEWAY as Payment Gateway
    participant CLIENT as Client
    
    Note over ADMIN,CLIENT: Manual Payment
    ADMIN->>SYSTEM: Record payment
    SYSTEM->>SYSTEM: Update subscription
    SYSTEM->>CLIENT: Send confirmation
    
    Note over ADMIN,CLIENT: Online Payment
    CLIENT->>GATEWAY: Make payment
    GATEWAY->>SYSTEM: Webhook notification
    SYSTEM->>SYSTEM: Verify & update
    SYSTEM->>CLIENT: Send confirmation
    SYSTEM->>ADMIN: Notify new payment
```

---

## Devices Management

### Device Approval Workflow
```mermaid
flowchart TD
    subgraph "Pending Queue"
        NEW[New Device Request]
        INFO[Device Info<br/>Client, Branch, Fingerprint]
    end
    
    subgraph "Review"
        CHECK_LIMIT{Within device<br/>limit?}
        CHECK_CLIENT{Client status<br/>active?}
    end
    
    subgraph "Actions"
        APPROVE[Approve]
        REJECT[Reject]
        REQUEST_INFO[Request More Info]
    end
    
    subgraph "Result"
        NOTIFY_SUCCESS[Notify Client - Approved]
        NOTIFY_REJECT[Notify Client - Rejected]
    end
    
    NEW --> INFO --> CHECK_LIMIT
    CHECK_LIMIT -->|Yes| CHECK_CLIENT
    CHECK_LIMIT -->|No| REJECT
    CHECK_CLIENT -->|Yes| APPROVE
    CHECK_CLIENT -->|No| REJECT
    
    APPROVE --> NOTIFY_SUCCESS
    REJECT --> NOTIFY_REJECT
```

### Device Change Request
```mermaid
flowchart TD
    subgraph "Request Details"
        OLD[Old Device Info]
        NEW[New Device Info]
        REASON[Change Reason]
    end
    
    subgraph "Verification"
        V1[Verify client identity]
        V2[Check change history]
        V3[Review reason]
    end
    
    subgraph "Decision"
        APPROVE[Approve Change]
        REJECT[Reject Change]
        CONTACT[Contact Client]
    end
    
    OLD --> V1
    NEW --> V1
    REASON --> V3
    V1 --> V2 --> V3
    V3 --> APPROVE
    V3 --> REJECT
    V3 --> CONTACT
```

---

## Reports

### Revenue Analytics
```mermaid
graph TB
    subgraph "Revenue Dashboard"
        TOTAL[Total Revenue]
        MRR[Monthly Recurring Revenue]
        ARR[Annual Recurring Revenue]
        CHURN[Churn Rate]
    end
    
    subgraph "Charts"
        TREND[Revenue Trend]
        BY_PLAN[Revenue by Plan]
        BY_REGION[Revenue by Region]
    end
    
    subgraph "Forecasting"
        PREDICT[Revenue Prediction]
        GROWTH[Growth Analysis]
    end
```

### Client Analytics
```mermaid
graph TB
    subgraph "Client Metrics"
        ACTIVE[Active Clients]
        NEW[New Clients]
        CHURNED[Churned Clients]
        LTV[Customer Lifetime Value]
    end
    
    subgraph "Usage Metrics"
        DAILY[Daily Active]
        FEATURES[Feature Usage]
        STORAGE[Storage Used]
    end
    
    subgraph "Health Score"
        ENGAGEMENT[Engagement Score]
        RISK[Churn Risk]
    end
```

### Usage Reports
```mermaid
flowchart LR
    subgraph "Per Client"
        C_INVOICES[Invoices Created]
        C_PRODUCTS[Products Count]
        C_USERS[Active Users]
        C_SYNC[Sync Activity]
    end
    
    subgraph "Aggregate"
        A_TOTAL[Total Invoices/Day]
        A_AVG[Avg per Client]
        A_TOP[Top Clients]
    end
```

---

## Communications

### Notification Center
```mermaid
flowchart TD
    subgraph "Trigger Events"
        SUB_EXPIRY[Subscription Expiring]
        PAYMENT_DUE[Payment Due]
        UPDATE_AVAIL[Update Available]
        CUSTOM[Custom Message]
    end
    
    subgraph "Channels"
        IN_APP[In-App]
        EMAIL[Email]
        SMS[SMS]
        WA[WhatsApp]
        PUSH[Push Notification]
    end
    
    subgraph "Template"
        TEMPLATE[Message Template]
        VARS[Variables Injection]
    end
    
    subgraph "Delivery"
        QUEUE[Send Queue]
        SEND[Send]
        TRACK[Track Delivery]
    end
    
    SUB_EXPIRY --> TEMPLATE
    PAYMENT_DUE --> TEMPLATE
    UPDATE_AVAIL --> TEMPLATE
    CUSTOM --> TEMPLATE
    
    TEMPLATE --> VARS --> QUEUE
    
    QUEUE --> IN_APP
    QUEUE --> EMAIL
    QUEUE --> SMS
    QUEUE --> WA
    QUEUE --> PUSH
    
    IN_APP --> TRACK
    EMAIL --> TRACK
    SMS --> TRACK
    WA --> TRACK
    PUSH --> TRACK
```

### Bulk Messaging
```mermaid
sequenceDiagram
    participant ADMIN as Admin
    participant SYSTEM as System
    participant QUEUE as Message Queue
    participant CHANNELS as Channels
    
    ADMIN->>SYSTEM: Select recipients
    ADMIN->>SYSTEM: Choose template
    ADMIN->>SYSTEM: Select channels
    
    SYSTEM->>SYSTEM: Prepare messages
    SYSTEM->>QUEUE: Add to queue
    
    loop For each message
        QUEUE->>CHANNELS: Send
        CHANNELS-->>QUEUE: Status
        QUEUE->>SYSTEM: Update status
    end
    
    SYSTEM->>ADMIN: Delivery report
```

---

## Admin Permissions

### Role-Based Access
```mermaid
graph TB
    subgraph "Roles"
        SUPER[Super Admin<br/>Full Access]
        SALES[Sales Admin<br/>Clients + Subscriptions]
        SUPPORT[Support Admin<br/>View Only + Support]
        FINANCE[Finance Admin<br/>Payments + Reports]
    end
    
    subgraph "Permissions"
        P1[Manage Clients]
        P2[Manage Plans]
        P3[Manage Subscriptions]
        P4[Approve Devices]
        P5[View Client Data]
        P6[Process Payments]
        P7[View Reports]
        P8[Send Communications]
        P9[System Settings]
    end
    
    SUPER --> P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8 & P9
    SALES --> P1 & P3 & P8
    SUPPORT --> P5 & P4
    FINANCE --> P6 & P7
```
