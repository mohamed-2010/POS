import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { db } from "./lib/indexedDB";

// تهيئة قاعدة البيانات قبل بدء التطبيق
db.init()
  .then(() => {
    console.log("✅ Database initialized successfully");
    // بدء التطبيق بعد تهيئة قاعدة البيانات
    createRoot(document.getElementById("root")!).render(<App />);
  })
  .catch((error) => {
    console.error("❌ Failed to initialize database:", error);
    // عرض رسالة خطأ للمستخدم
    document.getElementById("root")!.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; direction: rtl;">
        <div style="text-align: center; padding: 20px;">
          <h1 style="color: red;">⚠️ خطأ في تهيئة قاعدة البيانات</h1>
          <p>فشل في تحميل قاعدة البيانات المحلية</p>
          <p style="color: gray; font-size: 12px;">${error}</p>
          <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">
            إعادة المحاولة
          </button>
        </div>
      </div>
    `;
  });
