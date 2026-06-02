import Movie from "../models/Movie.js";

export const getMovies = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const movies = await Movie.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: movies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Khong the lay danh sach phim",
      error: error.message,
    });
  }
};

export const getMovieById = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay phim",
      });
    }

    res.status(200).json({
      success: true,
      data: movie,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Khong the lay thong tin phim",
      error: error.message,
    });
  }
};

export const createMovie = async (req, res) => {
  try {
    const movie = await Movie.create(req.body);

    res.status(201).json({
      success: true,
      data: movie,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Khong the tao phim",
      error: error.message,
    });
  }
};

export const updateMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay phim",
      });
    }

    res.status(200).json({
      success: true,
      data: movie,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Khong the cap nhat phim",
      error: error.message,
    });
  }
};

export const deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: "Khong tim thay phim",
      });
    }

    res.status(200).json({
      success: true,
      message: "Da xoa phim",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Khong the xoa phim",
      error: error.message,
    });
  }
};
