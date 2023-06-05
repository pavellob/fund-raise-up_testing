import { MongoClient, ChangeStream, Filter, Collection } from "mongodb";
import { faker } from "@faker-js/faker";
import { Customer, DocumentWithId } from "./types";
import * as dotenv from "dotenv";
dotenv.config();

// Common interface for anonymizers
interface Anonymizer<T extends DocumentWithId> {
  /**
   * Anonymizes the provided item.
   * @param {T} item - The item to be anonymized.
   * @returns {T} The anonymized item.
   */
  anonymize: (item: T) => T;
}

// Customer Anonymizer
class CustomerAnonymizer implements Anonymizer<Customer> {
  private static readonly FILLER_SIZE = 8;
  private readonly fillerSize: number;

  /**
   * Creates an instance of the CustomerAnonymizer.
   * @param {number} fillerSize - The size of the filler string. Default is 8.
   */
  constructor(fillerSize = CustomerAnonymizer.FILLER_SIZE) {
    this.fillerSize = fillerSize;
  }

  /**
   * Anonymizes the provided customer.
   * @param {Customer} customer - The customer to be anonymized.
   * @returns {Customer} The anonymized customer.
   */
  anonymize(customer: Customer): Customer {
    const letterFiller = (): string => faker.string.alpha(this.fillerSize);

    return {
      ...customer,
      firstName: letterFiller(),
      lastName: letterFiller(),
      email: `${letterFiller()}@${customer.email.split("@")[1]}`,
      address: {
        ...customer.address,
        line1: letterFiller(),
        line2: letterFiller(),
        postcode: letterFiller(),
      },
    };
  }
}

/*
 * Generic Store class for managing data storage and batch processing.
 * @template T - The type of the documents being stored.
 */
class Store<T extends DocumentWithId> {
  /**
   * Default timeout value in milliseconds for pulling data to the database.
   */
  public static readonly DEFAULT_TIMEOUT_MS = 1000;

  /**
   * Default batch size for processing data.
   */
  public static readonly DEFAULT_BUNCH_SIZE = 1000;

  /**
   * Timeout value in milliseconds for pulling data to the database.
   */
  public readonly timeout: number;

  /**
   * Batch size for processing data.
   */
  public readonly bunchSize: number;

  /**
   * Array to store documents.
   */
  private store: T[];

  /**
   * Interval ID for periodic data processing.
   */
  private intervalId: NodeJS.Timer;

  /**
   * Flag indicating whether to force reindexing.
   */
  private readonly forceReindex: boolean;

  /**
   * Constructs an instance of the Store class.
   * @param {boolean} forceReindex - Flag indicating whether to force reindexing.
   * @param {number} [timeout=Store.DEFAULT_TIMEOUT_MS] - Timeout value in milliseconds for pulling data to the database.
   * @param {number} [bunchSize=Store.DEFAULT_BUNCH_SIZE] - Batch size for processing data.
   */
  constructor(forceReindex: boolean, timeout = Store.DEFAULT_TIMEOUT_MS, bunchSize = Store.DEFAULT_BUNCH_SIZE) {
    this.forceReindex = forceReindex;
    this.store = [];
    this.timeout = timeout;
    this.bunchSize = bunchSize;
    this.intervalId = setInterval(() => this.pullToDB(), timeout);
  }

  /**
   * Saves a batch of documents to the database.
   * @param {T[]} bunch - The batch of documents to be saved.
   * @returns {Promise<void>} A Promise that resolves when the documents are saved.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async saveToDb(bunch: T[]): Promise<void> {
    throw new Error(
      `${new Date().toISOString()}: ${Store.name} execution failed: '${this.saveToDb.name}' function should be defined`
    );
  }

  /**
   * Sets the saveToDb function for saving documents to the database.
   * @param {(bunch: T[]) => Promise<void>} saveToDb - The saveToDb function to be set.
   */
  public setSaveToDb(saveToDb: (bunch: T[]) => Promise<void>): void {
    this.saveToDb = saveToDb;
  }

  /**
   * Pulls the stored documents to the database in batches.
   * @returns {Promise<void>} A Promise that resolves when the documents are pulled to the database.
   */
  private async pullToDB(): Promise<void> {
    if (this.store.length === 0) {
      return;
    }
    let bunch: T[];
    do {
      bunch = this.store.slice(0, this.bunchSize);
      this.store = this.store.slice(this.bunchSize);
      await this.saveToDb(bunch);
    } while (this.store.length >= this.bunchSize);

    clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.pullToDB(), this.timeout);
  }

  /**
   * Stops the Store instance and pulls any remaining documents to the database.
   * @returns {Promise<void>} A Promise that resolves when the Store is stopped.
   */
  public async stop(): Promise<void> {
    await this.pullToDB();
    clearInterval(this.intervalId);
  }

  /**
   * Pushes documents to the Store for storage and processing.
   * @param {...T} items - The documents to be pushed.
   * @returns {Promise<void>} A Promise that resolves when the documents are pushed to the Store.
   */
  public async push(...items: T[]): Promise<void> {
    this.store.push(...items);
    if (this.store.length >= this.bunchSize) {
      await this.pullToDB();
    }
  }
}

/**
 * Generic DB class for managing database operations.
 * @template T - The type of the documents being stored in the database.
 */
class DB<T extends DocumentWithId> {
  /**
   * Default name of the source collection.
   */
  public static readonly DEFAULT_SOURCE_COLLECTION_NAME = "customers";

  /**
   * Default name of the target collection.
   */
  public static readonly DEFAULT_TARGET_COLLECTION_NAME = "customers_anonymised";

  /**
   * Default limit for batch size.
   */
  public static readonly DEFAULT_BUNCH_SIZE_LIMIT = 10000;

  /**
   * The name of the database.
   */
  public readonly dbName: string;

  /**
   * The name of the source collection.
   */
  public readonly sourceCollectionName: string;

  /**
   * The name of the target collection.
   */
  public readonly targetCollectionName: string;

  /**
   * The limit for the batch size.
   */
  public readonly bunchSizeLimit: number;

  /**
   * Flag indicating whether to force reindexing.
   */
  public readonly forceReindex: boolean;

  /**
   * The MongoDB client instance.
   */
  private client: MongoClient;

  /**
   * The change stream for listening to database changes.
   */
  private changeStream: ChangeStream<T>;

  /**
   * Constructs an instance of the DB class.
   * @param {string} dbURI - The URI of the MongoDB database.
   * @param {boolean} [forceReindex=false] - Flag indicating whether to force reindexing.
   * @param {string} [sourceCollectionName=DB.DEFAULT_SOURCE_COLLECTION_NAME] - The name of the source collection.
   * @param {string} [targetCollectionName=DB.DEFAULT_TARGET_COLLECTION_NAME] - The name of the target collection.
   * @param {number} [bunchSizeLimit=DB.DEFAULT_BUNCH_SIZE_LIMIT] - The limit for the batch size.
   * @throws {Error} Throws an error if the DB_URI environment variable is not defined.
   */
  constructor(
    dbURI: string,
    forceReindex = false,
    sourceCollectionName = DB.DEFAULT_SOURCE_COLLECTION_NAME,
    targetCollectionName = DB.DEFAULT_TARGET_COLLECTION_NAME,
    bunchSizeLimit = DB.DEFAULT_BUNCH_SIZE_LIMIT
  ) {
    if (!dbURI) {
      throw new Error("DB_URI isn't defined in environment variables");
    }
    this.forceReindex = forceReindex;
    this.client = new MongoClient(dbURI);
    this.dbName = new URL(dbURI).pathname.substring(1);
    this.bunchSizeLimit = bunchSizeLimit;
    this.sourceCollectionName = sourceCollectionName;
    this.targetCollectionName = targetCollectionName;
    this.changeStream = this.sourceCollection().watch([], { fullDocument: "updateLookup" });
  }

  /**
   * Sets the toStore function for storing documents.
   * @param {(...data: T[]) => void} toStore - The toStore function to be set.
   */
  public setToStore(toStore: (...data: T[]) => void): void {
    this.toStore = toStore;
  }

  /**
   * Connects to the MongoDB database.
   * @returns {Promise<void>} A Promise that resolves when the connection is established.
   */
  public async connect(): Promise<void> {
    await this.client.connect();
  }

  /**
   * Closes the connection to the MongoDB database.
   * @returns {Promise<void>} A Promise that resolves when the connection is closed.
   */
  public async close(): Promise<void> {
    await this.client.close();
    if (this.changeStream) await this.changeStream.close();
  }

  /**
   * Listens to the change stream of the source collection for database changes.
   * @returns {ChangeStream} The change stream instance.
   */
  public listenChangeStream(): ChangeStream {
    this.changeStream.on("change", (next) => {
      switch (next.operationType) {
        case 'insert':
        case 'replace':
        case 'update':
          next.fullDocument && this.toStore(next.fullDocument);
          break;
        default:
          break;
      }
    });
    return this.changeStream;
  }

  /**
   * Stores the missing documents from the source collection to the target collection.
   * @returns {Promise<void>} A Promise that resolves when the missing documents are stored.
   */
  public async storeMissing(): Promise<void> {
    const targetsIds = await this.targetCollection().distinct("_id");
    const query = (targetsIds.length > 0 && !this.forceReindex ? { _id: { $nin: targetsIds } } : {}) as Filter<T>;
    let skipCount = 0;
    let bunch: T[] = [];
    do {
      bunch = await this.sourceCollection().find<T>(query).limit(this.bunchSizeLimit).skip(skipCount).toArray();
      skipCount += bunch.length;
      await this.toStore(...bunch);
    } while (bunch.length === this.bunchSizeLimit);
  }

  /**
   * Upserts the provided documents to the target collection.
   * @param {T[]} documents - The documents to be upserted.
   * @returns {Promise<void>} A Promise that resolves when the documents are upserted.
   */
  public async upsertToTargetCollection(documents: T[]): Promise<void> {
    const session = this.client.startSession();
    try {
      await session.withTransaction(async () => {
        const bulkOperations = documents.map((document) => ({
          updateOne: {
            filter: { _id: document._id } as Filter<T>,
            update: { $set: document },
            upsert: true,
          },
        }));
        await this.targetCollection().bulkWrite(bulkOperations, { session });
        console.log(
          `${new Date().toISOString()}: ${documents.length} items from '${
            this.sourceCollectionName
          }' have been anonymized and saved in '${this.targetCollectionName}' `
        );
      });
    } finally {
      session.endSession();
    }
  }

  /**
   * The default implementation for the toStore function.
   * @param {...T} data - The data to be stored.
   * @throws {Error} Throws an error indicating that the toStore function should be defined.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private toStore(...data: T[]): void {
    throw new Error(`${DB.name} execution failed: '${this.toStore.name}' should be defined`);
  }

  /**
   * Retrieves the source collection from the MongoDB client.
   * @returns {Collection<T>} The source collection instance.
   */
  private sourceCollection(): Collection<T> {
    return this.client.db(this.dbName).collection<T>(this.sourceCollectionName);
  }

  /**
   * Retrieves the target collection from the MongoDB client.
   * @returns {Collection<T>} The target collection instance.
   */
  private targetCollection(): Collection<T> {
    return this.client.db(this.dbName).collection<T>(this.targetCollectionName);
  }
}

/**
 * Represents the SyncApp class for synchronizing and anonymizing data between a source and target collection.
 * @template T - The type of the document with an ID.
 */
class SyncApp<T extends DocumentWithId> {
  private readonly forceReindex: boolean;
  private readonly store: Store<T>;
  private readonly db: DB<T>;
  private readonly anonymizer: Anonymizer<T>;

  /**
   * Creates an instance of the SyncApp.
   * @param {string} dbURI - The URI of the database.
   * @param {boolean} forceReindex - Flag indicating whether to perform a force reindex.
   * @param {Anonymizer<T>} anonymizer - The anonymizer instance for the specified type.
   * @param {Store<T>} store - The store instance. Default is a new instance of Store.
   * @param {DB<T>} db - The database instance. Default is a new instance of DB.
   */
  constructor(
    dbURI: string,
    forceReindex: boolean,
    anonymizer: Anonymizer<T>,
    store = new Store<T>(forceReindex),
    db = new DB<T>(dbURI, forceReindex)
  ) {
    this.forceReindex = forceReindex;
    this.anonymizer = anonymizer;
    this.db = db;
    this.store = store;
    this.db.setToStore((...bunch) => this.anonymizeAndSendToStore(...bunch));
    this.store.setSaveToDb((...bunch) => this.db.upsertToTargetCollection(...bunch));
  }

  /**
   * Starts the SyncApp by connecting to the database, storing missing documents,
   * and starting the change stream if not in force reindex mode.
   * @returns {Promise<void>} A promise that resolves when the SyncApp is started.
   */
  public async start(): Promise<void> {
    console.log(
      `****SyncApp is starting:**** \n 
      ${new Date().toISOString()}: '${this.db.sourceCollectionName}' => '${this.db.targetCollectionName}' in ${
        this.forceReindex ? "FORCE_REINDEX" : "MONITORING"
      } mode: \n
      Push with anonymization each ${this.store.timeout}ms or more than ${this.store.bunchSize} changes`
    );

    await this.db.connect();
    this.db.storeMissing().then(() => Promise.resolve(this.forceReindex && this.stop()));
    if (!this.forceReindex) {
      this.db.listenChangeStream();
    }
  }

  /**
   * Stops the SyncApp by stopping the store and closing the database connection.
   * @returns {Promise<void>} A promise that resolves when the SyncApp is stopped.
   */
  public async stop(): Promise<void> {
    await this.store.stop();
    return this.db.close();
  }

  /**
   * Anonymizes the given documents and sends them to the store for further processing.
   * @param {...T[]} bunch - The documents to be anonymized and sent to the store.
   * @returns {Promise<void>} A promise that resolves when the documents are sent to the store.
   */
  private async anonymizeAndSendToStore(...bunch: T[]): Promise<void> {
    await this.store.push(...bunch.map((item) => this.anonymizer.anonymize(item)));
  }
}

// Run application

/**
 * Runs the SyncApp for synchronizing and anonymizing customer data.
 * @param {string} dbURI - The URI of the database.
 * @param {boolean} forceReindex - Flag indicating whether to perform a force reindex.
 * @returns {Promise<void>} A promise that resolves when the SyncApp has started or an error occurred.
 */
const sync = async (dbURI: string, forceReindex: boolean): Promise<void> => {
  const syncApp = new SyncApp<Customer>(dbURI, forceReindex, new CustomerAnonymizer());

  try {
    await syncApp.start();
  } catch (error) {
    console.error(error);
    await syncApp.stop();
  }
}


const FORCE_REINDEX_FLAG = "--full-reindex";
const forceReindex = process.argv.includes(FORCE_REINDEX_FLAG);
const dbURI = process.env.DB_URI;

// Start the SyncApp
sync(dbURI, forceReindex);

