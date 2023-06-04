# The Found Raise Up testing exercise.

This is an official starter Turborepo with multiple meta-frameworks all working in harmony and sharing packages.

## Installation 

Install **pnpm**, do that:

```sh
npm install -g pnpm
```
Install dependencies: 

```sh
pnpm install
```
For applications run  the **DB_URI** environment variable should be define. Could set it directly or in **.env** file.

##  Usage

### Directly

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

### With turbo

**Start Emulator app**

```sh
turbo --filter=@fru/app start
```

**Start Sync app**

```sh
# Start in Monitoring mode
turbo --filter=@fru/sync start

# Start in Full Reindex mode
turbo --filter=@fru/sync start --full-reindex
```
## Structure

### Apps

- `app`: Emulator app, insert documents into MongoDB
- `sync`: Sync app, sync a source and a target collections with a anonymization

### Packages

- `type`: Common TS definition
- `tsconfig`: tsconfig.json;s used throughout the monorepo
