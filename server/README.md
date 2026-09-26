# VOLLEYVERSE Authoritative Volleyball Simulation

The server now owns the prototype rally simulation.

- Player positions are server-authoritative.
- Client inputs are validated/clamped before simulation.
- Serve, pass, set, spike, dig and block actions are processed server-side.
- Ball velocity/gravity and court-boundary point detection run server-side.
- Sets use 25 points (15 in set 5), win-by-2, first to 3 sets.
- Server emits match snapshots at 20 Hz.
- Disconnects receive a 15-second grace period before AI takeover.

This is still a prototype simulation: collision/net physics, six-player formations, detailed volleyball rules, authentication, persistence and anti-cheat remain future backend work.