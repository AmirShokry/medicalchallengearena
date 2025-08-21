# Medical Challenge Arena

A comprehensive medical education platform built with Vue.js/Nuxt.js and powered by a Turborepo monorepo structure.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for external dependencies)

## Quick Start

1. **Start external dependencies:**

   ```sh
   # Using PowerShell (Windows)
   .\docker\manage.ps1 start dev

   # Or using bash (Linux/macOS)
   ./docker/manage.sh start dev

   # Or using Docker Compose directly
   docker-compose up -d
   ```

2. **Setup environment files:**

   ```sh
   .\docker\manage.ps1 setup
   ```

3. **Install dependencies:**

   ```sh
   npm install
   ```

4. **Run database migrations:**

   ```sh
   npm run db:push
   ```

5. **Start the development servers:**
   ```sh
   npm run dev
   ```

## What's inside?

This Medical Challenge Arena includes the following packages/apps:

### Apps and Packages

- `dashboard`: a [Nuxt](https://nuxt.com/) admin dashboard application
- `game`: a [Nuxt](https://nuxt.com/) game client application
- `database`: PostgreSQL database package with Drizzle ORM
- `redis`: Redis cache and session storage package
- `types`: shared TypeScript type definitions
- `utils`: shared utility functions
- `tsconfig`: shared TypeScript configurations

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

## External Dependencies

The application requires the following external services:

- **PostgreSQL 16** - Main database
- **Redis 7** - Cache and session storage

These are provided via Docker Compose. See the [Docker Setup Guide](./docker/README.md) for detailed information.

### Development Tools (Optional)

- **pgAdmin** - PostgreSQL management interface
- **Redis Commander** - Redis management interface
- **Mailhog** - Email testing server

## Docker Services

Quick commands for managing Docker services:

```sh
# Start all services
docker-compose up -d

# Start only core services (PostgreSQL + Redis)
.\docker\manage.ps1 start core

# View service status
.\docker\manage.ps1 status

# View logs
.\docker\manage.ps1 logs

# Stop all services
docker-compose down
```

For detailed Docker management, see `docker/README.md`.

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```
cd my-turborepo
pnpm build
```

### Develop

To develop all apps and packages, run the following command:

```
cd my-turborepo
pnpm dev
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

```
cd my-turborepo
npx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```
npx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.com/docs/reference/configuration)
- [CLI Usage](https://turborepo.com/docs/reference/command-line-reference)
