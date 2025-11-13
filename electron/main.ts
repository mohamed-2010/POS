import { app, BrowserWindow, ipcMain, Menu } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import "./crypto-polyfill.js"; // Must be imported BEFORE whatsappHandler
import { registerWhatsAppHandlers } from "./whatsappHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// يمنع تشغيل أكثر من نسخة واحدة من التطبيق
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow: BrowserWindow | null = null;

  // تحديد مسارات الملفات بشكل صحيح
  if (app.isPackaged) {
    // في نسخة الـ release - dist موجود في Resources/dist
    process.env.DIST = path.join(process.resourcesPath, "dist");
    process.env.VITE_PUBLIC = path.join(process.resourcesPath);
  } else {
    // في بيئة التطوير
    process.env.DIST = path.join(__dirname, "../dist");
    process.env.VITE_PUBLIC = path.join(__dirname, "../public");
  }

  // تعطيل GPU Acceleration للـ Windows 7
  if (process.platform === "win32") {
    app.disableHardwareAcceleration();
  }

  // إعداد رابط التطبيق في بيئة التطوير
  if (!app.isPackaged) {
    app.setAsDefaultProtocolClient("masr-pos", process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  } else {
    app.setAsDefaultProtocolClient("masr-pos");
  }

  function createWindow() {
    // تحديد مسار الأيقونة بشكل صحيح
    let iconPath: string;
    if (app.isPackaged) {
      if (process.platform === "darwin") {
        iconPath = path.join(process.resourcesPath, "icon.icns");
      } else if (process.platform === "win32") {
        iconPath = path.join(process.resourcesPath, "icon.ico");
      } else {
        iconPath = path.join(process.resourcesPath, "icon.png");
      }
    } else {
      if (process.platform === "darwin") {
        iconPath = path.join(__dirname, "../public/icon.icns");
      } else if (process.platform === "win32") {
        iconPath = path.join(__dirname, "../public/icon.ico");
      } else {
        iconPath = path.join(__dirname, "../public/icon.png");
      }
    }

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      title: "H-POS",
      icon: iconPath,
      webPreferences: {
        preload: path.join(__dirname, "preload.mjs"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        webSecurity: !app.isPackaged, // تعطيل web security في packaged app
      },
      // cancel view and window and edit buttons
      titleBarStyle: "hiddenInset",
      titleBarOverlay: true,
      autoHideMenuBar: true,
    });

    // إخفاء القائمة الافتراضية
    mainWindow.setMenuBarVisibility(false);
    mainWindow.removeMenu();

    // إظهار Dev Tools في بيئة التطوير فقط
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }

    // تحميل التطبيق
    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
      // في نسخة الـ release
      if (app.isPackaged) {
        // المسار من Resources/dist/index.html
        const indexPath = path.join(
          process.resourcesPath,
          "dist",
          "index.html"
        );
        mainWindow.loadFile(indexPath);
      } else {
        // في بيئة التطوير
        const indexPath = path.join(process.env.DIST || "", "index.html");
        mainWindow.loadFile(indexPath);
      }
    }

    // معالجة إغلاق النافذة
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  }

  // عند استعداد التطبيق
  app.whenReady().then(() => {
    // Register WhatsApp IPC handlers
    registerWhatsAppHandlers();
    createWindow();
  });

  // عند إغلاق جميع النوافذ
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  // عند تفعيل التطبيق (macOS)
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // عند محاولة فتح نسخة ثانية
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // ==================== IPC Handlers ====================

  // معلومات التطبيق
  ipcMain.handle("get-app-version", () => {
    return app.getVersion();
  });

  ipcMain.handle("get-app-path", () => {
    return app.getAppPath();
  });

  ipcMain.handle("get-user-data-path", () => {
    return app.getPath("userData");
  });

  // ==================== Printer Handlers ====================

  // Get available printers
  ipcMain.handle("printer:get-printers", async () => {
    try {
      if (!mainWindow) return [];
      // Use webContents.getPrintersAsync() for Electron v28+
      const printers = await mainWindow.webContents.getPrintersAsync();
      return printers.map((printer: any) => ({
        name: printer.name,
        displayName: printer.displayName,
        description: printer.description,
        status: printer.status,
        isDefault: printer.isDefault,
        options: printer.options,
      }));
    } catch (error) {
      console.error("Error getting printers:", error);
      return [];
    }
  });

  // Print thermal receipt
  ipcMain.handle(
    "printer:print-thermal",
    async (_event, htmlContent: string, options: any) => {
      try {
        if (!mainWindow) {
          throw new Error("Main window not available");
        }

        // Create hidden window for printing
        const printWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });

        // Load HTML content
        await printWindow.loadURL(
          `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
        );

        // Wait for content to load
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Print configuration
        const printOptions: any = {
          silent: true,
          printBackground: true,
          color: false,
          margins: {
            marginType: "none",
          },
          landscape: false,
          scaleFactor: 100,
          pageSize: {
            width: (options?.paperWidth || 80) * 1000, // Convert mm to microns
            height: 297000, // A4 height in microns
          },
        };

        // Set printer name if specified
        if (options?.printer) {
          printOptions.deviceName = options.printer;
        }

        // Set copies
        if (options?.copies) {
          printOptions.copies = options.copies;
        }

        // Execute print
        await printWindow.webContents.print(printOptions);

        // Close print window
        printWindow.close();

        return { success: true };
      } catch (error) {
        console.error("Print error:", error);
        throw error;
      }
    }
  );
}
