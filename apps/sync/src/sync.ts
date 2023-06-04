import { DocumentWithId } from "fru";
import Store from "./store";
import DB from "./db";
import { Anonymizer } from "./anonymizer";

class SyncApp<T extends DocumentWithId> {
  private readonly forceReindex;
  private readonly store: Store<T>;
  private readonly db: DB<T>;
  private readonly anonymizer: Anonymizer<T>;

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

  public async start() {
    console.log(
      `****SyncApp is starting:**** \n 
      ${new Date().toISOString()}: '${this.db.sourceCollectionName}'=> '${this.db.targetCollectionName}' in ${
        this.forceReindex ? "FORCE_REINDEX" : "MONITORING"
      } mode: \n
      Push with anonymization each ${this.store.timeout}ms or more then ${this.store.bunchSize} changes`
    );

    await this.db.connect();
    this.db.storeMissing().then(() => Promise.resolve(this.forceReindex && this.stop()));
    if (!this.forceReindex) {
      this.db.listenChangeStream();
    }
  }

  public async stop() {
    await this.store.stop();
    return this.db.close();
  }

  private async anonymizeAndSendToStore(...bunch: T[]) {
    await this.store.push(...bunch.map((item) => this.anonymizer.anonymize(item)));
  }
}
export default SyncApp;
