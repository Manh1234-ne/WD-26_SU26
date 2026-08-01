import multer from "multer";
import path from "path";
import fs from "fs";

// Tạo thư mục uploads nếu chưa có
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Storage cho ảnh combo
const comboStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/combos";
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `combo_${Date.now()}${ext}`;
    cb(null, unique);
  },
});

// Storage cho ảnh phim (movie)
const movieStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/movies";
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `movie_${Date.now()}${ext}`;
    cb(null, unique);
  },
});

const imageFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh JPG, PNG, WEBP, GIF!"), false);
  }
};

export const uploadComboImage = multer({
  storage: comboStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
}).single("image");

export const uploadMovieImage = multer({
  storage: movieStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single("image");
