import mongoose from "mongoose";

const bookingSeatSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    showtime: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showtime",
      required: true,
    },
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      required: true,
    },
    seatCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    seatType: {
      type: String,
      enum: ["standard", "vip", "couple", "disabled"],
      default: "standard",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["held", "booked", "cancelled"],
      default: "held",
    },
  },
  {
    timestamps: true,
  }
);

bookingSeatSchema.index({ showtime: 1, seat: 1 }, { unique: true, partialFilterExpression: { status: "booked" } });
bookingSeatSchema.index({ booking: 1 });

export default mongoose.model("BookingSeat", bookingSeatSchema);

