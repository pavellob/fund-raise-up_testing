# The FoundRaiseUp testing exercise.

## Structure

Simples  repo with three files: app.ts, sync.ts, types.ts. 

- `src/app.ts`: Emulator app, insert documents into MongoDB
- `apps/sync.ts`: Sync app, sync a source and a target collections with a anonymization
- `src/types.ts`: Common TS definition

##  Configuration

Rename the .env.example file to .env.
Open the .env file and provide the necessary configuration values.

For both applications only need **DB_URI** environment variable.

##  Usage

```sh
pnpm install
pnpm build

# Run Emulator
pnpm start:emulator
#Run Sync in monitoring mode
pnpm start:monitor
#Run Sync in reindex mode
pnpm start:fullReindex
```