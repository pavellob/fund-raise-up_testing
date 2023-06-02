import Store from './store';
import DB from './db';

const FORCE_REINDEX_FLAG = '--full-reindex'; 

async function main(): Promise<void> {
  const forceReindex = process.argv.includes(FORCE_REINDEX_FLAG);

  Store.init(DB.upsertToAnonymisedCustomers);
  await DB.init(Store.add);
  DB.storeMissingCustomers(forceReindex);
  if(!forceReindex) {
    DB.listenCustomerChangeStream();
  }
}

export default main;
