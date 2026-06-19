import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề phim là bắt buộc"],
      trim: true,
      minlength: [2, "Tiêu đề phim phải ít nhất 2 ký tự"],
      maxlength: [200, "Tiêu đề phim không vượt quá 200 ký tự"],
    },
    originalTitle: {
      type: String,
      trim: true,
      maxlength: [200, "Tiêu đề gốc không vượt quá 200 ký tự"],
    },
    description: {
      type: String,
      required: [true, "Mô tả phim là bắt buộc"],
      trim: true,
      minlength: [10, "Mô tả phim phải ít nhất 10 ký tự"],
      maxlength: [2000, "Mô tả phim không vượt quá 2000 ký tự"],
    },
    genres: [
      {
        type: String,
        trim: true,
      },
    ],
    duration: {
      type: Number,
      required: [true, "Thời lượng phim là bắt buộc"],
      min: [1, "Thời lượng phải lớn hơn 0"],
      max: [500, "Thời lượng không vượt quá 500 phút"],
    },
    releaseDate: {
      type: Date,
      required: [true, "Ngày phát hành là bắt buộc"],
    },
    ageRating: {
      type: String,
      enum: {
        values: ["P", "K", "T13", "T16", "T18", "C"],
        message: "Xếp hạng tuổi không hợp lệ",
      },
      default: "P",
    },
    language: {
      type: String,
      trim: true,
      default: "Tiếng Việt",
      maxlength: [50, "Ngôn ngữ không vượt quá 50 ký tự"],
    },
    director: {
      type: String,
      trim: true,
      maxlength: [100, "Tên đạo diễn không vượt quá 100 ký tự"],
    },
    cast: [
      {
        type: String,
        trim: true,
        maxlength: [100, "Tên diễn viên không vượt quá 100 ký tự"],
      },
    ],
    posterUrl: {
      type: String,
      default: "",
      maxlength: [500, "URL poster không vượt quá 500 ký tự"],
    },
    backdropUrl: {
      type: String,
      default: "",
      maxlength: [500, "URL backdrop không vượt quá 500 ký tự"],
    },
    trailerUrl: {
      type: String,
      default: "",
      maxlength: [500, "URL trailer không vượt quá 500 ký tự"],
    },
    status: {
      type: String,
      enum: {
        values: ["coming_soon", "now_showing", "ended"],
        message: "Trạng thái phim không hợp lệ",
      },
      default: "coming_soon",
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    averageRating: {
      type: Number,
      min: [0, "Đánh giá không thể nhỏ hơn 0"],
      max: [5, "Đánh giá không thể lớn hơn 5"],
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    reviewCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
  }
);

// Index để tối ưu tìm kiếm
movieSchema.index({ title: "text", description: "text" }, { language_override: "dummy" });
movieSchema.index({ status: 1 });
movieSchema.index({ isActive: 1 });
movieSchema.index({ categoryId: 1 });
movieSchema.index({ releaseDate: -1 });

export default mongoose.model("Movie", movieSchema);
