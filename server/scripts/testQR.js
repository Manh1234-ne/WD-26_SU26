import dotenv from "dotenv";
dotenv.config();

import { generateQR } from "../src/utils/qrCode.js";

const run = async () => {
  try {
    const qr = await generateQR({
      bookingId: "BK123456",
      userId: "USER123",
      showtimeId: "ST123",
    });

    console.log("✅ QR generated:");
    console.log(qr);
  } catch (err) {
    console.error("❌ QR error:", err.message);
  }
};

run();