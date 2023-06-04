import { Customer } from "fru";
import { InsertToMongoApp, mockCustomer } from "./app";
import * as dotenv from "dotenv";

dotenv.config();

const {
  DB_URI,
  EMULATION_TARGET_COLLECTION =  "customers",
} = process.env;


const app = new InsertToMongoApp<Customer>(
  DB_URI,
  EMULATION_TARGET_COLLECTION,
  mockCustomer
);

app.startEmulation();
