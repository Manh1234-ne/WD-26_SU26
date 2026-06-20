import Movie from "../models/Movie.js";

class MovieController {
  // GET /movies - Lấy tất cả phim
  async getMovies(req, res) {
    try {
      const { status, search, isActive, page = 1, limit = 10 } = req.query;
      const query = {};

      // Filter theo status
      if (status) {
        const validStatus = ["coming_soon", "now_showing", "ended"];
        if (!validStatus.includes(status)) {
          return res.status(400).json({
            success: false,
            message: "Trạng thái phim không hợp lệ",
          });
        }
        query.status = status;
      }

      // Filter theo isActive
      if (isActive === undefined) {
        query.isActive = true; // Mặc định chỉ lấy phim active
      } else if (isActive !== "all") {
        query.isActive = isActive === "true";
      }

      // Tìm kiếm
      if (search && search.trim() !== "") {
        query.$text = { $search: search.trim() };
      }

      // Pagination
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
      const skip = (pageNum - 1) * limitNum;

      const movies = await Movie.find(query)
        .populate("categoryId", "name")
        .sort({ releaseDate: -1 })
        .skip(skip)
        .limit(limitNum);

      const total = await Movie.countDocuments(query);

      res.status(200).json({
        success: true,
        data: movies,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
        message: "Lấy danh sách phim thành công",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi khi lấy danh sách phim",
      });
    }
  }

  // GET /movies/:id - Lấy phim theo ID
  async getMovieById(req, res) {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "ID phim không hợp lệ",
        });
      }

      const movie = await Movie.findById(id).populate("categoryId", "name");

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: "Phim không tồn tại",
        });
      }

      res.status(200).json({
        success: true,
        data: movie,
        message: "Lấy thông tin phim thành công",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // POST /movies - Tạo phim mới

  async createMovie(req, res) {
    try {
      console.log("=== CREATE MOVIE REQUEST BODY ===", JSON.stringify(req.body, null, 2));
      const {
        title,
        originalTitle,
        description,
        genres,
        duration,
        releaseDate,
        ageRating,
        language,
        director,
        cast,
        posterUrl,
        backdropUrl,
        trailerUrl,
        status,
        categoryId,
        averageRating,
        isActive,
        endDate,
        country,
      } = req.body;

      // Validate bắt buộc
      if (!title || title.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Tiêu đề phim không được để trống",
        });
      }

      if (title.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Tiêu đề phim phải ít nhất 2 ký tự",
        });
      }

      if (!description || description.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Mô tả phim không được để trống",
        });
      }

      if (description.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: "Mô tả phim phải ít nhất 10 ký tự",
        });
      }

      if (!duration || duration < 1) {
        return res.status(400).json({
          success: false,
          message: "Thời lượng phim phải lớn hơn 0",
        });
      }

      if (!releaseDate) {
        return res.status(400).json({
          success: false,
          message: "Ngày phát hành không được để trống",
        });
      }

      if (!endDate) {
        return res.status(400).json({
          success: false,
          message: "Ngày kết thúc không được để trống",
        });
      }

      // Validate enum fields
      if (status && !["coming_soon", "now_showing", "ended"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái phim không hợp lệ (coming_soon, now_showing, ended)",
        });
      }

      if (
        ageRating &&
        !["P", "K", "T13", "T16", "T18", "C"].includes(ageRating)
      ) {
        return res.status(400).json({
          success: false,
          message: "Xếp hạng tuổi không hợp lệ (P, K, T13, T16, T18, C)",
        });
      }

      // Tạo phim mới
      const movie = new Movie({
        title: title.trim(),
        originalTitle: originalTitle?.trim() || "",
        description: description.trim(),
        genres: genres || [],
        duration,
        releaseDate,
        ageRating: ageRating || "P",
        language: language?.trim() || "Tiếng Việt",
        director: director?.trim() || "",
        cast: cast || [],
        posterUrl: posterUrl || "",
        backdropUrl: backdropUrl || "",
        trailerUrl: trailerUrl || "",
        status: status || "coming_soon",
        categoryId: categoryId || null,
        averageRating: averageRating || 0,
        isActive: isActive !== undefined ? isActive : true,
        endDate,
        country: country?.trim() || "",
      });

      await movie.save();
      await movie.populate("categoryId", "name");

      res.status(201).json({
        success: true,
        data: movie,
        message: "Tạo phim thành công",
      });
    } catch (error) {
      console.error("=== CREATE MOVIE ERROR ===");
      console.error("Error message:", error.message);
      console.error("Error name:", error.name);
      if (error.errors) {
        console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
      }
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // PUT /movies/:id - Cập nhật phim
  async updateMovie(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        originalTitle,
        description,
        genres,
        duration,
        releaseDate,
        ageRating,
        language,
        director,
        cast,
        posterUrl,
        backdropUrl,
        trailerUrl,
        status,
        categoryId,
        endDate,
        country,
        isActive,
      } = req.body;

      // Validate ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "ID phim không hợp lệ",
        });
      }

      // Validate fields nếu có update
      if (title && title.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Tiêu đề phim phải ít nhất 2 ký tự",
        });
      }

      if (description && description.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: "Mô tả phim phải ít nhất 10 ký tự",
        });
      }

      if (duration && duration < 1) {
        return res.status(400).json({
          success: false,
          message: "Thời lượng phim phải lớn hơn 0",
        });
      }

      if (status && !["coming_soon", "now_showing", "ended"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái phim không hợp lệ",
        });
      }

      if (
        ageRating &&
        !["P", "K", "T13", "T16", "T18", "C"].includes(ageRating)
      ) {
        return res.status(400).json({
          success: false,
          message: "Xếp hạng tuổi không hợp lệ",
        });
      }

      // Tìm và cập nhật phim
      const movie = await Movie.findById(id);

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: "Phim không tồn tại",
        });
      }

      // Cập nhật các trường
      if (title) movie.title = title.trim();
      if (originalTitle !== undefined)
        movie.originalTitle = originalTitle?.trim() || "";
      if (description) movie.description = description.trim();
      if (genres !== undefined) movie.genres = genres || [];
      if (duration !== undefined) movie.duration = duration;
      if (releaseDate !== undefined) movie.releaseDate = releaseDate;
      if (ageRating !== undefined) movie.ageRating = ageRating;
      if (language !== undefined) movie.language = language?.trim() || "Tiếng Việt";
      if (director !== undefined) movie.director = director?.trim() || "";
      if (cast !== undefined) movie.cast = cast || [];
      if (posterUrl !== undefined) movie.posterUrl = posterUrl || "";
      if (backdropUrl !== undefined) movie.backdropUrl = backdropUrl || "";
      if (trailerUrl !== undefined) movie.trailerUrl = trailerUrl || "";
      if (status !== undefined) movie.status = status;
      if (categoryId !== undefined) movie.categoryId = categoryId || null;
      if (endDate !== undefined) movie.endDate = endDate;
      if (country !== undefined) movie.country = country?.trim() || "";
      if (isActive !== undefined) movie.isActive = isActive;

      await movie.save();
      await movie.populate("categoryId", "name");

      res.status(200).json({
        success: true,
        data: movie,
        message: "Cập nhật phim thành công",
      });
    } catch (error) {
      console.error("=== UPDATE MOVIE ERROR ===");
      console.error("Error message:", error.message);
      console.error("Error name:", error.name);
      if (error.errors) {
        console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
      }
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // DELETE /movies/:id - Xóa phim
  async deleteMovie(req, res) {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "ID phim không hợp lệ",
        });
      }

      const movie = await Movie.findByIdAndDelete(id);

      if (!movie) {
        return res.status(404).json({
          success: false,
          message: "Phim không tồn tại",
        });
      }

      res.status(200).json({
        success: true,
        message: "Xóa phim thành công",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET /movies/search?keyword=... - Tìm kiếm phim
  async searchMovies(req, res) {
    try {
      const { keyword, status, page = 1, limit = 10 } = req.query;

      if (!keyword || keyword.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Từ khóa tìm kiếm không được để trống",
        });
      }

      const query = {
        $or: [
          { title: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
          { director: { $regex: keyword, $options: "i" } },
        ],
        isActive: true,
      };

      if (status && ["coming_soon", "now_showing", "ended"].includes(status)) {
        query.status = status;
      }

      // Pagination
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
      const skip = (pageNum - 1) * limitNum;

      const movies = await Movie.find(query)
        .populate("categoryId", "name")
        .sort({ releaseDate: -1 })
        .skip(skip)
        .limit(limitNum);

      const total = await Movie.countDocuments(query);

      res.status(200).json({
        success: true,
        data: movies,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
        message: "Tìm kiếm phim thành công",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new MovieController();
