import { faker } from "@faker-js/faker";
import { MongoClient, ObjectId } from "mongodb";
import { Customer, DocumentWithId } from "./types";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Represents an application for inserting mocked data into MongoDB.
 * @template T - The type of the document with an ID.
 */
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

  /**
   * Creates an instance of InsertToMongoApp.
   * @param {string} dbURI - The URI of the MongoDB.
   * @param {string} collectionName - The name of the target collection.
   * @param {() => T} mockItem - A function that generates a mocked document of type T.
   * @param {number} [intervalMs=200] - The interval in milliseconds between each insertion.
   * @param {number} [minBunchSize=1] - The minimum number of documents to insert in each bunch.
   * @param {number} [maxBunchSize=10] - The maximum number of documents to insert in each bunch.
   */
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
  }

  /**
   * Generates a bunch of mocked documents.
   * @returns {T[]} An array of mocked documents.
   */
  private generateMockedBunch(): T[] {
    return faker.helpers.multiple(this.mockItem, {
      count: faker.number.int({ min: this.minBunchSize, max: this.maxBunchSize }),
    });
  }

  /**
   * Inserts a bunch of documents into the target collection.
   * @param {T[]} bunch - The bunch of documents to be inserted.
   * @returns {Promise<void>} A promise that resolves when the documents are inserted.
   */
  private async insertBunch(bunch: T[]): Promise<void> {
    const client = new MongoClient(this.dbURI);

    try {
      await client.connect();
      const collection = client.db(this.dbName).collection(this.collectionName);
      await collection.insertMany(bunch);
      console.log(
        `${new Date().toISOString()}: ${bunch.length} mocked documents have been added into the '${this.collectionName}'`
      );
    } finally {
      await client.close();
    }
  }

  /**
   * Emulates the insertion of mocked documents into the target collection.
   * @returns {Promise<void>} A promise that resolves when the bunch of documents is inserted.
   */
  public async emulate(): Promise<void> {
    const bunch = this.generateMockedBunch();
    await this.insertBunch(bunch);
  }

  /**
   * Starts the emulation of inserting mocked documents into the target collection at a specified interval.
   */
  public startEmulation() : void{
    setInterval(() => this.emulate(), this.intervalMs);
    console.log(
      `${new Date().toISOString()}: Starting app emulation: Insert from ${this.minBunchSize} to ${this.maxBunchSize} mocked documents into the "${this.collectionName}" every ${this.intervalMs}ms...`
    );
  }
}

/**
 * Generates a mocked customer document.
 * @returns {Customer} A mocked customer document.
 */
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

dotenv.config();

const {
  DB_URI,
  EMULATION_TARGET_COLLECTION = "customers",
} = process.env;

if (!DB_URI) {
  throw new Error("DB should be defined");
}

// Create an instance of InsertToMongoApp
const app = new InsertToMongoApp<Customer>(
  DB_URI,
  EMULATION_TARGET_COLLECTION,
  mockCustomer
);

// Start the emulation
app.startEmulation();
