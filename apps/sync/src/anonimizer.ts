import { Customer } from "fru";
import { faker } from "@faker-js/faker";

const FILLER_SIZE = 8;

function anonymizeCustomer(customer: Customer): Customer {
  const letterFiller = (): string => faker.string.alpha(FILLER_SIZE);

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

export default anonymizeCustomer;
