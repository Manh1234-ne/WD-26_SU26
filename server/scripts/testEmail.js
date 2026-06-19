import dotenv from "dotenv";
dotenv.config();

import { sendMail } from "../src/utils/sendMail.js";

const run = async () => {
  try {
    await sendMail({
      to: "test@gmail.com",
      subject: "Test Cinema Email",
      html: `
        <h2>🎬 Test Email Thành Công</h2>
        <p>Hệ thống email cinema đang hoạt động tốt.</p>
      `,
    });

    console.log("✅ Email sent successfully");
  } catch (err) {
    console.error("❌ Email error:", err.message);
  }
};

run();