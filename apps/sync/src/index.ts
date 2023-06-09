import SyncApp from "./sync";
import { CustomerAnonymizer } from "./anonymizer";
import * as dotenv from "dotenv";
import { Customer } from "fru";

dotenv.config();

const FORCE_REINDEX_FLAG = "--full-reindex";
const forceReindex = process.argv.includes(FORCE_REINDEX_FLAG);
const dbURI = process.env.DB_URI;

const sync = async (dbURI: string, forceReindex: boolean) => {
  const syncApp = new SyncApp<Customer>(dbURI, forceReindex, new CustomerAnonymizer());

  try {
    await syncApp.start();
  } catch (error) {
    console.error(error);
    await syncApp.stop();
  }
};

sync(dbURI, forceReindex);
