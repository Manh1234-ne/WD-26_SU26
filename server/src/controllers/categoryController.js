import Category from "../models/Category.js";

class CategoryController {
  // GET /categories - Lấy tất cả danh mục
  async getAllCategories(req, res) {
    try {
      const { status } = req.query;
      const query = {};

      if (status) {
        query.status = status;
      }

      const categories = await Category.find(query).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: categories,
        total: categories.length,
        message: "Lấy danh mục thành công"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Lỗi server"
      });
    }
  }

  // GET /categories/:id - Lấy danh mục theo ID
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "ID danh mục không hợp lệ"
        });
      }

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Danh mục không tồn tại"
        });
      }

      res.status(200).json({
        success: true,
        data: category,
        message: "Lấy danh mục thành công"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /categories/slug/:slug - Lấy danh mục theo slug
  async getCategoryBySlug(req, res) {
    try {
      const { slug } = req.params;

      if (!slug || slug.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Slug không được để trống"
        });
      }

      const category = await Category.findOne({ slug });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Danh mục không tồn tại"
        });
      }

      res.status(200).json({
        success: true,
        data: category,
        message: "Lấy danh mục thành công"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /categories - Tạo danh mục mới
  async createCategory(req, res) {
    try {
      const { name, description, image, status } = req.body;

      // Validate required fields
      if (!name || name.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Tên danh mục không được để trống"
        });
      }

      if (name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Tên danh mục phải ít nhất 2 ký tự"
        });
      }

      if (name.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: "Tên danh mục không vượt quá 50 ký tự"
        });
      }

      // Validate status
      if (status && !["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái phải là 'active' hoặc 'inactive'"
        });
      }

      // Kiểm tra tên đã tồn tại
      const existingCategory = await Category.findOne({
        name: name.trim()
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Tên danh mục đã tồn tại"
        });
      }

      // Tạo danh mục mới
      const category = new Category({
        name: name.trim(),
        description: description?.trim() || "",
        image: image || null,
        status: status || "active"
      });

      await category.save();

      res.status(201).json({
        success: true,
        data: category,
        message: "Tạo danh mục thành công"
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // PUT /categories/:id - Cập nhật danh mục
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description, image, status } = req.body;

      // Validate ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "ID danh mục không hợp lệ"
        });
      }

      // Validate name if provided
      if (name) {
        if (name.trim() === "") {
          return res.status(400).json({
            success: false,
            message: "Tên danh mục không được để trống"
          });
        }

        if (name.trim().length < 2) {
          return res.status(400).json({
            success: false,
            message: "Tên danh mục phải ít nhất 2 ký tự"
          });
        }

        if (name.trim().length > 50) {
          return res.status(400).json({
            success: false,
            message: "Tên danh mục không vượt quá 50 ký tự"
          });
        }
      }

      // Validate status if provided
      if (status && !["active", "inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái phải là 'active' hoặc 'inactive'"
        });
      }

      // Tìm danh mục
      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Danh mục không tồn tại"
        });
      }

      // Nếu thay đổi name, kiểm tra trùng
      if (name && name.trim() !== category.name) {
        const existingCategory = await Category.findOne({
          name: name.trim(),
          _id: { $ne: id }
        });

        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: "Tên danh mục đã tồn tại"
          });
        }

        category.name = name.trim();
      }

      // Cập nhật các trường khác
      if (description !== undefined) category.description = description.trim();
      if (image !== undefined) category.image = image;
      if (status) category.status = status;

      await category.save();

      res.status(200).json({
        success: true,
        data: category,
        message: "Cập nhật danh mục thành công"
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // DELETE /categories/:id - Xóa danh mục
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      // Validate ID format
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          success: false,
          message: "ID danh mục không hợp lệ"
        });
      }

      const category = await Category.findByIdAndDelete(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Danh mục không tồn tại"
        });
      }

      res.status(200).json({
        success: true,
        message: "Xóa danh mục thành công"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /categories/search?keyword=... - Tìm kiếm danh mục
  async searchCategories(req, res) {
    try {
      const { keyword, status } = req.query;

      if (!keyword || keyword.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Từ khóa tìm kiếm không được để trống"
        });
      }

      const query = {
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } }
        ]
      };

      if (status) {
        query.status = status;
      }

      const categories = await Category.find(query).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: categories,
        total: categories.length,
        message: "Tìm kiếm danh mục thành công"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new CategoryController();
