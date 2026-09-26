# VOLLEYVERSE Full 6v6 Server Simulation

The authoritative prototype now models 12 player slots: 6 home + 6 away.

### Added
- Six player slots per team
- Setter / OH / MB / Opposite role metadata
- Rotation state and rotation after side-out
- Formation starting positions
- Per-player character IDs from client roster selection
- Server-owned player movement
- Server-owned rally touch counts (max 3 per team)
- Setter-aware set validation
- Serve ownership validation
- Net crossing/boundary checks
- Block interaction near the net
- Best-of-5 set progression
- Snapshot schema v3

This remains a prototype simulation. Detailed rotation legality, libero replacement rules, realistic collision/trajectory modeling, attack-line restrictions, service zones, and complete 12-player online identity mapping remain later refinements.