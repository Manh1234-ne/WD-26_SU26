import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/WD-26_SU26";

const run = async () => {
  try {
    console.log(`Connecting to ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully.");

    const db = mongoose.connection.db;
    const collection = db.collection("bookingseats");

    console.log("Listing current indexes on collection 'bookingseats'...");
    const indexes = await collection.indexes();
    console.log(indexes);

    const hasIndex = indexes.some((index) => index.name === "showtime_1_seat_1");

    if (hasIndex) {
      console.log("Dropping index 'showtime_1_seat_1'...");
      await collection.dropIndex("showtime_1_seat_1");
      console.log("Successfully dropped index 'showtime_1_seat_1'");
    } else {
      console.log("Index 'showtime_1_seat_1' does not exist.");
    }
  } catch (err) {
    console.error("Error dropping index:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

run();
