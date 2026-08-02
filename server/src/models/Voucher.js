import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percent", "fixed"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: [0, "Giá trị giảm không được nhỏ hơn 0"],
      validate: {
        validator: function(value) {
          if (this.discountType === "percent" && value > 100) {
            return false;
          }
          return true;
        },
        message: "Giá trị giảm theo phần trăm không được vượt quá 100%"
      }
    },
    maxDiscountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    usageLimit: {
      type: Number,
      required: true,
      min: 0,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(value) {
          if (!this.startDate) return true;
          return value >= this.startDate;
        },
        message: "Ngày kết thúc không được trước ngày bắt đầu"
      }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Voucher", voucherSchema);
