import { MongoClient, Collection, ChangeStream } from "mongodb";
import { Customer } from "fru";

const CUSTOMERS_COLLECTION_NAME = "customers"; // Name of the collection containing original customer data
const ANONYMISED_CUSTOMERS_COLLECTION_NAME = "customers_anonymised"; // Name of the collection to store anonymized customer dat
const BUNCH_SIZE_LIMIT = 10000; // Number of customers to process in each batch

let changeStream: ChangeStream<Customer>; // Change stream for monitoring customer changes
let client: MongoClient; // MongoDB client
let toStore: (data: Customer | Customer[]) => void;

let DB: {
  Customers: Collection<Customer>;
  CustomersAnonymised: Collection<Customer>;
};

async function init(toStoreFunc: (data: Customer | Customer[]) => void, uri = process.env.DB_URI): Promise<void> {
  if (!uri) {
    throw new Error("DB_URI isn't defined in environment variables");
  }
  toStore = toStoreFunc;
  client = await new MongoClient(uri).connect();
  const DB_NAME = new URL(uri).pathname.substring(1);
  const db = client.db(DB_NAME);
  DB = {
    Customers: db.collection(CUSTOMERS_COLLECTION_NAME),
    CustomersAnonymised: db.collection(ANONYMISED_CUSTOMERS_COLLECTION_NAME),
  };
}

async function storeMissingCustomers(fullReindex = false): Promise<void> {
  const customersAnonymisedIds = await DB.CustomersAnonymised.distinct("_id");
  const query = customersAnonymisedIds.length > 0 && !fullReindex ? { _id: { $nin: customersAnonymisedIds } } : {};
  let skipCount = 0;
  let bunch: Customer[];
  do {
    bunch = await DB.Customers.find(query).limit(BUNCH_SIZE_LIMIT).skip(skipCount).toArray();
    skipCount += bunch.length;
    toStore(bunch);
  } while (bunch.length === BUNCH_SIZE_LIMIT);
}

function listenCustomerChangeStream(): ChangeStream<Customer> {
  changeStream = DB.Customers.watch();
  changeStream.on("change", (next) => {
    if ((next.operationType === "insert" || next.operationType === "update") && next.fullDocument) {
      toStore(next.fullDocument);
    }
  });
  return changeStream;
}


async function upsertToAnonymisedCustomers(documents: Customer[]) {
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const bulkOperations = documents.map((document) => ({
        updateOne: {
          filter: { _id: document._id },
          update: { $set: document },
          upsert: true,
        },
      }));
      await DB.CustomersAnonymised.bulkWrite(bulkOperations, { session });
    });
  } finally {
    session.endSession();
  }
}

export default {
  init,
  storeMissingCustomers,
  listenCustomerChangeStream,
  upsertToAnonymisedCustomers,
};
