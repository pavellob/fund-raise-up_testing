import { DocumentWithId } from "fru";
import { MongoClient, ChangeStream, Filter } from "mongodb";

export default class DB<T extends DocumentWithId> {
  private static readonly SOURCE_COLLECTION_NAME = "customers";
  private static readonly TARGET_COLLECTION_NAME = "customers_anonymised";
  private static readonly BUNCH_SIZE_LIMIT = 1000;

  private readonly dbName: string;
  private readonly bunchSizeLimit: number;
  private client: MongoClient;
  private changeStream: ChangeStream<T>;
  private toStore: (...data: T[]) => void;

  constructor(uri: string, bunchSizeLimit = DB.BUNCH_SIZE_LIMIT) {
    if (!uri) {
      throw new Error("DB_URI isn't defined in environment variables");
    }
    this.toStore = (__) => {
      throw new Error("'toStore' function should be defined by setToStore function");
    };
    this.client = new MongoClient(uri);
    this.dbName = new URL(uri).pathname.substring(1);
    this.changeStream = this.sourceCollection().watch();
    this.bunchSizeLimit = bunchSizeLimit;
  }

  public setToStore(toStoreFunc: (...data: T[]) => void) {
    this.toStore = toStoreFunc;
  }

  public async connect() {
    await this.client.connect();
  }

  public async close() {
    await this.client.close();
    if (this.changeStream) await this.changeStream.close();
  }

  public listenChangeStream() {
    this.changeStream.on("change", (next) => {
      if ((next.operationType === "insert" || next.operationType === "update") && next.fullDocument) {
        this.toStore && this.toStore(next.fullDocument);
      }
    });
    return this.changeStream;
  }

  public async storeMissing(fullReindex = false) {
    const targetsId = await this.targetCollection().distinct("_id");
    const query = (targetsId.length > 0 && !fullReindex ? { _id: { $nin: targetsId } } : {}) as Filter<T>;
    let skipCount = 0;
    let bunch: T[] = [];
    do {
      bunch = await this.sourceCollection().find<T>(query).limit(this.bunchSizeLimit).skip(skipCount).toArray();
      skipCount += bunch.length;
      this.toStore(...bunch);
    } while (bunch.length === this.bunchSizeLimit);
  }

  public async upsertToTargetCollection(documents: T[]) {
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
      });
    } finally {
      session.endSession();
    }
  }

  private sourceCollection() {
    return this.client.db(this.dbName).collection<T>(DB.SOURCE_COLLECTION_NAME);
  }

  private targetCollection() {
    return this.client.db(this.dbName).collection<T>(DB.TARGET_COLLECTION_NAME);
  }
}
