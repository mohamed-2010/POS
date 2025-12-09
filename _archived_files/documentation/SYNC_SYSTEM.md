# 🔄 Sync System Documentation

نظام مزامنة متقدم لتطبيق POS مع دعم **Offline-First** ومعالجة التعارضات.

## 📋 جدول المحتويات

- [الميزات الرئيسية](#الميزات-الرئيسية)
- [البنية المعمارية](#البنية-المعمارية)
- [التثبيت والإعداد](#التثبيت-والإعداد)
- [الاستخدام](#الاستخدام)
- [API Reference](#api-reference)
- [الاختبارات](#الاختبارات)

---

## ✨ الميزات الرئيسية

### 🌐 Offline-First

- ✅ العمل بدون اتصال بالإنترنت
- ✅ قائمة انتظار تلقائية للعمليات
- ✅ مزامنة تلقائية عند عودة الاتصال

### 🔄 مزامنة ثنائية الاتجاه

- 📤 **Push**: إرسال التغييرات المحلية للخادم
- 📥 **Pull**: جلب التحديثات من الخادم
- ⚡ **Real-time**: تحديثات فورية عبر WebSocket

### 🔒 معالجة التعارضات

- 🎯 كشف تلقائي للتعارضات
- 💬 واجهة مستخدم لحل التعارضات
- 🤖 خيارات حل تلقائي

### 🚀 الأداء

- 📦 معالجة دفعية (Batch Processing)
- 🔁 إعادة محاولة تلقائية مع Exponential Backoff
- 💾 تخزين محلي بـ IndexedDB

---

## 🏗️ البنية المعمارية

```
infrastructure/
├── http/
│   ├── FastifyClient.ts      # HTTP client + JWT auth
│   └── WebSocketClient.ts    # WebSocket + reconnection
├── sync/
│   ├── SyncQueue.ts          # IndexedDB queue
│   └── SyncEngine.ts         # Main orchestrator
├── database/
│   └── SyncableRepository.ts # Auto-sync repository
└── index.ts                  # Initialization
```

### المكونات الأساسية

#### 1. FastifyClient

عميل HTTP مع:

- تحديث تلقائي لـ JWT
- إدارة التوكنات
- Interceptors للطلبات

#### 2. WebSocketClient

اتصال WebSocket مع:

- إعادة اتصال تلقائية
- Exponential backoff
- Heartbeat mechanism

#### 3. SyncQueue

قائمة انتظار IndexedDB:

- تخزين العمليات المعلقة
- إدارة حالة العمليات
- إحصائيات المزامنة

#### 4. SyncEngine

محرك التنسيق الرئيسي:

- تنسيق HTTP + WebSocket
- مزامنة دورية
- معالجة التعارضات
- Event-driven architecture

#### 5. SyncableRepository

Repository مع مزامنة تلقائية:

- CRUD operations → auto-queue
- Timestamp tracking
- Server update methods

---

## 🚀 التثبيت والإعداد

### 1. المتطلبات

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "ws": "^8.14.0",
    "idb": "^7.1.1"
  }
}
```

### 2. تكوين البيئة

أنشئ ملف `.env`:

```bash
cp .env.example .env
```

عدل القيم:

```env
VITE_API_BASE_URL=http://localhost:3030
VITE_WS_URL=ws://localhost:3031
VITE_SYNC_INTERVAL=300000
VITE_AUTO_RESOLVE_CONFLICTS=server
```

### 3. التهيئة في التطبيق

في `main.tsx`:

```tsx
import { SyncProvider } from "@/components/sync";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SyncProvider>
      <App />
    </SyncProvider>
  </React.StrictMode>
);
```

---

## 📖 الاستخدام

### استخدام SyncableRepository

```typescript
import { SyncableRepository } from "@/infrastructure/database";
import { getIndexedDBClient } from "@/infrastructure/database";

// إنشاء repository
const productsRepo = new SyncableRepository(getIndexedDBClient(), "products");

// العمليات تضاف تلقائياً للمزامنة
await productsRepo.add({ id: "1", name: "Product 1", price: 100 });
await productsRepo.update({ id: "1", name: "Updated", price: 150 });
await productsRepo.delete("1");
```

### إضافة مؤشر المزامنة

```tsx
import { SyncStatusIndicator } from "@/components/sync";

function Header() {
  return (
    <header>
      <SyncStatusIndicator />
    </header>
  );
}
```

### معالجة التعارضات

```tsx
import { useConflictResolution } from "@/hooks/useConflictResolution";
import { ConflictResolutionDialog } from "@/components/sync";

function App() {
  const { currentConflict, isDialogOpen, handleResolve, handleCloseDialog } =
    useConflictResolution();

  return (
    <>
      <YourApp />
      <ConflictResolutionDialog
        conflict={currentConflict}
        open={isDialogOpen}
        onClose={handleCloseDialog}
        onResolve={handleResolve}
      />
    </>
  );
}
```

### الوصول لمحرك المزامنة

```typescript
import { getSyncEngine } from "@/infrastructure";

const syncEngine = getSyncEngine();

// مزامنة فورية
await syncEngine.syncNow();

// استماع للأحداث
syncEngine.on("syncComplete", (stats) => {
  console.log(`Synced ${stats.synced} items`);
});

syncEngine.on("online", () => {
  console.log("Back online!");
});

syncEngine.on("conflict", (conflict) => {
  console.warn("Conflict detected:", conflict);
});
```

---

## 🔌 API Reference

### FastifyClient

```typescript
const client = getFastifyClient();

// Authentication
await client.login(username, password);
await client.logout();
client.isAuthenticated(); // boolean

// HTTP methods
await client.get(path, config?);
await client.post(path, data?, config?);
await client.put(path, data?, config?);
await client.patch(path, data?, config?);
await client.delete(path, config?);
```

### WebSocketClient

```typescript
const ws = getWebSocketClient();

// Connection
ws.connect();
ws.disconnect();
ws.send(data);

// Events
ws.on("connected", callback);
ws.on("disconnected", callback);
ws.on("message", callback);
ws.on("sync", callback);
ws.on("error", callback);
```

### SyncQueue

```typescript
const queue = getSyncQueue();

// Operations
await queue.add(item);
await queue.update(id, updates);
await queue.delete(id);

// Queries
await queue.get(id);
await queue.getPending();
await queue.getByTable(table);
await queue.getByStatus(status);
await queue.getStats();

// Cleanup
await queue.clear();
```

### SyncEngine

```typescript
const engine = getSyncEngine();

// Control
await engine.start();
await engine.stop();
await engine.pause();
await engine.resume();
await engine.syncNow();

// Queue operations
await engine.addToQueue(table, id, operation, data);

// Events
engine.on("started", callback);
engine.on("stopped", callback);
engine.on("syncStart", callback);
engine.on("syncComplete", callback);
engine.on("syncError", callback);
engine.on("online", callback);
engine.on("offline", callback);
engine.on("conflict", callback);
engine.on("itemSynced", callback);
```

### SyncableRepository

```typescript
const repo = new SyncableRepository(client, storeName, enableSync?);

// CRUD (auto-synced)
await repo.add(data);
await repo.update(data);
await repo.delete(id);
await repo.batchAdd(items);
await repo.batchUpdate(items);

// Server updates (no sync)
await repo.updateFromServer(data);
await repo.batchUpdateFromServer(items);
await repo.deleteFromServer(id);

// Standard queries (inherited)
await repo.get(id);
await repo.getAll();
await repo.find(options);
await repo.count();
```

---

## 🧪 الاختبارات

### تشغيل الاختبارات

```bash
npm run test
```

### اختبار Offline Mode

```typescript
// في Console
Object.defineProperty(navigator, "onLine", { value: false });

// قم بعمليات CRUD
await productsRepo.add({ id: "1", name: "Test" });

// تحقق من Queue
const queue = getSyncQueue();
const pending = await queue.getPending();
console.log("Pending items:", pending.length);

// عودة Online
Object.defineProperty(navigator, "onLine", { value: true });
window.dispatchEvent(new Event("online"));
```

### محاكاة تعارضات

```typescript
// 1. افصل الإنترنت
// 2. حدث سجل محلياً
await productsRepo.update({ id: "1", name: "Local Update" });

// 3. حدث نفس السجل على الخادم (API مباشرة)
// 4. اتصل بالإنترنت
// 5. سيظهر حوار حل التعارض
```

---

## 🐛 التشخيص

### تفعيل Debug Logs

```typescript
// في .env
VITE_DEBUG_SYNC = true;

// أو في Console
localStorage.setItem("debug", "sync:*");
```

### مراجعة Queue

```typescript
const queue = getSyncQueue();

// عرض العناصر المعلقة
const pending = await queue.getPending();
console.table(pending);

// الإحصائيات
const stats = await queue.getStats();
console.log("Stats:", stats);

// العناصر الفاشلة
const failed = await queue.getByStatus("failed");
console.table(failed);
```

### إعادة تعيين النظام

```typescript
// حذف جميع العناصر من Queue
const queue = getSyncQueue();
await queue.clear();

// إعادة تشغيل Sync Engine
const engine = getSyncEngine();
await engine.stop();
await engine.start();
```

---

## 📊 أفضل الممارسات

### 1. معالجة الأخطاء

```typescript
try {
  await productsRepo.add(product);
} catch (error) {
  if (error.code === "OFFLINE") {
    // سيتم المزامنة لاحقاً
    showNotification("تم الحفظ محلياً، سيتم المزامنة عند الاتصال");
  } else {
    // خطأ آخر
    showError("حدث خطأ أثناء الحفظ");
  }
}
```

### 2. التحقق من الاتصال

```typescript
import { useSyncStatus } from "@/components/sync";

function MyComponent() {
  const { isOnline } = useSyncStatus();

  if (!isOnline) {
    return <OfflineBanner />;
  }

  return <NormalView />;
}
```

### 3. مزامنة حسب الطلب

```typescript
// مزامنة فورية بعد عملية مهمة
await productsRepo.add(importantProduct);
await getSyncEngine().syncNow();
```

### 4. معالجة التعارضات تلقائياً

```typescript
// للبيئات الإنتاجية
useConflictResolution({ autoResolve: "server" });

// للتطوير/التصحيح
useConflictResolution({ autoResolve: "none" });
```

---

## 🔐 الأمان

- ✅ JWT tokens في localStorage (encrypted)
- ✅ تحديث تلقائي عند انتهاء الصلاحية
- ✅ WebSocket محمي بـ JWT
- ✅ HTTPS/WSS في الإنتاج

---

## 📈 المقاييس

- **Sync Success Rate**: نسبة نجاح المزامنة
- **Average Sync Time**: متوسط وقت المزامنة
- **Queue Size**: حجم قائمة الانتظار
- **Conflict Rate**: نسبة التعارضات

استخدم `stats` من SyncEngine:

```typescript
const engine = getSyncEngine();
engine.on("syncComplete", (stats) => {
  trackMetric(
    "sync_success_rate",
    stats.synced / (stats.synced + stats.failed)
  );
  trackMetric("queue_size", stats.pending);
});
```

---

## 🆘 الدعم

للمشاكل أو الأسئلة:

1. راجع [دليل الاستخدام](./SYNC_SYSTEM_USAGE.md)
2. تحقق من [الاختبارات](../__tests__/sync.integration.test.ts)
3. فعّل Debug logs

---

## 📝 Changelog

### v1.0.0 (2024-01-15)

- ✅ نظام المزامنة الأساسي
- ✅ Offline-first support
- ✅ معالجة التعارضات
- ✅ WebSocket real-time updates
- ✅ مكونات UI (SyncStatusIndicator, ConflictResolutionDialog)

---

## 🎯 الخطة المستقبلية

- [ ] ضغط البيانات أثناء النقل
- [ ] تشفير البيانات المحلية
- [ ] مزامنة جزئية (Partial sync)
- [ ] Sync profiles (WiFi only, etc.)
- [ ] Background sync (Service Worker)
- [ ] Conflict resolution strategies (CRDT)

---

**Made with ❤️ for MASR POS PRO**
