# The Found Raise Up testing exercise.
## Installation 

Install **pnpm**, do that:

```sh
npm install -g pnpm
```
Install dependencies: 

```sh
pnpm install
```

##  Configuration

Rename the .env.example file to .env.
Open the .env file and provide the necessary configuration values.

For both applications only need **DB_URI** environment variable.

##  Usage
### From root

```sh
pnpm build

# Run App & Sync in one time
pnpm start:all
# Run Emulator
pnpm start:emulator
#Run Sync in monitoring mode
pnpm start:monitor
#Run Sync in reindex mode
pnpm start:fullReindex
```

### Independent

**Start Emulator app**

```sh
cd apps/app/
pnpm build
pnpm start
```

**Start Sync app**

```sh
cd apps/sync/
pnpm build

# Start in Monitoring mode
pnpm start

# Start in Full Reindex mode
pnpm  start --full-reindex
```


## Structure

### Apps

- `apps/app`: Emulator app, insert documents into MongoDB
- `apps/sync`: Sync app, sync a source and a target collections with a anonymization

### Packages

- `packages/type`: Common TS definition
- `packages/tsconfig`: tsconfig.json;s used throughout the monorepo
