# Good Friend

WIP

## Database

This project uses PostgreSQL via Docker Compose. The database connection details are:

- **Host:** localhost
- **Port:** 5432
- **Database:** goodfriend
- **Username:** goodfriend
- **Password:** password
- **Connection URL:** `postgresql://goodfriend:password@localhost:5432/goodfriend`

### Database Commands

```bash
# Start the database
npm run db:start

# Stop the database
npm run db:stop

# Reset the database (removes all data and recreates)
npm run db:reset
```
