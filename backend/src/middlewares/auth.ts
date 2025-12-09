import { FastifyRequest, FastifyReply } from "fastify";
import { JWTAccessPayload } from "../config/jwt.js";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Verify JWT token
    const payload = await request.jwtVerify<JWTAccessPayload>();

    // Ensure it's an access token
    if (payload.type !== "access") {
      return reply.code(401).send({
        error: "Invalid token type",
        message: "Access token required",
      });
    }

    // Attach user to request
    request.user = payload;
  } catch (error) {
    return reply.code(401).send({
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
  }
}

export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const payload = await request.jwtVerify<JWTAccessPayload>();
    if (payload.type === "access") {
      request.user = payload;
    }
  } catch {
    // Ignore authentication errors for optional auth
  }
}

// Register the decorator
export function registerAuthDecorator(server: any): void {
  server.decorate("authenticate", authMiddleware);
  server.decorate("optionalAuth", optionalAuth);
}
