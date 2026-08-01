import { uploadComboImage, uploadMovieImage } from "../middlewares/uploadMiddleware.js";

export const uploadCombo = (req, res) => {
  uploadComboImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Không có file được upload!" });
    }

    const url = `${req.protocol}://${req.get("host")}/uploads/combos/${req.file.filename}`;
    return res.status(200).json({ success: true, url });
  });
};

export const uploadMovie = (req, res) => {
  uploadMovieImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Không có file được upload!" });
    }
    const url = `${req.protocol}://${req.get("host")}/uploads/movies/${req.file.filename}`;
    return res.status(200).json({ success: true, url });
  });
};
