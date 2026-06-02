import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import movieRoutes from "./src/routes/movieRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Cinema backend is running...");
});

app.use("/api/movies", movieRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/CINEMA";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Ket noi CSDL thanh cong");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Ket noi CSDL that bai:", error.message);
  });
