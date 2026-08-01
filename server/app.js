import dotenv from "dotenv";
dotenv.config(); // PHẢI LÊN DÒNG 1
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
// import dotenv from "dotenv";
import router from "./src/routes/index.js";
import { startBookingTimeoutCheck } from "./src/utils/cronJob.js";
import { ensureWelcomeVoucher } from "./src/utils/initVoucher.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Phục vụ ảnh upload dưới dạng static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("Cinema backend is running...");
});

app.use("/api", router)

const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Ket noi CSDL thanh cong");
    await ensureWelcomeVoucher();
    startBookingTimeoutCheck();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Ket noi CSDL that bai:", error.message);
  });

  
