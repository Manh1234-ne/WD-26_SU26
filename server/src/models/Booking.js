import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    isCounterSale: {
      type: Boolean,
      default: false,
    },
    customerName: {
      type: String,
      default: "Khách vãng lai",
    },
    customerPhone: {
      type: String,
      default: "",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "vnpay", "momo", "card"],
      default: "cash",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "paid",
    },
    createdByStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    showtime: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showtime",
      required: true,
    },
    voucher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
    },
    totalSeatPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalComboPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "expired", "completed"],
      default: "pending",
    },
    printStatus: {
      type: String,
      enum: ["not_printed", "printed"],
      default: "not_printed",
    },
    printedAt: {
      type: Date,
    },
    printedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    comboStatus: {
      type: String,
      enum: ["pending", "claimed"],
      default: "pending",
    },
    comboClaimedAt: {
      type: Date,
    },
    comboClaimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    comboPrintStatus: {
      type: String,
      enum: ["not_printed", "printed"],
      default: "not_printed",
    },
    comboPrintedAt: {
      type: Date,
    },
    comboPrintedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    comboPrintCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    checkedInAt: {
      type: Date,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    printCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ showtime: 1 });
bookingSchema.index(
  { status: 1, expiresAt: 1 },
  { name: "booking_pending_expires_idx" }
);

export default mongoose.model("Booking", bookingSchema);
