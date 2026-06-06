import mongoose from "mongoose";

// Schema định nghĩa cấu trúc của danh mục phim
const categorySchema = new mongoose.Schema(
  {
    // Tên danh mục (VD: Hành động, Tình cảm, Kinh dị...)
    name: {
      type: String,
      required: [true, "Tên danh mục là bắt buộc"],
      trim: true,
      minlength: [2, "Tên danh mục phải ít nhất 2 ký tự"],
      maxlength: [50, "Tên danh mục không vượt quá 50 ký tự"],
      unique: [true, "Tên danh mục này đã tồn tại"]
    },

    // Mô tả danh mục
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Mô tả không vượt quá 500 ký tự"],
      default: ""
    },

    // Slug để sử dụng trong URL (VD: hanh-dong, tinh-cam...)
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true
    },

    // Trạng thái danh mục (active/inactive)
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active"
    },

    // Số lượng phim trong danh mục (tính toán tự động)
    movieCount: {
      type: Number,
      default: 0
    },

    // Ảnh đại diện danh mục (URL)
    image: {
      type: String,
      default: null
    }
  },
  {
    // Tự động thêm createdAt và updatedAt
    timestamps: true,
    // Cho phép chuyển document thành plain object
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Pre-save hook: Tự động tạo slug từ name
categorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    // Chuyển tên thành slug (xóa dấu, chuyển thành lowercase, thay khoảng trắng bằng dấu gạch)
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");
  }
  next();
});

// Index để tối ưu tìm kiếm
categorySchema.index({ name: "text", description: "text" });
categorySchema.index({ slug: 1 });
categorySchema.index({ status: 1 });

// Tạo model Category từ schema
const Category = mongoose.model("Category", categorySchema);

export default Category;
