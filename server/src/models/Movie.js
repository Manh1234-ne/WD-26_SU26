import mongoose from "mongoose";

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    originalTitle: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    genres: [
      {
        type: String,
        trim: true,
      },
    ],
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    releaseDate: {
      type: Date,
      required: true,
    },
    ageRating: {
      type: String,
      enum: ["P", "K", "T13", "T16", "T18", "C"],
      default: "P",
    },
    language: {
      type: String,
      trim: true,
      default: "Vietnamese",
    },
    director: {
      type: String,
      trim: true,
    },
    cast: [
      {
        type: String,
        trim: true,
      },
    ],
    posterUrl: {
      type: String,
      default: "",
    },
    backdropUrl: {
      type: String,
      default: "",
    },
    trailerUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["coming_soon", "now_showing", "ended"],
      default: "coming_soon",
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
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

movieSchema.index({ title: "text", description: "text" });

export default mongoose.model("Movie", movieSchema);
