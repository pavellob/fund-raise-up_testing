import { Customer, DocumentWithId } from "fru";
import { faker } from "@faker-js/faker";
export interface Anonymizer<T extends DocumentWithId> {
  anonymize: (item: T) => T 
}

export class CustomerAnonymizer implements Anonymizer<Customer> {
  private static readonly FILLER_SIZE = 8;
  private readonly fillerSize: number;
  constructor(fillerSize = CustomerAnonymizer.FILLER_SIZE ) {
    this.fillerSize = fillerSize;
  }
  anonymize(customer: Customer): Customer {
    const letterFiller = (): string => faker.string.alpha(this.fillerSize);
  
    return {
      ...customer,
      firstName: letterFiller(),
      lastName: letterFiller(),
      email: `${letterFiller()}@${customer.email.split("@")[1]}`,
      address: {
        ...customer.address,
        line1: letterFiller(),
        line2: letterFiller(),
        postcode: letterFiller(),
      },
    };
  }
}



export default CustomerAnonymizer;
