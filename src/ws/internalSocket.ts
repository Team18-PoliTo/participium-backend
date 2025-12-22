import { Server, Socket, type ExtendedError } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

export type AuthPayload = {
  sub: number;
  kind: string;
  role?: string;
  email?: string;
};

type AuthTokenPayload = jwt.JwtPayload & AuthPayload;

function isAuthTokenPayload(x: unknown): x is AuthTokenPayload {
  return !!x && typeof x === "object" && "sub" in x && "kind" in x;
}

let io: Server | null = null;

/**
 * Initialize Socket.IO namespace for internal users.
 * Namespace: /ws/internal
 * Rooms: report:<id>
 */
export function initInternalSocket(server: HttpServer): void {
  io = new Server(server, {
    // no cors configuration
  });

  const nsp = io.of("/ws/internal");

  // Auth middleware for namespace
  nsp.use((socket: Socket, next: (err?: ExtendedError) => void) => {
    try {
      const token =
        (socket.handshake.auth && (socket.handshake.auth as any).token) ||
        extractBearer(socket.handshake.headers?.authorization as string | undefined);

      if (!token) {
        return next(new Error("Unauthorized: missing token"));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      if (typeof decoded === "string" || !isAuthTokenPayload(decoded)) {
        return next(new Error("Unauthorized: malformed token"));
      }
      if (decoded.kind !== "internal") {
        return next(new Error("Forbidden: not an internal user"));
      }

      (socket.data as any).auth = decoded as AuthPayload;
      next();
    } catch (_err) {
      next(new Error("Unauthorized: invalid token"));
    }
  });

  nsp.on("connection", (socket: Socket) => {
    // Join a report room to receive live comments for that report
    socket.on("join_report", (data: { reportId: number }) => {
      const reportId = Number(data?.reportId);
      if (!Number.isFinite(reportId) || reportId <= 0) return;
      socket.join(roomName(reportId));
    });

    socket.on("leave_report", (data: { reportId: number }) => {
      const reportId = Number(data?.reportId);
      if (!Number.isFinite(reportId) || reportId <= 0) return;
      socket.leave(roomName(reportId));
    });
  });
}

function roomName(reportId: number): string {
  return `report:${reportId}`;
}

function extractBearer(authHeader?: string): string | null {
  if (!authHeader) return null;
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  return token || null;
}

/**
 * Emit comment.created to all clients subscribed to the report room.
 */
export function emitCommentCreated(reportId: number, payload: any): void {
  if (!io) return;
  io.of("/ws/internal").to(roomName(reportId)).emit("comment.created", payload);
}
