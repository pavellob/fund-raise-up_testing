import { faker } from "@faker-js/faker";
import { MongoClient, ObjectId } from "mongodb";
import { Customer } from "fru";

const EMULATION_INTERVAL_MS = parseInt(process.env.EMULATION_INTERVAL_MS || "200");
const MIN_EMULATION_BUNCH_SIZE = parseInt(process.env.MIN_EMULATION_BUNCH_SIZE ?? "20");
const MAX_EMULATION_BUNCH_SIZE = parseInt(process.env.MAX_EMULATION_BUNCH_SIZE ?? "30");
const CUSTOMERS_COLLECTION_NAME = process.env.CUSTOMERS_COLLECTION_NAME || "customers";

function mockedCustomer(): Customer {
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

function generateMockedCustomersBunch(): Customer[] {
  return faker.helpers.multiple(mockedCustomer, {
    count: faker.number.int({ min: MIN_EMULATION_BUNCH_SIZE, max: MAX_EMULATION_BUNCH_SIZE }),
  });
}

async function insertMock(): Promise<void> {
  if (!process.env.DB_URI) {
    throw new Error("DB_URI isn't defined in environment variables");
  }
  const DB_NAME = new URL(process.env.DB_URI).pathname.substring(1);
  const client = new MongoClient(process.env.DB_URI);
  const bunch = generateMockedCustomersBunch();
  try {
    await client.connect();
    await client.db(DB_NAME).collection(CUSTOMERS_COLLECTION_NAME).insertMany(bunch);
    console.log(`-- ${bunch.length} were added into the DB ${CUSTOMERS_COLLECTION_NAME} Collection`);
  } finally {
    await client.close();
  }
}

function main(): void {
  setInterval(insertMock, EMULATION_INTERVAL_MS);
}

export default main;
