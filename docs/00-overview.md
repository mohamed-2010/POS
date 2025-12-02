# 📋 نظرة عامة على المشروع

## 🎯 الرؤية

نظام نقاط بيع (POS) متكامل يعمل **Online/Offline** مع نظام إدارة مركزي للاشتراكات والعملاء.

---

## 🏗️ المكونات الرئيسية

```mermaid
graph TB
    subgraph "☁️ Cloud Infrastructure"
        SB[Supabase]
        DB[(PostgreSQL)]
        AUTH[Auth Service]
        RT[Realtime]
        STORAGE[Storage]
        EDGE[Edge Functions]
    end

    subgraph "🖥️ Admin System"
        ADMIN[Admin Dashboard<br/>Electron App]
    end

    subgraph "💼 Client Systems"
        C1[Client 1<br/>Electron App]
        C2[Client 2<br/>Electron App]
        C3[Client N<br/>Electron App]
    end

    subgraph "📱 Future"
        MOB[Mobile App]
        WEB[Web App]
    end

    SB --> DB
    SB --> AUTH
    SB --> RT
    SB --> STORAGE
    SB --> EDGE

    ADMIN <-->|HTTPS| SB
    C1 <-->|HTTPS/WSS| SB
    C2 <-->|HTTPS/WSS| SB
    C3 <-->|HTTPS/WSS| SB

    MOB -.->|Future| SB
    WEB -.->|Future| SB
```

---

## 📊 الميزات الرئيسية

### نظام الإدارة (Admin)

| الميزة              | الوصف                            |
| ------------------- | -------------------------------- |
| 👥 إدارة العملاء    | إضافة، تعديل، تعليق، حذف         |
| 📦 إدارة الباقات    | باقات Dynamic مع تحديد الميزات   |
| 💳 إدارة الاشتراكات | تفعيل، تجديد، إلغاء              |
| 📱 إدارة الأجهزة    | موافقة على الأجهزة، تغيير الجهاز |
| 📊 التقارير         | تقارير شاملة لكل العملاء         |
| 📢 التواصل          | إشعارات، رسائل، تحديثات          |
| 💰 المدفوعات        | يدوي + بوابات دفع                |

### نظام العميل (Client)

| الميزة        | الوصف                     |
| ------------- | ------------------------- |
| 🛒 نقطة البيع | POS متكامل                |
| 📦 المخزون    | إدارة المنتجات والكميات   |
| 👥 العملاء    | إدارة عملاء المحل         |
| 👔 الموظفين   | إدارة الموظفين والصلاحيات |
| 🏢 الفروع     | إدارة فروع متعددة         |
| 📊 التقارير   | تقارير المبيعات والمخزون  |
| 📱 WhatsApp   | تكامل واتساب              |
| 🔄 المزامنة   | Online/Offline Sync       |

---

## 🔄 أنماط العمل

### Online Mode

```mermaid
sequenceDiagram
    participant U as User
    participant APP as App
    participant LOCAL as IndexedDB
    participant SERVER as Supabase

    U->>APP: إجراء عملية
    APP->>LOCAL: حفظ محلي
    APP->>SERVER: إرسال للسيرفر
    SERVER-->>APP: تأكيد
    APP-->>U: نجاح
```

### Offline Mode

```mermaid
sequenceDiagram
    participant U as User
    participant APP as App
    participant LOCAL as IndexedDB
    participant QUEUE as Sync Queue

    U->>APP: إجراء عملية
    APP->>LOCAL: حفظ محلي
    APP->>QUEUE: إضافة للطابور
    APP-->>U: نجاح (Pending Sync)

    Note over APP,QUEUE: عند عودة الاتصال

    APP->>QUEUE: معالجة الطابور
    QUEUE->>SERVER: إرسال البيانات
    SERVER-->>APP: تأكيد
```

---

## 📅 مراحل التنفيذ

```mermaid
gantt
    title خطة تنفيذ المشروع
    dateFormat  YYYY-MM-DD
    section Phase 1
    إعداد Supabase          :p1a, 2025-12-02, 3d
    Database Schema         :p1b, after p1a, 4d
    Authentication          :p1c, after p1b, 3d

    section Phase 2
    Sync Engine             :p2a, after p1c, 7d
    Offline Queue           :p2b, after p2a, 5d
    Conflict Resolution     :p2c, after p2b, 4d

    section Phase 3
    Admin Dashboard         :p3a, after p2c, 10d
    Client Refactoring      :p3b, after p3a, 7d

    section Phase 4
    Testing                 :p4a, after p3b, 7d
    Bug Fixes               :p4b, after p4a, 5d
    Deployment              :p4c, after p4b, 3d
```

---

## 📁 هيكل الوثائق

```
docs/
├── 00-overview.md           # هذا الملف
├── 01-architecture.md       # البنية التقنية
├── 02-database-schema.md    # مخطط قاعدة البيانات
├── 03-sync-strategy.md      # استراتيجية المزامنة
├── 04-security.md           # الأمان والحماية
├── 05-admin-system.md       # نظام الإدارة
├── 06-client-system.md      # نظام العميل
├── 07-api-reference.md      # مرجع الـ APIs
├── 08-project-structure.md  # هيكل المشروع
└── 09-deployment.md         # النشر والتحديثات
```
