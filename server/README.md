# VOLLEYVERSE Live PostgreSQL Backend

The authoritative server initializes PostgreSQL before listening, hydrates ranked state on authenticated ranked-state requests, and persists validated match results.

Railway should provide DATABASE_URL using its private Postgres reference. The service listens on PORT and exposes /health plus WebSocket /ws.