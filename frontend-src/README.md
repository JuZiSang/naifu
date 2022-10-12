# NovelAI Web

## Setup

Requires Node 16.9.0 or later.

### Installing dependencies

```bash
corepack pnpm install
```

## Development

### Running a local development instance

```bash
corepack pnpm start
```

The app will run on [http://localhost:3000](http://localhost:3000) by default.

## Running a local production instance

```bash
corepack pnpm run build
corepack pnpm run build:start
```

The app will run on [http://localhost:3000](http://localhost:3000) by default.

## Running tests and checks

```bash
corepack pnpm run check
```

### Deployment

```bash
corepack pnpm run build
```

A static production build will be exported to `build`.
