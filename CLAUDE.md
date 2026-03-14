# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Headplane is a feature-complete web UI for [Headscale](https://headscale.net), the self-hosted implementation of Tailscale. It allows managing nodes, networks, ACLs, DNS settings, and Headscale configuration through a web interface.

## Common Commands

```bash
# Install dependencies (pnpm is required - enforced by preinstall)
pnpm install

# Development
pnpm run dev                    # Start dev server (requires HEADPLANE_CONFIG_PATH)

# Build & Production
pnpm run build                  # Build for production (React Router build)
pnpm run start                 # Start production server

# Type Checking & Linting
pnpm run typecheck              # Run TypeScript type generation and type checking
pnpm run lint                   # Lint with oxlint
pnpm run format                 # Format with oxfmt

# Testing
pnpm run test:unit              # Run unit tests (vitest --project unit)
pnpm run test:integration       # Run integration tests (vitest --project integration)

# Documentation
pnpm run docs:dev               # Run VitePress dev server
pnpm run docs:build             # Build VitePress docs
```

## Development Notes

- **Required Node**: >=22.18 <23
- **Required pnpm**: >=10.4 <11
- **Config path**: Set `HEADPLANE_CONFIG_PATH=./config.example.yaml` when running dev
- **Testing**: Tests use Vitest with two separate projects (`unit` and `integration`)
- **Run a single test**: Use `vitest run --project unit <test-file>` or `vitest run --project integration <test-file>`

## Architecture

### Tech Stack

- **Framework**: React Router 7 (framework mode) with Vite
- **Database**: Drizzle ORM with LibSQL client
- **Styling**: Tailwind CSS 4 with `@tailwindcss/vite`
- **UI Components**: Custom components + Base UI React + React Aria
- **Testing**: Vitest
- **API Client**: Auto-generated from OpenAPI spec against Headscale

### Route Structure (app/routes.ts)

Routes are defined using React Router's route configuration:

- `/` - Home dashboard (home.tsx)
- `/machines` - Machine/node management with nested routes for individual machines
- `/users` - User management
- `/acls` - Access Control List configuration
- `/dns` - DNS settings management
- `/settings` - Settings with auth-keys and restrictions sub-routes
- `/login`, `/logout`, `/oidc/callback` - Authentication
- `/ssh` - WebSSH console
- `/api/info` - API info endpoint
- `/healthz` - Health check endpoint

### Database

- Uses Drizzle ORM with LibSQL for local SQLite storage
- Database schema defined in app/db/
- Run migrations with `drizzle-kit` commands

### Authentication

- Supports OIDC (OpenID Connect) login providers
- Session management with secure cookies
- Role-based access control

### Components

- Reusable UI components in `app/components/`
- Route-specific components in `app/routes/<feature>/components/`
- Dialogs for CRUD operations in `app/routes/<feature>/dialogs/`

### Key Patterns

- Actions for server-side mutations (named `*-actions.ts`)
- Loaders for data fetching (named `*-loader.ts`)
- Form handling via React Router actions
- Type-safe API calls with auto-generated types from OpenAPI
