import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    roomType: {
      type: String,
      enum: ["2D", "3D", "IMAX", "VIP"],
      default: "2D",
    },
    totalRows: {
      type: Number,
      required: true,
      min: 1,
    },
    seatsPerRow: {
      type: Number,
      required: true,
      min: 1,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    aisleColumns: {
      type: [Number],
      default: [],
    },
    aisleRows: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

roomSchema.index({ name: 1 }, { unique: true });

export default mongoose.model("Room", roomSchema);
