# نظام المزامنة - دليل الاستخدام

## 🚀 البداية السريعة

### 1. تهيئة النظام

في ملف `main.tsx` أو `App.tsx`:

```typescript
import { initializeInfrastructure } from "@/infrastructure";

// عند بدء التطبيق
await initializeInfrastructure({
  apiBaseURL: "http://localhost:3030",
  wsURL: "ws://localhost:3031",
  enableSync: true,
  syncInterval: 5 * 60 * 1000, // 5 دقائق
});
```

### 2. استخدام SyncableRepository

بدلاً من `IndexedDBRepository`، استخدم `SyncableRepository`:

```typescript
import { SyncableRepository } from "@/infrastructure/database/SyncableRepository";
import { getIndexedDBClient } from "@/infrastructure/database/IndexedDBClient";

// إنشاء Repository مع مزامنة تلقائية
const productsRepo = new SyncableRepository(getIndexedDBClient(), "products");

// CRUD operations ستضاف تلقائياً لقائمة المزامنة
await productsRepo.add({
  id: "uuid-1",
  name: "منتج جديد",
  price: 100,
});

await productsRepo.update({
  id: "uuid-1",
  name: "منتج محدث",
  price: 150,
});

await productsRepo.delete("uuid-1");
```

### 3. إضافة مؤشر حالة المزامنة للواجهة

```typescript
import { SyncStatusIndicator } from "@/components/sync/SyncStatusIndicator";

export function Layout() {
  return (
    <div>
      <header>
        {/* في شريط العلوي */}
        <SyncStatusIndicator />
      </header>
      <main>{/* محتوى التطبيق */}</main>
    </div>
  );
}
```

### 4. معالجة التعارضات

```typescript
import { useConflictResolution } from "@/hooks/useConflictResolution";
import { ConflictResolutionDialog } from "@/components/sync/ConflictResolutionDialog";

export function App() {
  const {
    currentConflict,
    isDialogOpen,
    conflictCount,
    handleResolve,
    handleCloseDialog,
  } = useConflictResolution({
    autoResolve: "none", // أو 'server' أو 'local' للحل التلقائي
  });

  return (
    <>
      {/* التطبيق */}

      {/* حوار حل التعارضات */}
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

## 📚 المكونات الرئيسية

### FastifyClient

عميل HTTP مع تحديث تلقائي للـ JWT:

```typescript
import { getFastifyClient } from "@/infrastructure";

const client = getFastifyClient();

// تسجيل دخول
await client.login("username", "password");

// استدعاء API (التوكن يضاف تلقائياً)
const products = await client.get("/products");

// تحديث
await client.put("/products/uuid", { name: "اسم جديد" });

// حذف
await client.delete("/products/uuid");
```

### WebSocketClient

اتصال WebSocket مع إعادة اتصال تلقائية:

```typescript
import { getWebSocketClient } from "@/infrastructure";

const ws = getWebSocketClient();

// الاتصال
ws.connect();

// الاستماع للأحداث
ws.on("connected", () => {
  console.log("متصل");
});

ws.on("message", (data) => {
  console.log("رسالة جديدة:", data);
});

ws.on("sync", (syncData) => {
  console.log("تحديث مزامنة:", syncData);
});

// إرسال رسالة
ws.send({ type: "ping" });

// قطع الاتصال
ws.disconnect();
```

### SyncEngine

محرك المزامنة الرئيسي:

```typescript
import { getSyncEngine } from "@/infrastructure";

const syncEngine = getSyncEngine();

// بدء المزامنة التلقائية
await syncEngine.start();

// مزامنة فورية
await syncEngine.syncNow();

// إيقاف المزامنة
await syncEngine.stop();

// إضافة للقائمة يدوياً (نادراً)
await syncEngine.addToQueue("products", "uuid", "create", productData);

// الاستماع للأحداث
syncEngine.on("syncComplete", (stats) => {
  console.log(`تمت مزامنة ${stats.synced} عنصر`);
});

syncEngine.on("online", () => {
  console.log("عاد الاتصال");
});

syncEngine.on("offline", () => {
  console.log("فقد الاتصال");
});
```

### SyncQueue

قائمة الانتظار (للاستخدام الداخلي):

```typescript
import { getSyncQueue } from "@/infrastructure";

const queue = getSyncQueue();

// الحصول على العناصر المعلقة
const pending = await queue.getPending();

// إحصائيات
const stats = await queue.getStats();
console.log(`${stats.pending} معلق، ${stats.failed} فشل`);
```

## 🔄 سير عمل المزامنة

### عند الإضافة/التحديث/الحذف المحلي:

1. ✅ حفظ في IndexedDB
2. ✅ إضافة للـ SyncQueue
3. ✅ إذا كان متصل: محاولة مزامنة فورية
4. ✅ إذا لم يكن متصل: انتظار الاتصال

### عند المزامنة:

1. 📤 **Push**: إرسال التغييرات المحلية للخادم
2. 📥 **Pull**: جلب التغييرات من الخادم
3. ⚡ **Real-time**: استقبال تحديثات فورية عبر WebSocket

### عند التعارض:

1. 🔍 اكتشاف التعارض (local_updated_at vs server_updated_at)
2. ⏸️ إيقاف المزامنة
3. 🎯 عرض حوار الحل
4. ✅ تطبيق الحل (server/local/skip)
5. ▶️ استئناف المزامنة

## 🎛️ الإعدادات

### تخصيص فترة المزامنة:

```typescript
await initializeInfrastructure({
  apiBaseURL: "http://localhost:3030",
  wsURL: "ws://localhost:3031",
  syncInterval: 10 * 60 * 1000, // 10 دقائق
});
```

### تعطيل المزامنة التلقائية:

```typescript
await initializeInfrastructure({
  apiBaseURL: "http://localhost:3030",
  wsURL: "ws://localhost:3031",
  enableSync: false,
});

// مزامنة يدوية فقط
const syncEngine = getSyncEngine();
await syncEngine.syncNow();
```

### حل تلقائي للتعارضات:

```typescript
// دائماً استخدام بيانات الخادم
useConflictResolution({ autoResolve: "server" });

// دائماً استخدام البيانات المحلية
useConflictResolution({ autoResolve: "local" });

// عرض حوار للمستخدم
useConflictResolution({ autoResolve: "none" });
```

## 🧪 اختبار النظام

### اختبار Offline Mode:

1. افتح DevTools → Network → Offline
2. قم بإضافة/تحديث بيانات
3. تحقق من `SyncQueue` (يجب أن تكون هناك عناصر معلقة)
4. عد للاتصال → يجب أن تتم المزامنة تلقائياً

### اختبار التعارضات:

1. افصل الإنترنت
2. حدث سجل محدد على الجهاز
3. حدث نفس السجل على جهاز آخر أو عبر API
4. اتصل بالإنترنت
5. يجب أن يظهر حوار حل التعارض

### مراقبة أحداث المزامنة:

```typescript
const syncEngine = getSyncEngine();

syncEngine.on("syncStart", () => console.log("بدأت المزامنة"));
syncEngine.on("syncComplete", (stats) => console.log("انتهت:", stats));
syncEngine.on("syncError", (error) => console.error("خطأ:", error));
syncEngine.on("itemSynced", (item) => console.log("تمت مزامنة:", item));
syncEngine.on("conflict", (conflict) => console.warn("تعارض:", conflict));
```

## 🔒 الأمان

- JWT Tokens محفوظة في localStorage
- تحديث تلقائي للتوكن عند انتهاء صلاحيته
- جميع الطلبات تحتوي على Authorization header
- WebSocket محمي بالتوكن

## 📊 الأداء

- **Batch Processing**: معالجة 50 عنصر في الدفعة
- **Retry Logic**: 3 محاولات مع exponential backoff
- **Debouncing**: تجميع التغييرات المتتالية
- **IndexedDB**: قاعدة بيانات محلية سريعة

## 🐛 التشخيص

### تفعيل Logs:

```typescript
// في console
localStorage.setItem("debug", "sync:*");
```

### مراجعة SyncQueue:

```typescript
const queue = getSyncQueue();
const pending = await queue.getPending();
console.table(pending);
```

### إعادة تعيين المزامنة:

```typescript
const queue = getSyncQueue();
await queue.clear(); // حذف جميع العناصر
```

## 🆘 المشاكل الشائعة

### المزامنة لا تعمل:

```typescript
// تأكد من التهيئة
const syncEngine = getSyncEngine();
if (!syncEngine) {
  console.error("SyncEngine not initialized");
}

// تأكد من الاتصال
console.log("Online:", navigator.onLine);

// تأكد من التوكن
const client = getFastifyClient();
console.log("Authenticated:", client.isAuthenticated());
```

### تعارضات مستمرة:

- تأكد من مزامنة الساعة على جميع الأجهزة
- استخدم حل تلقائي مؤقتاً: `autoResolve: 'server'`
- تحقق من `local_updated_at` و `server_updated_at`

### بطء المزامنة:

```typescript
// قلل حجم الدفعة
const syncEngine = await createSyncEngine({
  batchSize: 25, // بدلاً من 50
});
```

## 📖 الخطوات التالية

1. ✅ تكامل مع repositories الموجودة
2. ✅ إضافة مؤشر المزامنة للواجهة
3. ✅ اختبار سيناريوهات Offline
4. ✅ معالجة التعارضات
5. 📊 إضافة تحليلات المزامنة
6. 🔔 إشعارات عند فشل المزامنة
7. 📦 تصدير/استيراد البيانات
