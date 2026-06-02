import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    cinema: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cinema",
      required: true,
    },
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
  },
  {
    timestamps: true,
  }
);

roomSchema.index({ cinema: 1, name: 1 }, { unique: true });

export default mongoose.model("Room", roomSchema);
