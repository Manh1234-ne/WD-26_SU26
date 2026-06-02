import mongoose from "mongoose";

const seatSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    row: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    number: {
      type: Number,
      required: true,
      min: 1,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ["standard", "vip", "couple", "disabled"],
      default: "standard",
    },
    priceMultiplier: {
      type: Number,
      default: 1,
      min: 0,
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

seatSchema.index({ room: 1, code: 1 }, { unique: true });

export default mongoose.model("Seat", seatSchema);
