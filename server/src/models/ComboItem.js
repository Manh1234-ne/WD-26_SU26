import mongoose from "mongoose";

const comboItemSchema = new mongoose.Schema(
  {
    combo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Combo",
      required: true,
    },

    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "ComboItem",
  comboItemSchema
);