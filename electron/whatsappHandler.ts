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
        });
      }

      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut;

        if (shouldReconnect) {
          console.log("Reconnecting WhatsApp...", accountId);
          setTimeout(() => initializeAccount(accountId, accountPhone), 3000);
        } else {
          activeSockets.delete(accountId);
          accountStates.set(accountId, {
            status: "disconnected",
            phone: accountPhone,
          });
        }
      } else if (connection === "open") {
        accountStates.set(accountId, {
          status: "connected",
          phone: accountPhone,
        });
        console.log("WhatsApp connected successfully:", accountId);
      } else if (connection === "connecting") {
        accountStates.set(accountId, {
          status: "connecting",
          phone: accountPhone,
        });
      }
    });

    // Save credentials on update
    sock.ev.on("creds.update", saveCreds);

    return {
      success: true,
      status: "connecting",
      message: "Initializing WhatsApp connection...",
    };
  } catch (error: any) {
    console.error("Failed to initialize WhatsApp account:", error);
    accountStates.set(accountId, {
      status: "failed",
      error: error.message,
    });
    return {
      success: false,
      status: "failed",
      message: error.message,
    };
  }
}

/**
 * Get account status and QR code
 */
function getAccountState(accountId: string) {
  return accountStates.get(accountId) || { status: "disconnected" };
}

/**
 * Send text message
 */
async function sendTextMessage(accountId: string, to: string, message: string) {
  try {
    const sock = activeSockets.get(accountId);
    if (!sock) {
      throw new Error("WhatsApp account not connected");
    }

    // Format phone number to international format
    const formattedNumber = to.includes("@s.whatsapp.net")
      ? to
      : `${to.replace(/\D/g, "")}@s.whatsapp.net`;

    await sock.sendMessage(formattedNumber, { text: message });

    return {
      success: true,
      message: "Message sent successfully",
    };
  } catch (error: any) {
    console.error("Failed to send message:", error);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Send media message (image, document, video)
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
      throw new Error("WhatsApp account not connected");
    }

    const formattedNumber = to.includes("@s.whatsapp.net")
      ? to
      : `${to.replace(/\D/g, "")}@s.whatsapp.net`;

    // Fetch media from URL
    const response = await fetch(mediaUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

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

    await sock.sendMessage(formattedNumber, messageContent);

    return {
      success: true,
      message: "Media sent successfully",
    };
  } catch (error: any) {
    console.error("Failed to send media:", error);
    return {
      success: false,
      message: error.message,
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
      message: "Disconnected successfully",
    };
  } catch (error: any) {
    console.error("Failed to disconnect:", error);
    return {
      success: false,
      message: error.message,
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
