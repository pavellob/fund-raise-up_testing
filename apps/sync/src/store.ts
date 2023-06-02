import { Customer } from "fru";

const DEFAULT_TIMEOUT_MS = 1000; // Default timeout value in milliseconds
const DEFAULT_BUNCH_SIZE = 1000; // Number of customers to process in each batch

let store: Customer[] = []; // Array to store anonymized customers
let intervalId: NodeJS.Timer; // Interval ID for periodic storage task
let saveToDb: (bunch: Customer[]) => void;
let bunchSize: number;

/**
 * Add customers to the anonymized store.
 * Store anonymized customers to the database when store has DEFAULT_BUNCH_SIZE or more
 * @param data - The customer Customer or an array of customer CuCustomers.
 */
function add(data: Customer | Customer[]): void {
  if (Array.isArray(data)) {
    store.push(...data);
  } else {
    store.push(data);
  }
  if (store.length >= DEFAULT_BUNCH_SIZE) {
    pullToDB();
    clearInterval(intervalId);
    intervalId = setInterval(() => pullToDB(), DEFAULT_TIMEOUT_MS);
  }
}

/**
 * Store anonymized customers to the database.
 * @returns The number of stored customers.
 */
async function pullToDB(): Promise<number> {
  if (store.length === 0) {
    return 0;
  }
  const bunch = store.slice(0, DEFAULT_BUNCH_SIZE);
  store = store.slice(DEFAULT_BUNCH_SIZE);
  console.log(`${bunch.length} anonymized customers are pulled; ${store.length} remain`);
  await saveToDb(bunch);
  return bunch.length;
}

function init(saveToDbFunc: (bunch: Customer[]) => void, timeout = DEFAULT_TIMEOUT_MS, bs = DEFAULT_BUNCH_SIZE) {
  saveToDb = saveToDbFunc;
  bunchSize = bs;
  intervalId = setInterval(() => pullToDB(), timeout);
}

export default {
  init,
  add,
};
