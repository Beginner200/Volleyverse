# VOLLEYVERSE Database Persistence

PostgreSQL persistence has been provisioned for the backend.

Tables:
- accounts
- competitive
- match_history

Set DATABASE_URL to the Railway PostgreSQL connection string. The server should call db.init() during startup and use the persistence module for account and competitive writes.

The database service is infrastructure; production migrations, backups, replicas, and secret rotation remain deployment operations.