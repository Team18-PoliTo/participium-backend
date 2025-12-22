# WebSocket API (Internal)

This document describes the backend-only WebSocket used for internal users to receive live updates when comments are created on a report.

- Namespace: `/ws/internal`
- Auth: JWT required in the connection handshake
- Rooms: `report:<id>` to scope updates per report
- Event: `comment.created`

## Authentication

Connections must include a valid JWT for an internal user during the handshake. Two supported ways:

1) Via `auth.token` in the Socket.IO client options
2) Via `Authorization: Bearer <token>` header

The server validates the token and rejects connections from non-internal users.

## Rooms

Clients join a room per report to receive targeted updates:
- Join: `join_report` with `{ reportId: number }`
- Leave: `leave_report` with `{ reportId: number }`

Room format: `report:<id>`

## Events

- `comment.created`: Emitted after a new comment is saved for the report. Delivered only to clients in the corresponding `report:<id>` room.

Payload shape:
```json
{
  "id": number,
  "comment": string,
  "commentOwner_id": number,
  "creation_date": string | Date,
  "report_id": number
}
```

Notes:
- The database keeps UTC timestamps. REST GET endpoints localize to Rome time, but the WebSocket payload mirrors the service response and may carry the raw UTC timestamp as returned by the service.

## Client Example (Socket.IO)

```ts
import { io } from 'socket.io-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const token = '<your-internal-jwt>';

const socket = io(`${API_BASE_URL}/ws/internal`, {
  auth: { token },
  // no CORS tweaks required server-side per current setup
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  socket.emit('join_report', { reportId: 123 });
});

socket.on('comment.created', (payload) => {
  console.log('New comment:', payload);
  // Update UI for report payload.report_id
});

// Optional: leave when navigating away
function cleanup() {
  socket.emit('leave_report', { reportId: 123 });
  socket.close();
}
```

## Server Notes

- The namespace is initialized in `server.ts` using Socket.IO.
- Authentication is enforced at the namespace level; only internal users are allowed.
- Emission occurs in the report service after a successful comment creation.

## Troubleshooting

- 401/Forbidden on connect: Ensure the JWT is valid and belongs to an internal user.
- Not receiving events: Verify you emitted `join_report` with the correct numeric `reportId` and stayed connected.
- Cross-origin: CORS settings are unchanged server-side; ensure the client uses the correct `API_BASE_URL` origin.
