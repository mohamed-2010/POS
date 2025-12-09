import pino from "pino";
import { env } from "./env.js";
import path from "path";
import fs from "fs";

// Create logs directory if it doesn't exist
if (!fs.existsSync(env.LOG_FILE_PATH)) {
  fs.mkdirSync(env.LOG_FILE_PATH, { recursive: true });
}

const isDevelopment = env.NODE_ENV === "development";

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : {
        targets: [
          // Console output in production
          {
            target: "pino/file",
            options: { destination: 1 }, // stdout
          },
          // Daily rotation file
          {
            target: "pino/file",
            options: {
              destination: path.join(
                env.LOG_FILE_PATH,
                `app-${new Date().toISOString().split("T")[0]}.log`
              ),
            },
          },
        ],
      },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
