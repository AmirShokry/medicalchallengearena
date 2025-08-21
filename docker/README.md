# Docker Setup for Medical Challenge Arena

This Docker Compose configuration provides all the external dependencies needed for the Medical Challenge Arena application.

## Services Included

### Core Services

- **PostgreSQL 16** - Main database on port `5432`
- **Redis 7** - Cache and session storage on port `6379`

### Development Tools (Optional)

- **pgAdmin** - PostgreSQL management interface on port `5050`
- **Redis Commander** - Redis management interface on port `8081`
- **Mailhog** - Email testing server on ports `1025` (SMTP) and `8025` (Web UI)

## Quick Start

1. **Start all services:**

   ```bash
   docker-compose up -d
   ```

2. **View logs:**

   ```bash
   docker-compose logs -f
   ```

3. **Stop all services:**

   ```bash
   docker-compose down
   ```

4. **Stop and remove volumes (⚠️ This will delete all data):**
   ```bash
   docker-compose down -v
   ```

## Service Access

| Service         | URL                   | Credentials                           |
| --------------- | --------------------- | ------------------------------------- |
| PostgreSQL      | `localhost:5432`      | `postgres:postgres123`                |
| Redis           | `localhost:6379`      | No password                           |
| pgAdmin         | http://localhost:5050 | `admin@medicalchallenge.com:admin123` |
| Redis Commander | http://localhost:8081 | No authentication                     |
| Mailhog Web UI  | http://localhost:8025 | No authentication                     |

## Environment Configuration

1. **Copy example environment files:**

   ```bash
   cp packages/database/.env.example packages/database/.env
   cp packages/redis/.env.example packages/redis/.env
   ```

2. **Update environment variables in the `.env` files as needed.**

## Database Setup

After starting the services, you'll have:

- Main database: `medicalchallenge`
- Development database: `medicalchallenge_dev`
- Test database: `medicalchallenge_test`
- Application user: `medicalapp` (password: `medicalapp123`)

## Running Migrations

Once the database is running, execute your Drizzle migrations:

```bash
npm run db:push
```

## Individual Service Management

### Start only PostgreSQL and Redis:

```bash
docker-compose up -d postgres redis
```

### Start with development tools:

```bash
docker-compose up -d postgres redis pgadmin redis-commander
```

### Restart a specific service:

```bash
docker-compose restart postgres
```

## Data Persistence

Data is persisted in named Docker volumes:

- `medicalchallenge_postgres_data` - PostgreSQL data
- `medicalchallenge_redis_data` - Redis data
- `medicalchallenge_pgadmin_data` - pgAdmin configuration

## Troubleshooting

### Port Conflicts

If you have existing services running on the same ports, either:

1. Stop the conflicting services
2. Modify the port mappings in `docker-compose.yml`

### Connection Issues

- Ensure Docker is running
- Check if services are healthy: `docker-compose ps`
- View service logs: `docker-compose logs [service-name]`

### Database Connection

Test PostgreSQL connection:

```bash
docker-compose exec postgres psql -U postgres -d medicalchallenge -c "SELECT version();"
```

### Redis Connection

Test Redis connection:

```bash
docker-compose exec redis redis-cli ping
```

## Production Considerations

For production deployment:

1. **Change default passwords** in `docker-compose.yml`
2. **Enable Redis authentication** by uncommenting the `requirepass` line in `docker/redis/redis.conf`
3. **Use environment files** instead of hardcoded values
4. **Enable SSL/TLS** for database connections
5. **Remove development tools** (pgAdmin, Redis Commander, Mailhog)
6. **Configure proper backup strategies**
7. **Set up monitoring and logging**

## Security Notes

⚠️ **Warning**: The default configuration uses weak passwords and no authentication for development convenience. Never use these settings in production!

## Custom Configuration

### PostgreSQL

- Custom init scripts: Add `.sql` or `.sh` files to `docker/postgres/init/`
- Configuration: Modify PostgreSQL settings by mounting a custom `postgresql.conf`

### Redis

- Configuration: Edit `docker/redis/redis.conf`
- Memory limits: Adjust `maxmemory` setting based on your needs
