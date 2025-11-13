# Participium - Backend

Backend API for Participium System.

## Tech Stack

- **TypeScript** with **Node.js**
- **Express.js** framework
- **TypeORM** with **SQLite** for database operations

## Installation

```bash
npm install
```

## Setup

Create a `.env` file based on `.env.example`

```bash
cp .env.example .env
```

## Docker Desktop  

```bash
docker-compose up -d
```

## Run

```bash
# Development mode (with auto-restart and TypeScript support)
npm run dev

# Build TypeScript to JavaScript
npm run build

# Production mode (requires build first)
npm start
```

## MinIO Client

http://localhost:9001/

user: minioadmin
pass: minioadmin



## Architecture

This project follows a **layered architecture** pattern:

```
Controller → Service → Repository → DAO → Database
```

### Layer Responsibilities:

- **Controller**: HTTP request/response handling
- **Service**: Business logic and orchestration
- **Repository**: Abstraction layer for data access
- **DAO**: Direct database operations (SQL queries)
- **Database**: SQLite connection and configuration

## Database & Migrations

- **Schema**: TypeORM auto-creates tables from entity classes in `src/models/dao/` (no migration files needed!)
- **Seed Data**: Use migration files in `src/data/migrations/` to populate initial data
- **Database**: SQLite file at `src/data/database.sqlite` (auto-created, git-ignored)

**Workflow**: Define DAO entities → Tables created automatically on startup → Migrations run for seed data

## Project Structure

```
src/
├── app.ts                  # Express app setup
├── config/
│   └── database.ts         # Database configuration
├── constants/              # Application constants
├── controllers/            # HTTP request handlers
├── data/
│   └── migrations/         # Database migrations
├── mappers/                # Data mappers (DTO <-> DAO)
├── middleware/             # Custom middleware
├── models/
│   ├── dao/                # Data Access Objects
│   ├── dto/                # Data Transfer Objects
│   └── errors/             # Custom error classes
├── repositories/           # Data access abstraction layer
├── routes/                 # API route definitions
├── services/               # Business logic layer
└── types/                  # TypeScript type definitions
```

## TypeScript Configuration

The project uses strict TypeScript configuration:
- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Output directory: `dist/`

## Testing

```bash
npm test
```

Tests are located in the `test/` directory and use Jest with ts-jest.

