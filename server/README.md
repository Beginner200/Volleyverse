# VOLLEYVERSE Realtime Server

Authoritative multiplayer transport foundation.

## Endpoints
- GET /health
- POST /session
- WebSocket /ws

## Message flow
1. Client connects to /ws.
2. Client sends QUEUE with mode/region.
3. Server creates a session when two compatible players are queued.
4. Server sends SESSION_READY.
5. Client sends INPUT packets.
6. Server emits authoritative SNAPSHOT packets at 20 ticks/sec.
7. PING/PONG provides latency measurement.
8. Disconnect enters a 15-second reconnect grace period, then AI takeover is marked.

This is the real-time backend foundation. Full volleyball simulation authority, authentication, persistent database state, anti-cheat and production matchmaking remain separate milestones.