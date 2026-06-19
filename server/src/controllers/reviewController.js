import Review from "../models/Review.js";
import Movie from "../models/Movie.js";
import Booking from "../models/Booking.js";
import { asyncHandler } from "../utils/asynHandler.js";

const ok = (res, data) =>
  res.status(200).json({
    success: true,
    data,
  });

const created = (
  res,
  data,
  message = "Tạo thành công"
) =>
  res.status(201).json({
    success: true,
    message,
    data,
  });

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

/**
 * Cập nhật averageRating + reviewCount
 */
const updateMovieRating = async (movieId) => {
  const reviews = await Review.find({
    movie: movieId,
    isVisible: true,
  });

  const reviewCount = reviews.length;

  const averageRating =
    reviewCount === 0
      ? 0
      : reviews.reduce(
          (sum, review) =>
            sum + review.rating,
          0
        ) / reviewCount;

  await Movie.findByIdAndUpdate(movieId, {
    averageRating: Number(
      averageRating.toFixed(1)
    ),
    reviewCount,
  });
};

/**
 * CREATE REVIEW
 */
export const createReview = asyncHandler(
  async (req, res) => {
    const { movie, rating, comment } =
      req.body;

    if (!movie || !rating) {
      return fail(
        res,
        400,
        "Thiếu movie hoặc rating"
      );
    }

    const movieExists =
      await Movie.findById(movie);

    if (!movieExists) {
      return fail(
        res,
        404,
        "Không tìm thấy phim"
      );
    }

    /**
     * Chỉ user đã xem phim mới được review
     */
    const booking =
      await Booking.findOne({
        user: req.user._id,
        status: "completed",
      }).populate({
        path: "showtime",
        match: {
          movie,
        },
      });

    if (!booking || !booking.showtime) {
      return fail(
        res,
        400,
        "Bạn phải xem phim trước khi đánh giá"
      );
    }

    /**
     * Mỗi user chỉ review 1 lần
     */
    const existingReview =
      await Review.findOne({
        user: req.user._id,
        movie,
      });

    if (existingReview) {
      return fail(
        res,
        400,
        "Bạn đã đánh giá phim này rồi"
      );
    }

    const review =
      await Review.create({
        user: req.user._id,
        movie,
        rating,
        comment,
      });

    await updateMovieRating(movie);

    return created(
      res,
      review,
      "Đánh giá thành công"
    );
  }
);

/**
 * GET REVIEWS BY MOVIE
 */
export const getReviewsByMovie =
  asyncHandler(async (req, res) => {
    const reviews = await Review.find({
      movie: req.params.movieId,
      isVisible: true,
    })
      .populate(
        "user",
        "fullName avatar"
      )
      .sort({
        createdAt: -1,
      });

    return ok(res, reviews);
  });

/**
 * UPDATE REVIEW
 */
export const updateReview =
  asyncHandler(async (req, res) => {
    const review =
      await Review.findById(
        req.params.id
      );

    if (!review) {
      return fail(
        res,
        404,
        "Không tìm thấy review"
      );
    }

    if (
      review.user.toString() !==
      req.user._id.toString()
    ) {
      return fail(
        res,
        403,
        "Không có quyền chỉnh sửa"
      );
    }

    if (req.body.rating) {
      review.rating = req.body.rating;
    }

    if (
      req.body.comment !== undefined
    ) {
      review.comment =
        req.body.comment;
    }

    await review.save();

    await updateMovieRating(
      review.movie
    );

    return ok(res, review);
  });

/**
 * DELETE REVIEW
 */
export const deleteReview =
  asyncHandler(async (req, res) => {
    const review =
      await Review.findById(
        req.params.id
      );

    if (!review) {
      return fail(
        res,
        404,
        "Không tìm thấy review"
      );
    }

    if (
      review.user.toString() !==
      req.user._id.toString()
    ) {
      return fail(
        res,
        403,
        "Không có quyền xóa"
      );
    }

    const movieId = review.movie;

    await Review.findByIdAndDelete(
      req.params.id
    );

    await updateMovieRating(movieId);

    return ok(res, {
      message:
        "Xóa review thành công",
    });
  });

/**
 * ADMIN HIDE REVIEW
 */
export const hideReview =
  asyncHandler(async (req, res) => {
    const review =
      await Review.findById(
        req.params.id
      );

    if (!review) {
      return fail(
        res,
        404,
        "Không tìm thấy review"
      );
    }

    review.isVisible = false;

    await review.save();

    await updateMovieRating(
      review.movie
    );

    return ok(res, review);
  });

/**
 * ADMIN SHOW REVIEW
 */
export const showReview =
  asyncHandler(async (req, res) => {
    const review =
      await Review.findById(
        req.params.id
      );

    if (!review) {
      return fail(
        res,
        404,
        "Không tìm thấy review"
      );
    }

    review.isVisible = true;

    await review.save();

    await updateMovieRating(
      review.movie
    );

    return ok(res, review);
  });