# VOLLEYVERSE Online Server

Authoritative multiplayer backend foundation for VOLLEYVERSE.

## Prototype endpoints
- GET /health — server health/session counts
- POST /session — queue a player for a match

The server owns session IDs, player assignment, match ticks, scores/sets state, and matchmaking queues. Gameplay simulation and WebSocket transport are the next backend layer.
