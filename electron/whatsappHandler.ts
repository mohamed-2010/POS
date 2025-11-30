import { ipcMain } from "electron";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import { app } from "electron";

// Store active WhatsApp connections
const activeSockets = new Map<string, WASocket>();
const accountStates = new Map<string, any>();

// Simple logger replacement (avoiding pino issues)
const logger = {
  trace: (...args: any[]) => {}, // Silent trace logging
  debug: (...args: any[]) => {}, // Silent debug logging
  info: (...args: any[]) => console.log("[WhatsApp]", ...args),
  warn: (...args: any[]) => console.warn("[WhatsApp]", ...args),
  error: (...args: any[]) => console.error("[WhatsApp]", ...args),
  fatal: (...args: any[]) => console.error("[WhatsApp FATAL]", ...args),
  child: () => logger,
  level: "info", // Minimum log level
};

/**
 * رسائل الأخطاء بالعربي للمستخدم
 */
const ERROR_MESSAGES = {
  // أخطاء الاتصال
  CONNECTION_TIMEOUT: "⏱️ انتهت مهلة الاتصال - جرب مرة تانية",
  CONNECTION_FAILED: "❌ فشل الاتصال - تأكد من الإنترنت وجرب تاني",
  NO_CONNECTION: "📵 الحساب مش متصل - اربط الحساب الأول",
  RECONNECTING: "🔄 جاري إعادة الاتصال...",

  // أخطاء إرسال الرسائل
  SEND_FAILED: "❌ فشل إرسال الرسالة - جرب مرة تانية",
  SEND_TIMEOUT: "⏱️ الرسالة أخذت وقت طويل - الإنترنت بطيء",
  INVALID_NUMBER: "📱 رقم الهاتف غلط - تأكد من الرقم",
  NUMBER_NOT_ON_WHATSAPP: "📱 الرقم ده مش على واتساب",

  // أخطاء الميديا
  MEDIA_FAILED: "🖼️ فشل إرسال الصورة/الملف",
  MEDIA_TOO_LARGE: "📁 الملف كبير جداً - أقصى حجم 16 ميجا",
  MEDIA_DOWNLOAD_FAILED: "⬇️ فشل تحميل الملف",

  // أخطاء عامة
  UNKNOWN_ERROR: "⚠️ حصل خطأ - جرب مرة تانية",
  ACCOUNT_LOGGED_OUT: "🔐 تم تسجيل الخروج - اربط الحساب من جديد",
  SESSION_EXPIRED: "🔑 الجلسة انتهت - امسح QR Code من جديد",

  // أخطاء الشبكة
  NO_INTERNET: "🌐 مفيش إنترنت - تأكد من الاتصال",
  SLOW_INTERNET: "🐌 الإنترنت بطيء جداً",
};

/**
 * تحويل الخطأ لرسالة مفهومة
 */
function getArabicErrorMessage(error: any): string {
  const errorMessage = error?.message?.toLowerCase() || "";
  const statusCode =
    error?.output?.statusCode || error?.data?.output?.statusCode;

  // Timeout errors
  if (
    errorMessage.includes("timed out") ||
    errorMessage.includes("timeout") ||
    statusCode === 408
  ) {
    return ERROR_MESSAGES.SEND_TIMEOUT;
  }

  // Connection errors
  if (
    errorMessage.includes("not connected") ||
    errorMessage.includes("no connection")
  ) {
    return ERROR_MESSAGES.NO_CONNECTION;
  }

  if (
    errorMessage.includes("connection closed") ||
    errorMessage.includes("connection failed")
  ) {
    return ERROR_MESSAGES.CONNECTION_FAILED;
  }

  // Number errors
  if (errorMessage.includes("invalid") && errorMessage.includes("number")) {
    return ERROR_MESSAGES.INVALID_NUMBER;
  }

  if (
    errorMessage.includes("not on whatsapp") ||
    errorMessage.includes("not registered")
  ) {
    return ERROR_MESSAGES.NUMBER_NOT_ON_WHATSAPP;
  }

  // Session errors
  if (statusCode === DisconnectReason.loggedOut) {
    return ERROR_MESSAGES.ACCOUNT_LOGGED_OUT;
  }

  // Media errors
  if (errorMessage.includes("media") || errorMessage.includes("file")) {
    if (errorMessage.includes("too large") || errorMessage.includes("size")) {
      return ERROR_MESSAGES.MEDIA_TOO_LARGE;
    }
    return ERROR_MESSAGES.MEDIA_FAILED;
  }

  // Network errors
  if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
    return ERROR_MESSAGES.NO_INTERNET;
  }

  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Get session directory for WhatsApp auth state
 */
function getSessionPath(accountId: string): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "wa_sessions", accountId);
}

/**
 * Initialize WhatsApp account connection
 */
async function initializeAccount(accountId: string, accountPhone: string) {
  try {
    const sessionPath = getSessionPath(accountId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      browser: ["MASR POS Pro", "Chrome", "1.0.0"],
      generateHighQualityLinkPreview: true,
      connectTimeoutMs: 60000, // 60 seconds timeout
      defaultQueryTimeoutMs: 60000,
      retryRequestDelayMs: 250,
    });

    // Store socket
    activeSockets.set(accountId, sock);

    // Handle QR code
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Send QR code to renderer
        accountStates.set(accountId, {
          status: "qr",
          qrCode: qr,
          phone: accountPhone,
          message: "📱 امسح الكود ده من الموبايل",
        });
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        let errorMessage = ERROR_MESSAGES.CONNECTION_FAILED;

        if (statusCode === DisconnectReason.loggedOut) {
          errorMessage = ERROR_MESSAGES.ACCOUNT_LOGGED_OUT;
          activeSockets.delete(accountId);
          accountStates.set(accountId, {
            status: "disconnected",
            phone: accountPhone,
            error: errorMessage,
            message: errorMessage,
          });
        } else if (shouldReconnect) {
          console.log("Reconnecting WhatsApp...", accountId);
          accountStates.set(accountId, {
            status: "connecting",
            phone: accountPhone,
            message: ERROR_MESSAGES.RECONNECTING,
          });
          setTimeout(() => initializeAccount(accountId, accountPhone), 3000);
        } else {
          activeSockets.delete(accountId);
          accountStates.set(accountId, {
            status: "disconnected",
            phone: accountPhone,
            error: errorMessage,
            message: errorMessage,
          });
        }
      } else if (connection === "open") {
        // Get the real phone number from WhatsApp
        const realPhone =
          sock.user?.id?.split(":")[0] ||
          sock.user?.id?.split("@")[0] ||
          accountPhone;

        accountStates.set(accountId, {
          status: "connected",
          phone: realPhone,
          message: "✅ تم الاتصال بنجاح!",
        });
        console.log(
          "WhatsApp connected successfully:",
          accountId,
          "Phone:",
          realPhone
        );
      } else if (connection === "connecting") {
        accountStates.set(accountId, {
          status: "connecting",
          phone: accountPhone,
          message: "🔄 جاري الاتصال...",
        });
      }
    });

    // Save credentials on update
    sock.ev.on("creds.update", saveCreds);

    return {
      success: true,
      status: "connecting",
      message: "🔄 جاري الاتصال بالواتساب...",
      messageAr: "جاري الاتصال بالواتساب...",
    };
  } catch (error: any) {
    console.error("Failed to initialize WhatsApp account:", error);
    const errorMessage = getArabicErrorMessage(error);

    accountStates.set(accountId, {
      status: "failed",
      error: errorMessage,
      message: errorMessage,
    });

    return {
      success: false,
      status: "failed",
      message: errorMessage,
      messageAr: errorMessage,
    };
  }
}

/**
 * Get account status and QR code
 */
function getAccountState(accountId: string) {
  return (
    accountStates.get(accountId) || {
      status: "disconnected",
      message: "📵 الحساب غير متصل",
    }
  );
}

/**
 * Send text message with better error handling
 */
async function sendTextMessage(accountId: string, to: string, message: string) {
  try {
    const sock = activeSockets.get(accountId);
    if (!sock) {
      return {
        success: false,
        message: ERROR_MESSAGES.NO_CONNECTION,
        messageAr: ERROR_MESSAGES.NO_CONNECTION,
      };
    }

    // Validate phone number
    const cleanedNumber = to.replace(/\D/g, "");
    if (cleanedNumber.length < 10) {
      return {
        success: false,
        message: ERROR_MESSAGES.INVALID_NUMBER,
        messageAr: ERROR_MESSAGES.INVALID_NUMBER,
      };
    }

    // Format phone number to international format
    const formattedNumber = to.includes("@s.whatsapp.net")
      ? to
      : `${cleanedNumber}@s.whatsapp.net`;

    // Check if number exists on WhatsApp (optional - can be slow)
    try {
      const results = await sock.onWhatsApp(cleanedNumber);
      if (results && results.length > 0 && !results[0]?.exists) {
        return {
          success: false,
          message: ERROR_MESSAGES.NUMBER_NOT_ON_WHATSAPP,
          messageAr: ERROR_MESSAGES.NUMBER_NOT_ON_WHATSAPP,
        };
      }
    } catch (checkError) {
      // Continue anyway if check fails
      console.warn("Could not verify number:", checkError);
    }

    // Send with timeout
    const sendPromise = sock.sendMessage(formattedNumber, { text: message });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timed out")), 30000)
    );

    await Promise.race([sendPromise, timeoutPromise]);

    return {
      success: true,
      message: "✅ تم إرسال الرسالة بنجاح",
      messageAr: "تم إرسال الرسالة بنجاح",
    };
  } catch (error: any) {
    console.error("Failed to send message:", error);
    const errorMessage = getArabicErrorMessage(error);

    return {
      success: false,
      message: errorMessage,
      messageAr: errorMessage,
      error: error.message,
    };
  }
}

/**
 * Send media message (image, document, video) with better error handling
 */
async function sendMediaMessage(
  accountId: string,
  to: string,
  mediaUrl: string,
  mediaType: "image" | "document" | "video",
  caption?: string,
  filename?: string
) {
  try {
    const sock = activeSockets.get(accountId);
    if (!sock) {
      return {
        success: false,
        message: ERROR_MESSAGES.NO_CONNECTION,
        messageAr: ERROR_MESSAGES.NO_CONNECTION,
      };
    }

    // Validate phone number
    const cleanedNumber = to.replace(/\D/g, "");
    if (cleanedNumber.length < 10) {
      return {
        success: false,
        message: ERROR_MESSAGES.INVALID_NUMBER,
        messageAr: ERROR_MESSAGES.INVALID_NUMBER,
      };
    }

    const formattedNumber = to.includes("@s.whatsapp.net")
      ? to
      : `${cleanedNumber}@s.whatsapp.net`;

    // Fetch media from URL with timeout
    let buffer: Buffer;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(mediaUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to fetch media");
      }

      buffer = Buffer.from(await response.arrayBuffer());

      // Check file size (max 16MB for WhatsApp)
      if (buffer.length > 16 * 1024 * 1024) {
        return {
          success: false,
          message: ERROR_MESSAGES.MEDIA_TOO_LARGE,
          messageAr: ERROR_MESSAGES.MEDIA_TOO_LARGE,
        };
      }
    } catch (fetchError) {
      console.error("Failed to fetch media:", fetchError);
      return {
        success: false,
        message: ERROR_MESSAGES.MEDIA_DOWNLOAD_FAILED,
        messageAr: ERROR_MESSAGES.MEDIA_DOWNLOAD_FAILED,
      };
    }

    let messageContent: any = {};

    switch (mediaType) {
      case "image":
        messageContent = {
          image: buffer,
          caption: caption || "",
        };
        break;
      case "document":
        messageContent = {
          document: buffer,
          fileName: filename || "document.pdf",
          caption: caption || "",
        };
        break;
      case "video":
        messageContent = {
          video: buffer,
          caption: caption || "",
        };
        break;
    }

    // Send with timeout
    const sendPromise = sock.sendMessage(formattedNumber, messageContent);
    const timeoutPromise = new Promise(
      (_, reject) => setTimeout(() => reject(new Error("Timed out")), 60000) // 60 seconds for media
    );

    await Promise.race([sendPromise, timeoutPromise]);

    return {
      success: true,
      message: "✅ تم إرسال الملف بنجاح",
      messageAr: "تم إرسال الملف بنجاح",
    };
  } catch (error: any) {
    console.error("Failed to send media:", error);
    const errorMessage = getArabicErrorMessage(error);

    return {
      success: false,
      message: errorMessage,
      messageAr: errorMessage,
      error: error.message,
    };
  }
}

/**
 * Disconnect account
 */
async function disconnectAccount(accountId: string) {
  try {
    const sock = activeSockets.get(accountId);
    if (sock) {
      await sock.logout();
      activeSockets.delete(accountId);
      accountStates.delete(accountId);
    }
    return {
      success: true,
      message: "✅ تم قطع الاتصال",
      messageAr: "تم قطع الاتصال",
    };
  } catch (error: any) {
    console.error("Failed to disconnect:", error);
    // Force cleanup even if logout fails
    activeSockets.delete(accountId);
    accountStates.delete(accountId);

    return {
      success: true, // Still consider it successful since account is now disconnected
      message: "✅ تم قطع الاتصال",
      messageAr: "تم قطع الاتصال",
    };
  }
}

/**
 * Check if account is connected
 */
function isAccountConnected(accountId: string): boolean {
  const sock = activeSockets.get(accountId);
  return sock !== undefined && sock.user !== undefined;
}

/**
 * Register all WhatsApp IPC handlers
 */
export function registerWhatsAppHandlers() {
  // Initialize account
  ipcMain.handle(
    "whatsapp:init-account",
    async (_, accountId: string, accountPhone: string) => {
      return await initializeAccount(accountId, accountPhone);
    }
  );

  // Get account state (includes QR code)
  ipcMain.handle("whatsapp:get-state", (_, accountId: string) => {
    return getAccountState(accountId);
  });

  // Send text message
  ipcMain.handle(
    "whatsapp:send-text",
    async (_, accountId: string, to: string, message: string) => {
      return await sendTextMessage(accountId, to, message);
    }
  );

  // Send media message
  ipcMain.handle(
    "whatsapp:send-media",
    async (
      _,
      accountId: string,
      to: string,
      mediaUrl: string,
      mediaType: "image" | "document" | "video",
      caption?: string,
      filename?: string
    ) => {
      return await sendMediaMessage(
        accountId,
        to,
        mediaUrl,
        mediaType,
        caption,
        filename
      );
    }
  );

  // Disconnect account
  ipcMain.handle("whatsapp:disconnect", async (_, accountId: string) => {
    return await disconnectAccount(accountId);
  });

  // Check connection status
  ipcMain.handle("whatsapp:is-connected", (_, accountId: string) => {
    return isAccountConnected(accountId);
  });

  console.log("✅ WhatsApp IPC handlers registered");
}
