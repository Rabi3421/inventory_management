import mongoose from 'mongoose';

declare global {
  var mongooseConnectionPromise: Promise<typeof mongoose> | undefined;
}

function getMongoUri() {
  const uri = process.env.MONGODB_URI ?? process.env.NEXT_MONGODB_URI;

  if (!uri) {
    throw new Error('Missing MongoDB connection string. Set MONGODB_URI or NEXT_MONGODB_URI.');
  }

  return uri;
}

export async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!global.mongooseConnectionPromise) {
    global.mongooseConnectionPromise = mongoose
      .connect(getMongoUri(), {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000,
      })
      .catch(err => {
        // Clear the cached promise so the next call retries
        global.mongooseConnectionPromise = undefined;
        throw err;
      });
  }

  return global.mongooseConnectionPromise;
}
