import { faker } from "@faker-js/faker";
import { Customer, DocumentWithId } from "fru";
import { MongoClient, ObjectId } from "mongodb";

export class InsertToMongoApp<T extends DocumentWithId> {
  private readonly dbURI: string;
  private readonly dbName: string;
  private readonly collectionName: string;
  private readonly intervalMs: number;
  private readonly minBunchSize: number;
  private readonly maxBunchSize: number;
  private readonly mockItem: () => T;
  private static readonly DEFAULT_EMULATION_INTERVAL_MS = 200;
  private static readonly DEFAULT_MIN_EMULATION_BUNCH_SIZE = 1;
  private static readonly DEFAULT_MAX_EMULATION_BUNCH_SIZE = 10;

  constructor(
    dbURI: string,
    collectionName: string,
    mockItem: () => T,
    intervalMs = InsertToMongoApp.DEFAULT_EMULATION_INTERVAL_MS,
    minBunchSize = InsertToMongoApp.DEFAULT_MIN_EMULATION_BUNCH_SIZE,
    maxBunchSize = InsertToMongoApp.DEFAULT_MAX_EMULATION_BUNCH_SIZE
  ) {
    this.dbURI = dbURI;
    if (!this.dbURI) {
      throw new Error("dbURI isn't defined in environment variables");
    }
    this.mockItem = mockItem;
    this.dbName = new URL(this.dbURI).pathname.substring(1);
    this.collectionName = collectionName;
    this.intervalMs = intervalMs;
    this.minBunchSize = minBunchSize;
    this.maxBunchSize = maxBunchSize;

    parseInt(process.env.MIN_EMULATION_BUNCH_SIZE) || InsertToMongoApp.DEFAULT_MIN_EMULATION_BUNCH_SIZE;
    parseInt(process.env.MAX_EMULATION_BUNCH_SIZE) || InsertToMongoApp.DEFAULT_MAX_EMULATION_BUNCH_SIZE;
  }

  private generateMockedBunch(): T[] {
    return faker.helpers.multiple(this.mockItem, {
      count: faker.number.int({ min: this.minBunchSize, max: this.maxBunchSize }),
    });
  }

  private async insertBunch(bunch: T[]): Promise<void> {
    const client = new MongoClient(this.dbURI);

    try {
      await client.connect();
      const collection = client.db(this.dbName).collection(this.collectionName);
      await collection.insertMany(bunch);
      console.log(
        `${new Date().toISOString()}: ${bunch.length} mocked documents have been added into the '${
          this.collectionName
        }'`
      );
    } finally {
      await client.close();
    }
  }

  public async emulate() {
    const bunch = this.generateMockedBunch();
    await this.insertBunch(bunch);
  }

  public startEmulation() {
    setInterval(() => this.emulate(), this.intervalMs);
    console.log(
      `${new Date().toISOString()}: Starting app emulation: Insert from ${this.minBunchSize} to ${
        this.maxBunchSize
      } mocked documents into the "${this.collectionName}" every ${this.intervalMs}ms...`
    );
  }
}

export function mockCustomer(): Customer {
  return {
    _id: new ObjectId(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    address: {
      line1: faker.location.streetAddress(),
      line2: faker.location.secondaryAddress(),
      postcode: faker.location.zipCode({ format: "#####" }),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      country: faker.location.countryCode(),
    },
    createdAt: new Date().toISOString(),
  };
}
