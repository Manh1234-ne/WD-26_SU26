import mongoose from "mongoose";

const comboOrderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    customerName: {
      type: String,
      default: "Khách vãng lai",
    },
    customerPhone: {
      type: String,
      default: "",
    },

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    items: [
      {
        combo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Combo",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "vnpay", "momo", "transfer"],
      default: "cash",
    },
    status: {
      type: String,
      enum: ["completed", "cancelled"],
      default: "completed",
    },
    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

comboOrderSchema.index({ createdAt: -1 });
comboOrderSchema.index({ processedBy: 1 });

export default mongoose.model("ComboOrder", comboOrderSchema);
