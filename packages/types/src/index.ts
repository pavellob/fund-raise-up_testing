import { Document, ObjectId } from "mongodb";

export interface DocumentWithId extends Document {
  _id: ObjectId;
}
export interface Customer extends DocumentWithId {
  firstName: string;
  lastName: string;
  email: string;
  address: {
    line1: string;
    line2: string;
    postcode: string;
    city: string;
    state: string;
    country: string;
  };
  createdAt: string;
}
