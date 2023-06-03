import { DocumentWithId } from "fru";
import Store from "./store";
import DB from "./db";
import { Anonymizer } from "./anonymizer";

class SyncApp<T extends DocumentWithId> {
  private readonly store: Store<T>;
  private readonly db: DB<T>;
  private forceReindex;
  private readonly anonymizer: Anonymizer<T>;

  constructor(
    forceReindex: boolean,
    anonymizer: Anonymizer<T>,
    store = new Store<T>(),
    db = new DB<T>(process.env.DB_URI)
  ) {
    this.db = db;
    this.store = store;
    this.forceReindex = forceReindex;
    this.anonymizer = anonymizer;
    this.db.setToStore((bunch) => this.anonymizeAndSendToStore(bunch));
    this.store.setSaveToDb((bunch) => this.db.upsertToTargetCollection(bunch));
  }

  public async start() {
    await this.db.connect();
    this.db.storeMissing(this.forceReindex);
    if (!this.forceReindex) {
      this.db.listenChangeStream();
    }
  }

  private anonymizeAndSendToStore(...bunch: T[]) {
    if (Array.isArray(bunch)) {
      this.store.push(...bunch.map((item) => this.anonymizer.anonymize(item)));
    } else this.store.push(this.anonymizer.anonymize(bunch));
  }

  public async stop() {
    return await this.db.close();
  }
}
export default SyncApp;
