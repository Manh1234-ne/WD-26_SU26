import mongoose from "mongoose";

const showtimeSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    cinema: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cinema",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    format: {
      type: String,
      enum: ["2D", "3D", "IMAX", "VIP"],
      default: "2D",
    },
    language: {
      type: String,
      trim: true,
      default: "Vietnamese",
    },
    subtitle: {
      type: String,
      trim: true,
      default: "",
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["scheduled", "open", "closed", "cancelled"],
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  }
);

showtimeSchema.index({ movie: 1, startTime: 1 });
showtimeSchema.index({ room: 1, startTime: 1 }, { unique: true });

export default mongoose.model("Showtime", showtimeSchema);

