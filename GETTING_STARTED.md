# 🚀 Getting Started - Medical Challenge Arena

A step-by-step guide to set up and run the Medical Challenge Arena project locally.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and **npm**
- **Docker Desktop** (for PostgreSQL and Redis)
- **Git**

## 🏃‍♂️ Quick Start

Follow these steps in order to get the project running:

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/AmirShokry/medicalchallengearena.git
cd medicalchallengearena
npm install
```

### 2. Start External Services (Database & Cache)

Start PostgreSQL and Redis using Docker:

```bash
# Start all services with development tools
docker-compose up -d

# OR start only core services (PostgreSQL + Redis)
.\docker\manage.ps1 start core
```

**Wait for services to be ready** (usually 30-60 seconds for first run).

### 3. Setup Environment Files

```bash
# Copy example environment files
.\docker\manage.ps1 setup

# OR manually copy:
# cp packages/database/.env.example packages/database/.env
# cp packages/redis/.env.example packages/redis/.env
```

### 4. 🔥 **IMPORTANT: Push Database Schema**

**⚠️ You MUST run this command before starting the applications:**

```bash
npm run db:push
```

This command:

- Creates all database tables and schemas
- Applies any pending migrations
- Sets up the database structure using Drizzle ORM

**❌ Without this step, the applications will fail to start!**

### 5. Start Development Servers

```bash
# Start all applications
npm run dev

# OR start individual apps:
npm run game      # Game client on http://localhost:3000
npm run dashboard # Admin dashboard on http://localhost:3001
```

## 🎯 Access Your Applications

After successful setup:

| Application         | URL                   | Description          |
| ------------------- | --------------------- | -------------------- |
| **Game Client**     | http://localhost:3000 | Main game interface  |
| **Admin Dashboard** | http://localhost:3001 | Administrative panel |
| **pgAdmin**         | http://localhost:5050 | Database management  |
| **Redis Commander** | http://localhost:8081 | Redis management     |

## 🔧 Common Commands

### Database Operations

```bash
# Push schema changes (run this after any schema updates)
npm run db:push

# Generate migrations (if using migration workflow)
npm run db:generate

# Reset database (destructive!)
.\docker\manage.ps1 reset
```

### Docker Management

```bash
# Check service status
.\docker\manage.ps1 status

# View logs
.\docker\manage.ps1 logs

# Stop all services
docker-compose down

# Restart services
.\docker\manage.ps1 restart
```

### Development

```bash
# Run specific app
npm run game
npm run dashboard

# Build all apps
npm run build

# Lint code
npm run lint
```

## 🛠️ Troubleshooting

### Database Connection Issues

1. **Check if PostgreSQL is running:**

   ```bash
   .\docker\manage.ps1 status
   ```

2. **If services aren't healthy, restart them:**

   ```bash
   docker-compose restart postgres redis
   ```

3. **Check database connection:**
   ```bash
   docker-compose exec postgres psql -U postgres -d medicalchallenge -c "SELECT version();"
   ```

### Application Won't Start

1. **Ensure you ran database push:**

   ```bash
   npm run db:push
   ```

2. **Check environment files exist:**
   - `packages/database/.env`
   - `packages/redis/.env`

3. **Verify services are running:**
   ```bash
   .\docker\manage.ps1 status
   ```

### Port Conflicts

If you get port errors, check what's running on these ports:

- `3000` - Game client
- `3001` - Dashboard
- `5432` - PostgreSQL
- `6379` - Redis
- `5050` - pgAdmin
- `8081` - Redis Commander

Stop conflicting services or modify ports in `docker-compose.yml`.

## 🔄 Daily Development Workflow

1. **Start your day:**

   ```bash
   docker-compose up -d    # Start services
   npm run dev            # Start development
   ```

2. **After database schema changes:**

   ```bash
   npm run db:push        # Apply schema changes
   ```

3. **End of day:**
   ```bash
   docker-compose stop    # Stop services (keeps data)
   ```

## 📁 Project Structure

```
medicalchallengearena/
├── apps/
│   ├── dashboard/     # Admin dashboard (Nuxt.js)
│   └── game/         # Game client (Nuxt.js)
├── packages/
│   ├── database/     # Database package (Drizzle ORM)
│   ├── redis/        # Redis package
│   ├── types/        # Shared TypeScript types
│   └── utils/        # Shared utilities
├── docker/           # Docker configuration
├── docker-compose.yml
└── package.json
```

## 🆘 Need Help?

- **Docker Issues:** Check `docker/README.md`
- **Database Problems:** Ensure `npm run db:push` was successful
- **App Errors:** Check the terminal output for specific error messages

## 🔐 Default Credentials (Development)

- **PostgreSQL:** `postgres:postgres123`
- **pgAdmin:** `admin@medicalchallenge.com:admin123`
- **Redis:** No authentication required

**⚠️ Never use these credentials in production!**

---

## 🎉 You're Ready!

Once all steps are complete, you should have:

- ✅ PostgreSQL and Redis running
- ✅ Database schema applied
- ✅ Applications running on localhost
- ✅ Access to development tools

Happy coding! 🚀
