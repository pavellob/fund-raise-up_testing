import { DocumentWithId } from "../../../packages/zod/dist";
import Store from "./store";
import DB from "./db";
import { Anonymizer } from "./anonymizer";

class SyncApp<T extends DocumentWithId> {
  private readonly forceReindex;
  private readonly store: Store<T>;
  private readonly db: DB<T>;
  private readonly anonymizer: Anonymizer<T>;

  constructor(
    forceReindex: boolean,
    anonymizer: Anonymizer<T>,
    store = new Store<T>(forceReindex),
    db = new DB<T>(process.env.DB_URI, forceReindex)
  ) {
    this.db = db;
    this.store = store;
    this.forceReindex = forceReindex;
    this.anonymizer = anonymizer;
    this.db.setToStore((...bunch) => this.anonymizeAndSendToStore(...bunch));
    this.store.setSaveToDb((...bunch) => this.db.upsertToTargetCollection(...bunch));
  }

  public async start() {
    console.log(
      `SyncApp is starting Started: '${this.db.sourceCollectionName}'=> '${this.db.targetCollectionName}' in ${
        this.forceReindex ? "FORCE_REINDEX" : "MONITORING"
      } mode: Push with anonymization each ${this.store.timeout}ms or more then ${this.store.bunchSize} changes`
    );
    await this.db.connect();
    this.db.storeMissing().then(() => Promise.resolve(this.forceReindex && this.stop()));
    if (!this.forceReindex) {
      this.db.listenChangeStream();
    }
  }

  private anonymizeAndSendToStore(...bunch: T[]) {
    this.store.push(...bunch.map((item) => this.anonymizer.anonymize(item)));
  }

  public async stop() {
    await this.store.stop();
    return this.db.close();
  }
}
export default SyncApp;
