import { Document, ObjectId } from "mongodb";

export interface Customer extends Document {
  _id: ObjectId;
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