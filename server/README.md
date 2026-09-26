# VOLLEYVERSE Smart Matchmaking

Adds server-side matchmaking metadata for:
- skill/rating gap
- connection ping gap
- preferred region
- queue wait time
- expanding compatibility windows

Initial rating window starts at 150 and expands with wait time up to 600. Ping compatibility starts around 80 ms and expands with wait time up to 180 ms. SEA/ASIA/GLOBAL-style region compatibility is supported.

This is a prototype matching policy, not a production competitive algorithm.