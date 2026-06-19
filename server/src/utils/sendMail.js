import dotenv from "dotenv";
dotenv.config(); // 🔥 BẮT BUỘC THÊM
import nodemailer from "nodemailer";

/**
 * Gmail transporter
 * NOTE: phải dùng App Password (KHÔNG dùng password thường)
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Verify connection khi server start (QUAN TRỌNG)
 */
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Gmail transporter error:", error);
  } else {
    console.log("✅ Gmail ready to send emails");
  }
});

/**
 * Send mail function
 */
export const sendMail = async ({ to,
  subject,
  html,
  attachments = []
}) => {
  try {
    if (!to) throw new Error("Missing recipient email (to)");

    const info = await transporter.sendMail({
      from: `"Cinema Booking" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments,
    });

    console.log("📧 EMAIL SENT SUCCESS:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ SEND MAIL ERROR:");
    console.error(err);

    throw err; // QUAN TRỌNG: không nuốt lỗi
  }
};