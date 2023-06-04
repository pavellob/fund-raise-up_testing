import { faker } from "@faker-js/faker";
import { Customer, DocumentWithId } from "fru";
import { MongoClient, ObjectId } from "mongodb";

export class InsertToMongoApp<T extends DocumentWithId> {
  private readonly DB_URI: string;
  private readonly DB_NAME: string;
  private readonly COLLECTION_NAME: string;
  private readonly INTERVAL_MS: number;
  private readonly MIN_BUNCH_SIZE: number;
  private readonly MAX_BUNCH_SIZE: number;
  private readonly mockItem: () => T;

  constructor(mockItem: () => T, collectionName: string) {
    this.DB_URI = process.env.DB_URI;
    this.mockItem = mockItem;
    this.DB_NAME = new URL(this.DB_URI).pathname.substring(1);
    this.COLLECTION_NAME = collectionName;
    this.INTERVAL_MS = parseInt(process.env.EMULATION_INTERVAL_MS || "200");
    this.MIN_BUNCH_SIZE = parseInt(process.env.MIN_EMULATION_BUNCH_SIZE || "20");
    this.MAX_BUNCH_SIZE = parseInt(process.env.MAX_EMULATION_BUNCH_SIZE || "30");
    if (!this.DB_URI) {
      throw new Error("DB_URI isn't defined in environment variables");
    }
  }

  private generateMockedBunch(): T[] {
    return faker.helpers.multiple(this.mockItem, {
      count: faker.number.int({ min: this.MIN_BUNCH_SIZE, max: this.MAX_BUNCH_SIZE }),
    });
  }

  private async insertBunch(bunch: T[]): Promise<void> {
    const client = new MongoClient(this.DB_URI);

    try {
      await client.connect();
      const collection = client.db(this.DB_NAME).collection(this.COLLECTION_NAME);
      await collection.insertMany(bunch);
      console.log(`${bunch.length} mocked documents have been added into the '${this.COLLECTION_NAME}'`);
    } finally {
      await client.close();
    }
  }

  public async emulate() {
    const bunch = this.generateMockedBunch();
    await this.insertBunch(bunch);
  }

  public startEmulation() {
    setInterval(() => this.emulate(), this.INTERVAL_MS);
    console.log(
      `Starting app emulation: Insert from ${this.MIN_BUNCH_SIZE} to ${this.MAX_BUNCH_SIZE} mocked documents into the "${this.COLLECTION_NAME}" every ${this.INTERVAL_MS}ms...`
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
