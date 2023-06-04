import { DocumentWithId } from "../../../packages/zod/dist";

export default class Store<T extends DocumentWithId> {
  public static readonly DEFAULT_TIMEOUT_MS = 1000;
  public static readonly DEFAULT_BUNCH_SIZE = 1000;
  public readonly timeout: number;
  public readonly bunchSize: number;
  private store: T[];
  private intervalId: NodeJS.Timer;
  private readonly forceReindex: boolean;

  constructor(forceReindex: boolean, timeout = Store.DEFAULT_TIMEOUT_MS, bunchSize = Store.DEFAULT_BUNCH_SIZE) {
    this.forceReindex = forceReindex;
    this.store = [];
    this.timeout = timeout;
    this.bunchSize = bunchSize;
    this.intervalId = setInterval(() => this.pullToDB(), timeout);
  }

  private saveToDb(bunch: T[]) {
    throw new Error(`${Store.name} execution fail: '${this.saveToDb.name}' function should be define`);
  }

  public setSaveToDb(saveToDb: (bunch: T[]) => void) {
    this.saveToDb = saveToDb;
  }

  private async pullToDB(pullAll = false) {
    if (this.store.length === 0) {
      return;
    }
    const bunch = this.store.slice(0, this.bunchSize);
    this.store = this.store.slice(this.bunchSize);
    await this.saveToDb(bunch);
    if (pullAll) this.pullToDB(pullAll);
  }

  public async stop() {
    await this.pullToDB(this.forceReindex);
    clearInterval(this.intervalId);
  }

  public push(...items: T[]) {
    this.store.push(...items);
    if (this.store.length >= this.bunchSize) {
      this.pullToDB();
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => this.pullToDB(), this.timeout);
    }
  }
}
