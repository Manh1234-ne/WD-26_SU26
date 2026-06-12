import mongoose from "mongoose";

const cinemaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    openingTime: {
      type: String,
      default: "08:00",
    },
    closingTime: {
      type: String,
      default: "23:00",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }

);

cinemaSchema.index({ city: 1, district: 1 });
cinemaSchema.virtual('rooms', {
  ref: 'Room',
  localField: '_id',
  foreignField: 'cinema',
  match: { isActive: true }
});

export default mongoose.model("Cinema", cinemaSchema);
