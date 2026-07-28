import mongoose from "mongoose";

const bookingComboSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    combo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Combo",
      required: true,
    },

    quantity: {
      type: Number,
      default: 1,
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
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "BookingCombo",
  bookingComboSchema
);