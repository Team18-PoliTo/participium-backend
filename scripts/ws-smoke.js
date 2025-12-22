// Simple smoke test for the internal WebSocket comment stream
// Usage:
//   API_BASE_URL=http://localhost:3000 WS_TOKEN=<jwt> REPORT_ID=123 node scripts/ws-smoke.js
// Or via npm script once added: npm run ws:smoke -- (env vars)

import "dotenv/config.js";
import { io } from "socket.io-client";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const TOKEN = process.env.WS_TOKEN || process.env.JWT_TOKEN || "";
const REPORT_ID = Number(process.env.REPORT_ID || process.env.WS_REPORT_ID);

if (!TOKEN) {
  console.error("WS_TOKEN (or JWT_TOKEN) is required for the handshake");
  process.exit(1);
}

if (!Number.isFinite(REPORT_ID) || REPORT_ID <= 0) {
  console.error("REPORT_ID must be a positive number");
  process.exit(1);
}

console.log(
  "Connecting to",
  `${API_BASE_URL}/ws/internal`,
  "for report",
  REPORT_ID
);

const socket = io(`${API_BASE_URL}/ws/internal`, {
  auth: { token: TOKEN },
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
  socket.emit("join_report", { reportId: REPORT_ID });
  console.log("Joined room report:" + REPORT_ID);
});

socket.on("comment.created", (payload) => {
  console.log("comment.created =>", payload);
});

socket.on("connect_error", (err) => {
  console.error(
    "Connect error:",
    err.message,
    err?.description || "",
    err?.context || ""
  );
});

socket.on("error", (err) => {
  console.error("Socket error:", err);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});