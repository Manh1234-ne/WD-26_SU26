import mongoose from "mongoose";

const pricingRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ruleType: {
      type: String,
      enum: ["peak_hour", "weekend", "holiday"],
      required: true,
    },
    surchargePercentage: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    // Dành riêng cho Giờ cao điểm
    startTime: {
      type: String, // Định dạng "HH:mm" ví dụ "19:00"
    },
    endTime: {
      type: String, // Định dạng "HH:mm" ví dụ "23:00"
    },
    // Dành riêng cho Ngày Lễ
    date: {
      type: Date,
    },
    endDate: {
      type: Date,
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

export default mongoose.model("PricingRule", pricingRuleSchema);
