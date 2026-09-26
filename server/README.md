# VOLLEYVERSE Online Identity & Authentication

The realtime server now accepts authenticated account identity before matchmaking.

Flow: AUTH -> AUTH_OK/token -> QUEUE -> 6v6 session.

The server uses the authenticated account's username, region, selected six-player roster and party ID when building the session. This is a prototype identity layer; production authentication and persistent storage are later milestones.