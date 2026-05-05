import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "distributed-log-reconciliation";

if (!uri) {
  console.warn("MONGODB_URI is not set. API routes will fail until it is configured.");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getDb(): Promise<Db> {
  if (!uri) {
    throw new Error("Missing MONGODB_URI. Add it to .env.local or Vercel environment variables.");
  }

  let clientPromise: Promise<MongoClient>;

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    clientPromise = new MongoClient(uri).connect();
  }

  const mongoClient = await clientPromise;
  return mongoClient.db(dbName);
}
