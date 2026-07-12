import mongoose from "mongoose";
import dotenv from "dotenv";
import Booking from "./src/models/Booking.js";
import Voucher from "./src/models/Voucher.js";
import User from "./src/models/User.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/WD-26_SU26";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected successfully!");

  // Find or create test user
  let user = await User.findOne();
  if (!user) {
    user = await User.create({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "user"
    });
    console.log("Created test user:", user.email);
  } else {
    console.log("Using existing user:", user.email);
  }

  // Find or create test voucher
  let voucher = await Voucher.findOne({ code: "TESTVOUCHER" });
  if (!voucher) {
    voucher = await Voucher.create({
      code: "TESTVOUCHER",
      name: "Test 10% Discount",
      description: "Save 10%",
      discountType: "percent",
      discountValue: 10,
      minOrderAmount: 0,
      usageLimit: 5,
      usedCount: 0,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isActive: true
    });
    console.log("Created test voucher");
  } else {
    voucher.usedCount = 0;
    voucher.usageLimit = 5;
    voucher.isActive = true;
    await voucher.save();
    console.log("Reset test voucher");
  }

  // Scenario 1: User has NO previous bookings using this voucher.
  // We create a pending booking.
  const booking1 = await Booking.create({
    bookingCode: "BKTEST1_" + Date.now(),
    user: user._id,
    showtime: new mongoose.Types.ObjectId(),
    totalSeatPrice: 100000,
    finalAmount: 100000,
    status: "pending",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  console.log("Created Booking 1 (Pending)");

  // Apply voucher to Booking 1. This should succeed.
  console.log("Scenario 1: Applying voucher to Booking 1...");
  const res1 = await fetch(`http://localhost:5000/api/bookings/${booking1._id}/apply-voucher`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voucherCode: "TESTVOUCHER" })
  });

  const data1 = await res1.json();
  console.log("Booking 1 Apply Response:", res1.status, data1.message || "Success");
  if (!data1.success) {
    throw new Error("Expected Booking 1 apply-voucher to succeed");
  }
  console.log("✓ Scenario 1 passed: User successfully applied voucher first time.");

  // Confirm Booking 1 to simulate a completed payment.
  booking1.status = "confirmed";
  await booking1.save();
  console.log("Simulated Booking 1 payment: status -> confirmed");

  // Scenario 2: User tries to apply the same voucher to a Booking 2.
  // Since Booking 1 is confirmed and uses the voucher, this must fail.
  const booking2 = await Booking.create({
    bookingCode: "BKTEST2_" + Date.now(),
    user: user._id,
    showtime: new mongoose.Types.ObjectId(),
    totalSeatPrice: 120000,
    finalAmount: 120000,
    status: "pending",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000)
  });
  console.log("Created Booking 2 (Pending)");

  console.log("Scenario 2: Applying voucher to Booking 2 (expect failure)...");
  const res2 = await fetch(`http://localhost:5000/api/bookings/${booking2._id}/apply-voucher`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voucherCode: "TESTVOUCHER" })
  });

  const data2 = await res2.json();
  console.log("Booking 2 Apply Response:", res2.status, data2.message);
  if (res2.status !== 400 || data2.success) {
    throw new Error("Expected Booking 2 apply-voucher to fail with 400");
  }
  console.log("✓ Scenario 2 passed: Second application blocked successfully.");

  // Scenario 3: Cancel Booking 1. The user should now be allowed to use the voucher again.
  booking1.status = "cancelled";
  await booking1.save();
  console.log("Simulated Booking 1 cancellation: status -> cancelled");

  console.log("Scenario 3: Re-applying voucher to Booking 2 (expect success)...");
  const res3 = await fetch(`http://localhost:5000/api/bookings/${booking2._id}/apply-voucher`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voucherCode: "TESTVOUCHER" })
  });

  const data3 = await res3.json();
  console.log("Booking 2 Apply Response (post-cancellation):", res3.status, data3.message || "Success");
  if (!data3.success) {
    throw new Error("Expected Booking 2 apply-voucher to succeed after Booking 1 cancellation");
  }
  console.log("✓ Scenario 3 passed: Voucher freed up correctly after cancellation.");

  // Cleanup
  console.log("Cleaning up test data...");
  await Booking.deleteOne({ _id: booking1._id });
  await Booking.deleteOne({ _id: booking2._id });
  console.log("Done!");
}

run()
  .catch(err => {
    console.error("Verification failed:", err);
  })
  .finally(() => {
    mongoose.disconnect();
  });
