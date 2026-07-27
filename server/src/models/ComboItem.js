import mongoose from "mongoose";

const comboItemSchema = new mongoose.Schema(
  {
    combo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Combo",
      required: true,
    },

    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
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