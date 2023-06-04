import { Customer } from "fru";
import { InsertToMongoApp, mockCustomer } from "./app";
import * as dotenv from "dotenv";

dotenv.config();

const CUSTOMERS_COLLECTION_NAME = 'customers';

const app = new InsertToMongoApp<Customer>(mockCustomer, CUSTOMERS_COLLECTION_NAME);
app.startEmulation();

