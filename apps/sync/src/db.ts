import { DocumentWithId } from "fru";
import { MongoClient, ChangeStream, Filter } from "mongodb";

export default class DB<T extends DocumentWithId> {
  public static readonly DEFAULT_SOURCE_COLLECTION_NAME = "customers";
  public static readonly DEFAULT_TARGET_COLLECTION_NAME = "customers_anonymised";
  public static readonly DEFAULT_BUNCH_SIZE_LIMIT = 1000;

  public readonly dbName: string;
  public readonly sourceCollectionName: string;
  public readonly targetCollectionName: string;
  public readonly bunchSizeLimit: number;
  public readonly forceReindex: boolean;
  private client: MongoClient;
  private changeStream: ChangeStream<T>;

  constructor(
    uri: string,
    forceReindex: boolean = false,
    sourceCollectionName = DB.DEFAULT_SOURCE_COLLECTION_NAME,
    targetCollectionName = DB.DEFAULT_TARGET_COLLECTION_NAME,
    bunchSizeLimit = DB.DEFAULT_BUNCH_SIZE_LIMIT
  ) {
    if (!uri) {
      throw new Error("DB_URI isn't defined in environment variables");
    }
    this.forceReindex = forceReindex;
    this.client = new MongoClient(uri);
    this.dbName = new URL(uri).pathname.substring(1);
    this.bunchSizeLimit = bunchSizeLimit;
    this.sourceCollectionName = sourceCollectionName;
    this.targetCollectionName = targetCollectionName;
    this.changeStream = this.sourceCollection().watch();
  }

  public setToStore(toStore: (...data: T[]) => void) {
    this.toStore = toStore;
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
        this.toStore(next.fullDocument);
      }
    });
    return this.changeStream;
  }

  public async storeMissing() {
    const targetsId = await this.targetCollection().distinct("_id");
    const query = (targetsId.length > 0 && !this.forceReindex ? { _id: { $nin: targetsId } } : {}) as Filter<T>;
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
        await this.targetCollection().bulkWrite(bulkOperations, { session })
        console.log(
          `${documents.length} items from '${this.sourceCollectionName}' have been anonymized and saved in '${this.targetCollectionName}'`
        );
      });
    } finally {
      session.endSession();
    }

    return documents;
  }

  private toStore(...data: T[]) {
    throw new Error(`${DB.name} execution fail: '${this.toStore.name}' should be define`);
  }

  private sourceCollection() {
    return this.client.db(this.dbName).collection<T>(this.sourceCollectionName);
  }

  private targetCollection() {
    return this.client.db(this.dbName).collection<T>(this.targetCollectionName);
  }
}
