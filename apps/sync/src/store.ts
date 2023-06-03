import { DocumentWithId } from "fru";

export default class Store<T extends DocumentWithId> {
  private static readonly DEFAULT_TIMEOUT_MS = 1000;
  private static readonly DEFAULT_BUNCH_SIZE = 1000;
  private readonly timeout: number;
  
  private store: T[];
  private intervalId: NodeJS.Timer;
  private bunchSize: number;
  private saveToDb: (bunch: T[]) => void;

  constructor(
    timeout = Store.DEFAULT_TIMEOUT_MS,
    bunchSize = Store.DEFAULT_BUNCH_SIZE
  ) {
    this.store = [];
    this.timeout = timeout;
    this.bunchSize = bunchSize;
    this.saveToDb = (__) => {
      throw new Error("'saveToDb' function should be define by setSaveToDb function");
    };
    this.intervalId = setInterval(() => this.pullToDB(), timeout);
  }

  public setSaveToDb(saveToDb: (bunch: T[]) => void) {
    this.saveToDb = saveToDb;
  }

  private async pullToDB() {
    if (this.store.length === 0) {
      return;
    }
    const bunch = this.store.slice(0, this.bunchSize);
    this.store = this.store.slice(this.bunchSize);
    console.log(`${bunch.length} anonymized items are pulled; ${this.store.length} remain`);
    await this.saveToDb(bunch);
  }

  public push(...items: T[]) {
    if (Array.isArray(items)) {
      this.store.push(...items);
    } else {
      this.store.push(items);
    }
    if (this.store.length >= this.bunchSize) {
      this.pullToDB();
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => this.pullToDB(), this.timeout);
    }
  }
}
